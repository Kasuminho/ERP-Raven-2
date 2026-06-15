import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

type AuthRequest = {
  user: {
    userId: string;
  };
};

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get('me')
  async mine(@Req() req: AuthRequest) {
    return this.service.listForUser(req.user.userId);
  }

  @Get('me/unread-count')
  async unreadCount(@Req() req: AuthRequest) {
    return this.service.unreadCount(req.user.userId);
  }

  @Post(':id/read')
  async markRead(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.service.markRead(req.user.userId, id);
  }

  @Post('read-all')
  async markAllRead(@Req() req: AuthRequest) {
    return this.service.markAllRead(req.user.userId);
  }
}
