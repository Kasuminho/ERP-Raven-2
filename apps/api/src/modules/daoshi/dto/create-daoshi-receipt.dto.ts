import { IsDateString, IsNumber, IsOptional, IsPositive, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateDaoshiReceiptDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  proofImageUrl!: string;

  @IsNumber({ allowInfinity: false, allowNaN: false })
  @IsPositive()
  purchaseAmount!: number;

  @IsDateString()
  purchaseDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  playerNote?: string;
}

export class CreateManualDaoshiReceiptDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  playerId!: string;

  @IsNumber({ allowInfinity: false, allowNaN: false })
  @IsPositive()
  purchaseAmount!: number;

  @IsDateString()
  purchaseDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reviewNote?: string;
}
