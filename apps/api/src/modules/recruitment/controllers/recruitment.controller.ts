import { Body, Controller, Get, Param, Post, Query, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { RecruitmentApplicationStatus } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ConvertRecruitmentApplicationDto, CreateRecruitmentApplicationDto, ReviewRecruitmentApplicationDto } from '../dto';
import { RecruitmentService } from '../services/recruitment.service';

type RequestWithUser = { user?: { userId: string }; ip?: string; headers?: Record<string, string | string[] | undefined> };

@Controller('recruitment')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class RecruitmentController {
  constructor(private readonly service: RecruitmentService) {}

  @Post('applications')
  async create(@Body() dto: CreateRecruitmentApplicationDto, @Req() req: RequestWithUser) {
    const forwarded = req.headers?.['x-forwarded-for'];
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded ?? req.ip ?? 'unknown';
    return this.service.createApplication(dto, ip.split(',')[0].trim());
  }

  @Get('staff/applications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async staffList(@Query('status') status?: RecruitmentApplicationStatus) {
    return this.service.listStaff(status);
  }

  @Post('staff/applications/:applicationId/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async review(
    @Param('applicationId') applicationId: string,
    @Body() dto: ReviewRecruitmentApplicationDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.review(applicationId, req.user?.userId ?? '', dto.status, dto.reviewNote);
  }

  @Post('staff/applications/:applicationId/convert')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async convert(
    @Param('applicationId') applicationId: string,
    @Body() dto: ConvertRecruitmentApplicationDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.convert(applicationId, req.user?.userId ?? '', dto);
  }
}
