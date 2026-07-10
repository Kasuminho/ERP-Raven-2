import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';

export class CreateItemRequestDto {
  @IsUUID()
  itemCatalogId!: string;

  @IsUUID()
  playerId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  threadId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  threadChannelId?: string;
}

export class CreateSelfItemRequestDto {
  @IsUUID()
  itemCatalogId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  imageUrl?: string;
}
