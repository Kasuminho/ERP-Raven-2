import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Announcement } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CreateAnnouncementDto } from '../dto/create-announcement.dto';
import { AnnouncementsService } from '../services/announcements.service';

type StaffRequest = {
  user: {
    userId: string;
  };
};

@Controller('announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STAFF', 'ADMIN')
export class AnnouncementsController {
  constructor(private readonly service: AnnouncementsService) {}

  @Post()
  async create(@Body() dto: CreateAnnouncementDto, @Req() req: StaffRequest): Promise<Announcement> {
    return this.service.createAnnouncement(dto, req.user.userId);
  }

  @Get()
  async list(): Promise<Announcement[]> {
    return this.service.getAnnouncements();
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @Req() req: StaffRequest): Promise<Announcement> {
    return this.service.cancelAnnouncement(id, req.user.userId);
  }

  @Post('process-due')
  async processDue(): Promise<{ sent: number }> {
    return this.service.processDueAnnouncements();
  }
}
