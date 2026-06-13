import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CodexRequest, CodexRequestStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { AuditService } from '../../audit/services/audit.service';
import { ImageStorageService } from '../../uploads/image-storage.service';
import { CreateCodexRequestDto, SendCodexRequestDto } from '../dto';

export type CodexRequestDetails = CodexRequest & {
  player: {
    id: string;
    nickname: string;
    user: {
      discordId: string;
      discordUsername: string;
    };
  };
};

@Injectable()
export class CodexService {
  private readonly playerVisibleStatuses = [CodexRequestStatus.PENDING, CodexRequestStatus.NEEDS_RETRY, CodexRequestStatus.SENT];
  private readonly staffQueueStatuses = [CodexRequestStatus.PENDING, CodexRequestStatus.NEEDS_RETRY];

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly imageStorage: ImageStorageService,
  ) {}

  async listForCurrentUser(userId: string): Promise<CodexRequestDetails[]> {
    const player = await this.getPrimaryPlayer(userId);
    const requests = await this.list({
      playerId: player.id,
      status: { in: this.playerVisibleStatuses },
    });

    return this.sortPlayerVisibleRequests(requests);
  }

  async listForStaff(status?: CodexRequestStatus): Promise<CodexRequestDetails[]> {
    return this.list(status ? { status } : {
      status: { in: this.staffQueueStatuses },
    });
  }

  async createForCurrentUser(userId: string, data: CreateCodexRequestDto): Promise<CodexRequest> {
    if (!data.imageUrl?.trim()) {
      throw new BadRequestException('imageUrl is required.');
    }

    const player = await this.getPrimaryPlayer(userId);
    const created = await this.prisma.codexRequest.create({
      data: {
        playerId: player.id,
        imageUrl: data.imageUrl.trim(),
        note: data.note?.trim() || undefined,
        queuedAt: new Date(),
      },
    });

    await this.audit('CODEX_REQUEST_CREATED', created.id, userId, { playerId: player.id });
    return created;
  }

  async markSent(id: string, actorId: string, data: SendCodexRequestDto): Promise<CodexRequest> {
    const request = await this.getExisting(id);

    if (request.status === 'CONFIRMED' || request.status === 'CANCELLED') {
      throw new BadRequestException('Confirmed or cancelled codex requests cannot be sent.');
    }

    const updated = await this.prisma.codexRequest.update({
      where: { id },
      data: {
        status: 'SENT',
        proofImageUrl: data.proofImageUrl?.trim() || undefined,
        sentById: actorId,
        sentAt: new Date(),
      },
    });

    await this.audit('CODEX_REQUEST_SENT', id, actorId, {
      playerId: request.playerId,
      proofImageUrl: updated.proofImageUrl,
    });

    return updated;
  }

  async confirm(id: string, userId: string): Promise<CodexRequest> {
    const request = await this.getOwnedRequest(id, userId);

    if (request.status !== 'SENT') {
      throw new BadRequestException('Only sent codex requests can be confirmed.');
    }

    const updated = await this.prisma.codexRequest.update({
      where: { id },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    });

    await this.audit('CODEX_REQUEST_CONFIRMED', id, userId, { playerId: request.playerId });
    await this.cleanupConfirmedCodexImages(updated, userId);
    return updated;
  }

  async requestRetry(id: string, userId: string): Promise<CodexRequest> {
    const request = await this.getOwnedRequest(id, userId);

    if (request.status !== 'SENT') {
      throw new BadRequestException('Only sent codex requests can be requested again.');
    }

    const updated = await this.prisma.codexRequest.update({
      where: { id },
      data: {
        status: 'NEEDS_RETRY',
        retryRequestedAt: new Date(),
        confirmedAt: null,
        sentAt: null,
        sentById: null,
        proofImageUrl: null,
        queuedAt: new Date(),
      },
    });

    await this.audit('CODEX_REQUEST_RETRY_REQUESTED', id, userId, { playerId: request.playerId });
    return updated;
  }

  async cancel(id: string, actorId: string): Promise<CodexRequest> {
    const request = await this.getExisting(id);
    const updated = await this.prisma.codexRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
    await this.audit('CODEX_REQUEST_CANCELLED', id, actorId, { playerId: request.playerId });
    return updated;
  }

  private async list(where?: Prisma.CodexRequestWhereInput): Promise<CodexRequestDetails[]> {
    return this.prisma.codexRequest.findMany({
      where,
      include: {
        player: {
          select: {
            id: true,
            nickname: true,
            user: {
              select: {
                discordId: true,
                discordUsername: true,
              },
            },
          },
        },
      },
      orderBy: [{ queuedAt: 'asc' }, { createdAt: 'asc' }],
    });
  }

  private sortPlayerVisibleRequests(requests: CodexRequestDetails[]): CodexRequestDetails[] {
    return [...requests].sort((left, right) => {
      const leftIsSent = left.status === CodexRequestStatus.SENT;
      const rightIsSent = right.status === CodexRequestStatus.SENT;

      if (leftIsSent !== rightIsSent) {
        return leftIsSent ? -1 : 1;
      }

      if (leftIsSent && rightIsSent) {
        return this.dateTime(right.sentAt ?? right.updatedAt) - this.dateTime(left.sentAt ?? left.updatedAt);
      }

      return this.dateTime(left.queuedAt) - this.dateTime(right.queuedAt)
        || this.dateTime(left.createdAt) - this.dateTime(right.createdAt);
    });
  }

  private dateTime(value: Date | string): number {
    return new Date(value).getTime();
  }

  private async getOwnedRequest(id: string, userId: string): Promise<CodexRequest> {
    const player = await this.getPrimaryPlayer(userId);
    const request = await this.prisma.codexRequest.findFirst({ where: { id, playerId: player.id } });

    if (!request) {
      throw new NotFoundException(`Codex request ${id} was not found.`);
    }

    return request;
  }

  private async getExisting(id: string): Promise<CodexRequest> {
    const request = await this.prisma.codexRequest.findUnique({ where: { id } });

    if (!request) {
      throw new NotFoundException(`Codex request ${id} was not found.`);
    }

    return request;
  }

  private async getPrimaryPlayer(userId: string): Promise<{ id: string }> {
    const player = await this.prisma.player.findFirst({
      where: { userId, isActive: true },
      select: { id: true },
      orderBy: { joinedAt: 'asc' },
    });

    if (!player) {
      throw new NotFoundException('Authenticated user does not have an active player profile.');
    }

    return player;
  }

  private async audit(action: string, targetId: string, actorId: string, metadata: Prisma.InputJsonObject): Promise<void> {
    await this.auditService.log({ actorId, action, targetType: 'CodexRequest', targetId, metadata });
  }

  private async cleanupConfirmedCodexImages(request: CodexRequest, actorId: string): Promise<void> {
    const urls = [request.imageUrl, request.proofImageUrl].filter((url): url is string => Boolean(url));

    if (urls.length === 0) {
      return;
    }

    const deleted: string[] = [];
    const failed: Array<{ url: string; message: string }> = [];

    for (const url of urls) {
      try {
        const wasDeleted = await this.imageStorage.deleteByUrl(url);

        if (wasDeleted) {
          deleted.push(url);
        }
      } catch (error) {
        failed.push({
          url,
          message: error instanceof Error ? error.message : 'Unknown storage deletion error',
        });
      }
    }

    if (deleted.length > 0) {
      await this.audit('CODEX_REQUEST_IMAGES_DELETED', request.id, actorId, {
        playerId: request.playerId,
        deletedCount: deleted.length,
      });
    }

    if (failed.length > 0) {
      await this.audit('CODEX_REQUEST_IMAGE_DELETE_FAILED', request.id, actorId, {
        playerId: request.playerId,
        failed,
      });
    }
  }
}
