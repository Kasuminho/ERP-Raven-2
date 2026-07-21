import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GuildCaseEntryKind, GuildCaseEntryVisibility, GuildCaseStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { AuditService } from '../audit/services/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AddGuildCaseMessageDto, CreateGuildCaseDto, RespondGuildCaseDto, TriageGuildCaseDto } from './dto';

const identitySelect = { id: true, discordUsername: true, discordNickname: true } as const;
const caseInclude = {
  player: { select: { id: true, nickname: true, userId: true } },
  assignedTo: { select: identitySelect },
  entries: { include: { actor: { select: identitySelect } }, orderBy: { createdAt: 'asc' as const } },
} as const;

@Injectable()
export class GuildCasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async listMine(userId: string) {
    const player = await this.getActivePlayer(userId);
    return this.prisma.guildCase.findMany({
      where: { playerId: player.id },
      include: {
        assignedTo: { select: identitySelect },
        entries: {
          where: { visibility: GuildCaseEntryVisibility.PLAYER },
          include: { actor: { select: identitySelect } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async create(userId: string, dto: CreateGuildCaseDto) {
    const player = await this.getActivePlayer(userId);
    const created = await this.prisma.guildCase.create({
      data: {
        playerId: player.id,
        category: dto.category,
        severity: dto.severity,
        subject: dto.subject.trim(),
        description: dto.description.trim(),
        entries: {
          create: {
            actorId: userId,
            kind: GuildCaseEntryKind.CREATED,
            visibility: GuildCaseEntryVisibility.PLAYER,
            bodyPt: dto.description.trim(),
          },
        },
      },
      include: caseInclude,
    });
    await this.audit.log({ actorId: userId, action: 'GUILD_CASE_CREATED', targetType: 'GuildCase', targetId: created.id, metadata: { playerId: player.id, category: created.category, severity: created.severity } });
    return created;
  }

  async addPlayerMessage(userId: string, caseId: string, dto: AddGuildCaseMessageDto) {
    const player = await this.getActivePlayer(userId);
    const existing = await this.prisma.guildCase.findFirst({ where: { id: caseId, playerId: player.id } });
    if (!existing) throw new NotFoundException('Private case not found.');
    const reopens = existing.status === GuildCaseStatus.RESOLVED || existing.status === GuildCaseStatus.CLOSED;
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.guildCaseEntry.create({
        data: { caseId, actorId: userId, kind: GuildCaseEntryKind.PLAYER_MESSAGE, visibility: GuildCaseEntryVisibility.PLAYER, bodyPt: dto.message.trim() },
      });
      if (reopens) {
        await tx.guildCaseEntry.create({
          data: { caseId, actorId: userId, kind: GuildCaseEntryKind.STATUS_CHANGED, visibility: GuildCaseEntryVisibility.PLAYER, bodyPt: 'Caso reaberto pelo player.', bodyEn: 'Case reopened by the player.', metadata: { from: existing.status, to: GuildCaseStatus.OPEN } },
        });
      }
      return tx.guildCase.update({ where: { id: caseId }, data: reopens ? { status: GuildCaseStatus.OPEN, resolvedAt: null } : {}, include: caseInclude });
    });
    await this.audit.log({ actorId: userId, action: reopens ? 'GUILD_CASE_REOPENED' : 'GUILD_CASE_PLAYER_MESSAGE_ADDED', targetType: 'GuildCase', targetId: caseId, metadata: { playerId: player.id } });
    return updated;
  }

  async getStaffWorkspace(status?: GuildCaseStatus) {
    const [cases, auctionDisputes, assignees] = await Promise.all([
      this.prisma.guildCase.findMany({ where: status ? { status } : undefined, include: caseInclude, orderBy: [{ severity: 'desc' }, { dueAt: 'asc' }, { updatedAt: 'desc' }] }),
      this.prisma.auctionDispute.findMany({
        include: {
          player: { select: { id: true, nickname: true, dimensionalLayer: true } },
          auction: { select: { id: true, itemName: true, status: true, auctionMode: true, endsAt: true } },
          reviewedBy: { select: identitySelect },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.user.findMany({
        where: { players: { some: { isActive: true, roles: { some: { role: { name: { in: ['STAFF', 'ADMIN'] } } } } } } },
        select: identitySelect,
        orderBy: { discordUsername: 'asc' },
      }),
    ]);
    return { cases, auctionDisputes, assignees, automaticDisciplinaryDecision: false };
  }

  async triage(caseId: string, actorId: string, dto: TriageGuildCaseDto) {
    const existing = await this.requireCase(caseId);
    if (dto.assignedToId) await this.requireStaffAssignee(dto.assignedToId);
    if (!dto.status && !dto.severity && !dto.assignedToId && !dto.dueAt && !dto.internalNote) throw new BadRequestException('At least one triage change is required.');
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.guildCase.update({
        where: { id: caseId },
        data: {
          status: dto.status,
          severity: dto.severity,
          assignedToId: dto.assignedToId,
          dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
          resolvedAt: dto.status === GuildCaseStatus.RESOLVED ? new Date() : dto.status && existing.status === GuildCaseStatus.RESOLVED ? null : undefined,
        },
        include: caseInclude,
      });
      if (dto.status && dto.status !== existing.status) await tx.guildCaseEntry.create({ data: { caseId, actorId, kind: GuildCaseEntryKind.STATUS_CHANGED, visibility: GuildCaseEntryVisibility.PLAYER, bodyPt: `Status alterado para ${dto.status}.`, bodyEn: `Status changed to ${dto.status}.`, metadata: { from: existing.status, to: dto.status } } });
      if (dto.assignedToId && dto.assignedToId !== existing.assignedToId) await tx.guildCaseEntry.create({ data: { caseId, actorId, kind: GuildCaseEntryKind.ASSIGNED, visibility: GuildCaseEntryVisibility.STAFF, bodyPt: 'Responsavel Staff atualizado.', metadata: { assignedToId: dto.assignedToId } } });
      if (dto.internalNote) await tx.guildCaseEntry.create({ data: { caseId, actorId, kind: GuildCaseEntryKind.INTERNAL_NOTE, visibility: GuildCaseEntryVisibility.STAFF, bodyPt: dto.internalNote.trim() } });
      return result;
    });
    await this.audit.log({ actorId, action: 'GUILD_CASE_TRIAGED', targetType: 'GuildCase', targetId: caseId, metadata: { status: dto.status, severity: dto.severity, assignedToId: dto.assignedToId, dueAt: dto.dueAt, internalNoteAdded: Boolean(dto.internalNote), automaticDecision: false } });
    return updated;
  }

  async respond(caseId: string, actorId: string, dto: RespondGuildCaseDto) {
    const existing = await this.requireCase(caseId);
    const nextStatus = dto.resolve ? GuildCaseStatus.RESOLVED : GuildCaseStatus.WAITING_PLAYER;
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.guildCaseEntry.create({ data: { caseId, actorId, kind: GuildCaseEntryKind.STAFF_RESPONSE, visibility: GuildCaseEntryVisibility.PLAYER, bodyPt: dto.bodyPt.trim(), bodyEn: dto.bodyEn.trim(), metadata: { status: nextStatus } } });
      return tx.guildCase.update({ where: { id: caseId }, data: { status: nextStatus, resolvedAt: dto.resolve ? new Date() : null }, include: caseInclude });
    });
    let notificationFailed = false;
    try {
      await this.notifications.createForPlayer({
        playerId: existing.playerId,
        type: 'GUILD_CASE_STAFF_RESPONSE',
        title: 'Resposta da Staff / Staff response',
        body: `PT-BR: ${dto.bodyPt.trim()} EN: ${dto.bodyEn.trim()}`,
        href: '/dashboard/cases',
        metadata: { caseId, status: nextStatus },
        deduplicationKey: `guild-case-response:${caseId}:${updated.updatedAt.toISOString()}`,
      });
    } catch {
      notificationFailed = true;
    }
    await this.audit.log({ actorId, action: 'GUILD_CASE_STAFF_RESPONSE_ADDED', targetType: 'GuildCase', targetId: caseId, metadata: { status: nextStatus, resolved: Boolean(dto.resolve), notificationFailed, automaticDecision: false } });
    return updated;
  }

  private async requireCase(caseId: string) {
    const guildCase = await this.prisma.guildCase.findUnique({ where: { id: caseId } });
    if (!guildCase) throw new NotFoundException('Private case not found.');
    return guildCase;
  }

  private async requireStaffAssignee(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        players: {
          some: {
            isActive: true,
            roles: { some: { role: { name: { in: ['STAFF', 'ADMIN'] } } } },
          },
        },
      },
      select: { id: true },
    });
    if (!user) throw new BadRequestException('Case owner must be an active Staff member.');
  }

  private async getActivePlayer(userId: string) {
    const player = await this.prisma.player.findFirst({ where: { userId, isActive: true }, select: { id: true }, orderBy: { joinedAt: 'asc' } });
    if (!player) throw new NotFoundException('Authenticated user does not have an active player profile.');
    return player;
  }
}
