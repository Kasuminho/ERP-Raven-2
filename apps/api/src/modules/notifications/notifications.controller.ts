import { Controller, Get, Param, Post, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NotificationIdParamDto } from './dto';
import { NotificationsService } from './notifications.service';

type AuthRequest = {
  user: {
    userId: string;
  };
};

@Controller('notifications')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
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
  async markRead(@Param() params: NotificationIdParamDto, @Req() req: AuthRequest) {
    return this.service.markRead(req.user.userId, params.id);
  }

  @Post('read-all')
  async markAllRead(@Req() req: AuthRequest) {
    return this.service.markAllRead(req.user.userId);
  }
}
