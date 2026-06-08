import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, User } from '@prisma/client';
import { AuditService } from '../../audit/services/audit.service';
import { DiscordApiService, DiscordGuildMember, DiscordOAuthProfile } from '../bot/services/discord-api.service';
import { DiscordRepository } from '../repositories/discord.repository';

export type DiscordSyncedUser = User & {
  guildMember: boolean;
};

@Injectable()
export class DiscordSyncService {
  constructor(
    private readonly api: DiscordApiService,
    private readonly repository: DiscordRepository,
    private readonly auditService: AuditService,
    private readonly config: ConfigService,
  ) {}

  async syncOAuthUser(profile: DiscordOAuthProfile, accessToken: string): Promise<DiscordSyncedUser> {
    const member = await this.getOAuthGuildMember(profile.id, accessToken);
    const user = await this.repository.upsertUser({
      discordId: profile.id,
      discordUsername: profile.username,
      avatar: profile.avatar,
      discordGuildId: member ? this.getGuildId() : null,
      discordNickname: member?.nick,
      discordRoles: this.rolesToJson(member?.roles ?? []),
    });

    await this.syncRoleCatalog();
    const roleIds = member?.roles ?? [];
    const roleNames = await this.roleIdsToNames(roleIds);
    await this.repository.ensurePrimaryPlayer(user.id, member?.nick ?? profile.username);
    await this.repository.syncPrimaryPlayerRoles(user.id, roleNames);
    await this.audit('DISCORD_LOGIN', user.id, {
      discordId: profile.id,
      guildMember: Boolean(member),
      roleIds,
      roleNames,
    });

    return { ...user, guildMember: Boolean(member) };
  }

  async syncUser(params: { userId?: string; discordId?: string }): Promise<DiscordSyncedUser> {
    const user = await this.repository.findUserByIdOrDiscordId(params);

    if (!user) {
      await this.audit('DISCORD_SYNC_FAILED', params.userId ?? params.discordId ?? 'unknown', {
        reason: 'USER_NOT_FOUND',
      });
      throw new Error('User not found for Discord sync.');
    }

    const member = await this.api.getGuildMember(user.discordId);

    if (!member) {
      const synced = await this.repository.updateUserDiscordSync(user.id, {
        discordUsername: user.discordUsername,
        avatar: user.avatar,
        discordGuildId: null,
        discordNickname: null,
        discordRoles: [],
      });

      await this.audit('DISCORD_SYNC_FAILED', user.id, {
        discordId: user.discordId,
        reason: 'GUILD_MEMBER_NOT_FOUND',
      });

      return { ...synced, guildMember: false };
    }

    const profile = member.user;
    const roleIds = member.roles ?? [];
    await this.syncRoleCatalog();
    const roleNames = await this.roleIdsToNames(roleIds);

    const synced = await this.repository.updateUserDiscordSync(user.id, {
      discordUsername: profile?.username ?? user.discordUsername,
      avatar: profile?.avatar ?? user.avatar,
      discordGuildId: this.getGuildId(),
      discordNickname: member.nick,
      discordRoles: this.rolesToJson(roleIds),
    });

    if (member.nick) {
      await this.repository.updatePrimaryPlayerNickname(user.id, member.nick);
    }

    await this.repository.syncPrimaryPlayerRoles(user.id, roleNames);

    await this.audit('DISCORD_SYNC_COMPLETED', user.id, {
      discordId: user.discordId,
      roleIds,
      roleNames,
      nickname: member.nick,
    });

    return { ...synced, guildMember: true };
  }

  async validateGuildMembership(discordId: string): Promise<boolean> {
    return Boolean(await this.api.getGuildMember(discordId));
  }

  async getSessionProfile(userId: string): Promise<{ playerId?: string; roles: string[] }> {
    return this.repository.getPrimaryPlayerSession(userId);
  }

  private async syncRoleCatalog(): Promise<void> {
    const roles = await this.api.getGuildRoles();

    for (const role of roles) {
      await this.repository.syncGuildRole(role.name);
    }
  }

  private async roleIdsToNames(roleIds: string[]): Promise<string[]> {
    const roles = await this.api.getGuildRoles();
    const roleNameById = new Map(roles.map((role) => [role.id, role.name]));
    const staffRoleId = this.config.get<string>('discord.staffRoleId');
    const names = roleIds.map((roleId) => roleNameById.get(roleId) ?? roleId);

    if (staffRoleId && roleIds.includes(staffRoleId) && !names.includes('STAFF')) {
      names.push('STAFF');
    }

    return names;
  }

  private rolesToJson(roleIds: string[]): Prisma.InputJsonArray {
    return roleIds;
  }

  private getGuildId(): string {
    return process.env.DISCORD_GUILD_ID ?? '';
  }

  private async getOAuthGuildMember(discordId: string, accessToken: string): Promise<DiscordGuildMember | null> {
    try {
      return await this.api.getCurrentUserGuildMember(accessToken);
    } catch {
      return this.api.getGuildMember(discordId);
    }
  }

  private async audit(action: string, targetId: string, metadata: Prisma.InputJsonObject): Promise<void> {
    await this.auditService.log({
      action,
      targetType: 'DiscordIntegration',
      targetId,
      metadata,
    });
  }
}
