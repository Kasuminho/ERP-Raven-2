import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { DiscordNotifyDto, DiscordSyncDto } from '../dto';
import { DiscordSyncedUser, DiscordSyncService } from '../services/discord-sync.service';
import { NotificationService } from '../services/notification.service';

type AuthenticatedRequest = {
  user: {
    userId: string;
  };
};

@Controller('discord')
export class DiscordController {
  constructor(
    private readonly syncService: DiscordSyncService,
    private readonly notificationService: NotificationService,
  ) {}

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  async sync(@Body() dto: DiscordSyncDto, @Req() req: AuthenticatedRequest): Promise<DiscordSyncedUser> {
    return this.syncService.syncUser({
      userId: dto.userId ?? req.user.userId,
      discordId: dto.discordId,
    });
  }

  @Post('notify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async notify(@Body() dto: DiscordNotifyDto): Promise<{ delivered: boolean }> {
    switch (dto.type) {
      case 'AUCTION_CREATED':
        await this.notificationService.notifyAuctionCreated({
          auctionId: dto.targetId ?? '',
          itemName: String(dto.metadata?.itemName ?? 'Unknown Item'),
          itemTier: String(dto.metadata?.itemTier ?? 'Unknown Tier'),
          minimumBid: Number(dto.metadata?.minimumBid ?? 0),
          endsAt: new Date(String(dto.metadata?.endsAt ?? new Date().toISOString())),
        });
        break;
      case 'AUCTION_ENDING_SOON':
        await this.notificationService.notifyAuctionEndingSoon({
          auctionId: dto.targetId ?? '',
          itemName: String(dto.metadata?.itemName ?? 'Unknown Item'),
        });
        break;
      case 'BID_OUTBID':
        await this.notificationService.notifyBidOutbid({
          auctionId: dto.targetId ?? '',
          discordId: String(dto.metadata?.discordId ?? ''),
          itemName: String(dto.metadata?.itemName ?? 'Unknown Item'),
        });
        break;
      case 'AUCTION_WINNER':
        await this.notificationService.notifyAuctionWinner({
          auctionId: dto.targetId ?? '',
          itemName: String(dto.metadata?.itemName ?? 'Unknown Item'),
          playerName: String(dto.metadata?.playerName ?? 'Unknown Player'),
          discordId: dto.metadata?.discordId ? String(dto.metadata.discordId) : undefined,
        });
        break;
      case 'ATTENDANCE_STARTED':
        await this.notificationService.notifyAttendanceStarted({
          eventId: dto.targetId ?? '',
          eventName: String(dto.metadata?.eventName ?? 'Unknown Event'),
          startsAt: new Date(String(dto.metadata?.startsAt ?? new Date().toISOString())),
        });
        break;
      case 'EVENT_FINALIZED':
        await this.notificationService.notifyEventFinalized({
          eventId: dto.targetId ?? '',
          eventName: String(dto.metadata?.eventName ?? 'Unknown Event'),
          rewardPerPlayer: Number(dto.metadata?.rewardPerPlayer ?? dto.metadata?.reward ?? 0),
          totalDkp: Number(dto.metadata?.totalDkp ?? 0),
          presentCount: Number(dto.metadata?.presentCount ?? 0),
          absentCount: Number(dto.metadata?.absentCount ?? 0),
        });
        break;
      case 'STAFF_REVIEW_REQUIRED':
        await this.notificationService.notifyStaffReviewRequired({
          auctionId: dto.targetId ?? '',
          itemName: String(dto.metadata?.itemName ?? 'Unknown Item'),
        });
        break;
      default:
        if (dto.channelId && dto.message) {
          await this.notificationService.sendOperationalNotification(dto.channelId, dto.message);
        }
    }

    return { delivered: true };
  }
}
