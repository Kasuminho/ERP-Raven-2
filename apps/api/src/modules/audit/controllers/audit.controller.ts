import { Controller, Get, Param, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AuditTimelineParamDto, AuditTimelineQueryDto } from '../dto';
import { AuditService } from '../services/audit.service';

@Controller('audit')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get('health')
  health(): { module: string; ready: boolean } {
    return this.service.health();
  }

  @Get(':targetType/:targetId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async timeline(
    @Param() params: AuditTimelineParamDto,
    @Query() query: AuditTimelineQueryDto,
  ) {
    return this.service.getTimeline(params.targetType, params.targetId, { page: query.page, limit: query.limit });
  }
}
