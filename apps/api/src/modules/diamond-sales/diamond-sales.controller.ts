import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateDiamondSaleDto, DeliverDiamondShareDto } from './dto';
import { DiamondSalesService } from './diamond-sales.service';

type AuthRequest = { user: { userId: string } };

@Controller('diamond-sales')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STAFF', 'ADMIN')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class DiamondSalesController {
  constructor(private readonly service: DiamondSalesService) {}

  @Get('setup')
  setup() {
    return this.service.getSetup();
  }

  @Get()
  list() {
    return this.service.listSales();
  }

  @Get(':saleId')
  detail(@Param('saleId', new ParseUUIDPipe()) saleId: string) {
    return this.service.getSale(saleId);
  }

  @Post()
  create(@Body() dto: CreateDiamondSaleDto, @Req() req: AuthRequest) {
    return this.service.createSale(dto, req.user.userId);
  }

  @Post(':saleId/recipients/:recipientId/deliver')
  deliver(
    @Param('saleId', new ParseUUIDPipe()) saleId: string,
    @Param('recipientId', new ParseUUIDPipe()) recipientId: string,
    @Body() dto: DeliverDiamondShareDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.deliverShare(saleId, recipientId, dto.proofImageUrl, req.user.userId);
  }

  @Post(':saleId/publish')
  publish(@Param('saleId', new ParseUUIDPipe()) saleId: string, @Req() req: AuthRequest) {
    return this.service.republishSale(saleId, req.user.userId);
  }
}
