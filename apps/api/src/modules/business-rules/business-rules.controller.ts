import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BusinessRuleKeyParamDto, UpdateBusinessRuleDto } from './dto';
import { BusinessRulesService } from './business-rules.service';

type StaffRequest = {
  user: {
    userId: string;
  };
};

@Controller('business-rules')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STAFF', 'ADMIN')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class BusinessRulesController {
  constructor(private readonly service: BusinessRulesService) {}

  @Get()
  async list() {
    return this.service.listRules();
  }

  @Patch(':key')
  async update(
    @Param() params: BusinessRuleKeyParamDto,
    @Body() body: UpdateBusinessRuleDto,
    @Req() req: StaffRequest,
  ) {
    return this.service.updateRule(params.key, body.value, req.user.userId);
  }

  @Post(':key/reset')
  async reset(@Param() params: BusinessRuleKeyParamDto, @Req() req: StaffRequest) {
    return this.service.resetRule(params.key, req.user.userId);
  }

  @Post('seed-defaults')
  async seedDefaults(@Req() req: StaffRequest) {
    return this.service.seedDefaults(req.user.userId);
  }
}
