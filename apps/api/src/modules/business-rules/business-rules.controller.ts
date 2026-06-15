import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BusinessRulesService } from './business-rules.service';

type StaffRequest = {
  user: {
    userId: string;
  };
};

@Controller('business-rules')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STAFF', 'ADMIN')
export class BusinessRulesController {
  constructor(private readonly service: BusinessRulesService) {}

  @Get()
  async list() {
    return this.service.listRules();
  }

  @Patch(':key')
  async update(
    @Param('key') key: string,
    @Body() body: { value: unknown },
    @Req() req: StaffRequest,
  ) {
    return this.service.updateRule(key, body.value, req.user.userId);
  }

  @Post(':key/reset')
  async reset(@Param('key') key: string, @Req() req: StaffRequest) {
    return this.service.resetRule(key, req.user.userId);
  }

  @Post('seed-defaults')
  async seedDefaults(@Req() req: StaffRequest) {
    return this.service.seedDefaults(req.user.userId);
  }
}
