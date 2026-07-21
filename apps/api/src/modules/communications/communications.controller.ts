import {
  Body,
  Controller,
  Get,
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
import { UpdateCommunicationPreferenceDto } from "./dto";
import { CommunicationsService } from "./communications.service";
type AuthRequest = { user: { userId: string } };
@Controller("communications")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("PLAYER", "STAFF", "ADMIN")
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class CommunicationsController {
  constructor(private readonly service: CommunicationsService) {}
  @Get("me") mine(@Req() req: AuthRequest) {
    return this.service.getMine(req.user.userId);
  }
  @Put("me") update(
    @Req() req: AuthRequest,
    @Body() dto: UpdateCommunicationPreferenceDto,
  ) {
    return this.service.updateMine(req.user.userId, dto);
  }
  @Get("me/digest") digest(@Req() req: AuthRequest) {
    return this.service.getDigest(req.user.userId);
  }
  @Post("me/test") test(@Req() req: AuthRequest) {
    return this.service.sendTest(req.user.userId);
  }
}
