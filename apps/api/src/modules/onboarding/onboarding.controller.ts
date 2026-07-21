import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateOnboardingTemplateDto } from './dto';
import { OnboardingService } from './onboarding.service';

type AuthRequest = { user: { userId: string } };

@Controller('onboarding')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class OnboardingController {
  constructor(private readonly service: OnboardingService) {}

  @Get('me')
  mine(@Req() req: AuthRequest) { return this.service.getMine(req.user.userId); }

  @Patch('me/steps/:stepId/complete')
  complete(@Req() req: AuthRequest, @Param('stepId') stepId: string) { return this.service.completeManualStep(req.user.userId, stepId); }

  @Get('staff')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  staff() { return this.service.getStaffWorkspace(); }

  @Post('staff/templates')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  createTemplate(@Req() req: AuthRequest, @Body() dto: CreateOnboardingTemplateDto) { return this.service.createTemplate(req.user.userId, dto); }
}
