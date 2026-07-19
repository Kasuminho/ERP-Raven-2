import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DiscordSyncService } from '../../discord/services/discord-sync.service';
import { AuthRepository } from '../repositories/auth.repository';

export type DiscordOAuthUser = {
  discordId: string;
  username: string;
  avatar?: string | null;
  accessToken: string;
};

export type AuthSession = {
  accessToken: string;
  userId: string;
  playerId?: string;
  roles: string[];
};

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly repository: AuthRepository,
    private readonly discordSyncService: DiscordSyncService,
  ) {}

  async createDiscordSession(user: DiscordOAuthUser): Promise<AuthSession> {
    const syncedUser = await this.discordSyncService.syncOAuthUser(
      {
        id: user.discordId,
        username: user.username,
        avatar: user.avatar,
      },
      user.accessToken,
    );

    if (!syncedUser.guildMember) {
      throw new UnauthorizedException('Discord guild membership is required.');
    }

    await this.discordSyncService.requestReactivation(syncedUser.id);

    const token = this.createAccessToken({
      id: syncedUser.id,
      discordId: syncedUser.discordId,
      username: syncedUser.discordUsername,
    });
    const session = await this.discordSyncService.getSessionProfile(syncedUser.id);

    return {
      accessToken: token.accessToken,
      userId: syncedUser.id,
      playerId: session.playerId,
      roles: session.roles.length ? session.roles : ['MEMBER'],
    };
  }

  createAccessToken(user: { id: string; discordId: string; username: string }): { accessToken: string } {
    this.repository.touch();
    const payload = { sub: user.id, discordId: user.discordId, username: user.username };
    return { accessToken: this.jwtService.sign(payload) };
  }

  async getSessionProfile(userId: string) {
    const session = await this.discordSyncService.getSessionProfile(userId);
    return { userId, ...session, roles: session.roles.length ? session.roles : ['MEMBER'] };
  }
}
