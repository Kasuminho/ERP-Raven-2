import { IsInt, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class ReviewDaoshiReceiptDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  approvedCents?: number;

  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @IsPositive()
  approvedAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reviewNote?: string;
}
