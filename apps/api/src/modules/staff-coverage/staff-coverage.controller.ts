import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CreateStaffAvailabilityDto, UpsertStaffAreaCoverageDto } from "./dto";
import { StaffCoverageService } from "./staff-coverage.service";
type AuthRequest = { user: { userId: string } };

@Controller("staff-coverage")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("STAFF", "ADMIN")
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class StaffCoverageController {
  constructor(private readonly service: StaffCoverageService) {}
  @Get() get(@Req() req: AuthRequest) {
    return this.service.getWorkspace(req.user.userId);
  }
  @Put("areas") upsert(
    @Req() req: AuthRequest,
    @Body() dto: UpsertStaffAreaCoverageDto,
  ) {
    return this.service.upsert(req.user.userId, dto);
  }
  @Post("unavailability") declare(
    @Req() req: AuthRequest,
    @Body() dto: CreateStaffAvailabilityDto,
  ) {
    return this.service.declareUnavailable(req.user.userId, dto);
  }
  @Delete("unavailability/:id") remove(
    @Req() req: AuthRequest,
    @Param("id") id: string,
  ) {
    return this.service.removeDeclaration(req.user.userId, id);
  }
}
