import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateManualDropDto {
  @IsString()
  playerId!: string;

  @IsString()
  @IsOptional()
  itemCatalogId?: string;

  @IsString()
  itemName!: string;

  @IsDateString()
  @IsOptional()
  deliveredAt?: string;

  @IsString()
  @IsOptional()
  proofImageUrl?: string;
}
