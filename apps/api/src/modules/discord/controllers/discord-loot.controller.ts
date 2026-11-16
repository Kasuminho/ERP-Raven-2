import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { DiscordLootService, LootDropItem } from '../services/discord-loot.service';

type AuthenticatedRequest = {
  user: {
    userId: string;
  };
};

@Controller('discord/loot')
@UseGuards(JwtAuthGuard)
export class DiscordLootController {
  constructor(private readonly lootService: DiscordLootService) {}

  @Get('drops')
  async getDrops(
    @Query('channelId') channelId?: string,
    @Query('limit') limit?: string,
  ): Promise<LootDropItem[]> {
    const targetChannel = channelId || '1550143905742327878';
    const maxLimit = limit ? Math.min(Number(limit) || 20, 50) : 20;
    return this.lootService.getChannelDrops(targetChannel, maxLimit);
  }

  @Post('declare-winner')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async declareWinner(
    @Body()
    dto: {
      channelId: string;
      messageId: string;
      playerId: string;
      note?: string;
    },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.lootService.declareWinner({
      channelId: dto.channelId,
      messageId: dto.messageId,
      playerId: dto.playerId,
      declaredByUserId: req.user.userId,
      note: dto.note,
    });
  }

  @Post('interest')
  async expressInterest(
    @Body()
    dto: {
      channelId: string;
      messageId: string;
    },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.lootService.toggleUserInterest(dto.channelId, dto.messageId, req.user.userId);
  }
}
