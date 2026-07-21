import { Transform } from 'class-transformer';
import { IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateItemInterestPostDto {
  @IsUUID()
  itemCatalogId!: string;

  @IsOptional()
  @IsIn(['PvE', 'PvP'])
  mode?: 'PvE' | 'PvP';

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  title?: string;

  @IsDateString()
  closesAt!: string;
}
