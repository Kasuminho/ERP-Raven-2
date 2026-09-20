import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class UpdateStorageItemDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  quantity?: number;

  @IsOptional()
  @IsString()
  source?: string;
}
