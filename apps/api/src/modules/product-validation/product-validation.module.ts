import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { ProductValidationController } from "./product-validation.controller";
import { ProductValidationService } from "./product-validation.service";

@Module({
  imports: [AuditModule],
  controllers: [ProductValidationController],
  providers: [ProductValidationService],
})
export class ProductValidationModule {}
