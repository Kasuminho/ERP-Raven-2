import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import {
  CaptureProductValidationWeekDto,
  CreateProductValidationInterviewDto,
} from "./dto";
import { ProductValidationService } from "./product-validation.service";

type AuthRequest = { user: { userId: string } };

@Controller("product-validation")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("STAFF", "ADMIN")
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class ProductValidationController {
  constructor(private readonly service: ProductValidationService) {}

  @Get()
  getWorkspace() {
    return this.service.getWorkspace();
  }

  @Post("interviews")
  createInterview(
    @Req() req: AuthRequest,
    @Body() dto: CreateProductValidationInterviewDto,
  ) {
    return this.service.createInterview(req.user.userId, dto);
  }

  @Post("weeks")
  captureWeek(
    @Req() req: AuthRequest,
    @Body() dto: CaptureProductValidationWeekDto,
  ) {
    return this.service.captureWeek(req.user.userId, dto);
  }
}
