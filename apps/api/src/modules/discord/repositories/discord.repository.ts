import { Injectable } from '@nestjs/common';
import { PlayerClass, Prisma, User } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';

@Injectable()
export class DiscordRepository {
  constructor(private readonly prisma: PrismaService) {}

  get client(): PrismaService {
    return this.prisma;
  }

  async upsertUser(data: {
    discordId: string;
    discordUsername: string;
    avatar?: string | null;
    discordGuildId?: string | null;
    discordNickname?: string | null;
    discordRoles?: Prisma.InputJsonValue;
  }): Promise<User> {
    return this.prisma.user.upsert({
      where: { discordId: data.discordId },
      create: {
        discordId: data.discordId,
        discordUsername: data.discordUsername,
        avatar: data.avatar,
        discordGuildId: data.discordGuildId,
        discordNickname: data.discordNickname,
        discordRoles: data.discordRoles,
        lastDiscordSyncAt: new Date(),
      },
      update: {
        discordUsername: data.discordUsername,
        avatar: data.avatar,
        discordGuildId: data.discordGuildId,
        discordNickname: data.discordNickname,
        discordRoles: data.discordRoles,
        lastDiscordSyncAt: new Date(),
      },
    });
  }

  async findUserByIdOrDiscordId(params: { userId?: string; discordId?: string }): Promise<User | null> {
    if (!params.userId && !params.discordId) {
      return null;
    }

    return this.prisma.user.findFirst({
      where: {
        OR: [
          ...(params.userId ? [{ id: params.userId }] : []),
          ...(params.discordId ? [{ discordId: params.discordId }] : []),
        ],
      },
    });
  }

  async syncGuildRole(name: string) {
    return this.prisma.guildRole.upsert({
      where: { name },
      create: { name },
      update: { name },
    });
  }

  async updateUserDiscordSync(
    userId: string,
    data: {
      discordUsername: string;
      avatar?: string | null;
      discordGuildId?: string | null;
      discordNickname?: string | null;
      discordRoles?: Prisma.InputJsonValue;
    },
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        lastDiscordSyncAt: new Date(),
      },
    });
  }

  async updatePrimaryPlayerNickname(userId: string, nickname: string): Promise<void> {
    const player = await this.prisma.player.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    if (!player) {
      return;
    }

    await this.prisma.player.update({
      where: { id: player.id },
      data: { nickname },
    });
  }

  async syncPrimaryPlayerRoles(userId: string, roleNames: string[]): Promise<void> {
    const player = await this.prisma.player.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    if (!player) {
      return;
    }

    const roles = await Promise.all(roleNames.map((name) => this.syncGuildRole(name)));

    await this.prisma.$transaction(async (tx) => {
      await tx.playerRole.deleteMany({
        where: { playerId: player.id },
      });

      for (const role of roles) {
        await tx.playerRole.create({
          data: {
            playerId: player.id,
            roleId: role.id,
          },
        });
      }
    });
  }

  async ensurePrimaryPlayer(userId: string, nickname: string): Promise<{ id: string }> {
    const existing = await this.prisma.player.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.player.create({
      data: {
        user: { connect: { id: userId } },
        nickname: await this.getAvailableNickname(nickname),
        class: PlayerClass.VANGUARD,
        dimensionalLayer: 1,
      },
      select: { id: true },
    });
  }

  async getPrimaryPlayerSession(userId: string): Promise<{ playerId?: string; roles: string[]; membershipStatus: 'ACTIVE' | 'INACTIVE' | 'PENDING_REACTIVATION'; reactivationRequestedAt?: Date }> {
    const player = await this.prisma.player.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    return {
      playerId: player?.id,
      roles: player?.roles.map((row) => row.role.name) ?? [],
      membershipStatus: !player || player.isActive ? 'ACTIVE' : player.reactivationRequestedAt ? 'PENDING_REACTIVATION' : 'INACTIVE',
      reactivationRequestedAt: player?.reactivationRequestedAt ?? undefined,
    };
  }

  async requestPrimaryPlayerReactivation(userId: string): Promise<Date | undefined> {
    const player = await this.prisma.player.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } });
    if (!player || player.isActive) return undefined;
    if (player.reactivationRequestedAt) return player.reactivationRequestedAt;

    const requestedAt = new Date();
    await this.prisma.player.update({ where: { id: player.id }, data: { reactivationRequestedAt: requestedAt } });
    return requestedAt;
  }

  private async getAvailableNickname(base: string): Promise<string> {
    const normalized = base.trim() || 'Raven Member';
    let candidate = normalized;
    let suffix = 1;

    while (await this.prisma.player.findUnique({ where: { nickname: candidate }, select: { id: true } })) {
      suffix += 1;
      candidate = `${normalized}-${suffix}`;
    }

    return candidate;
  }
}
