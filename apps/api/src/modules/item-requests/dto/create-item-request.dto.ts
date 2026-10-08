import { ItemRequestCraftType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';

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
  @IsEnum(ItemRequestCraftType)
  craftType?: ItemRequestCraftType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  currentQuantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetQuantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quintessenceQuantity?: number;

  @IsOptional()
  @IsUUID()
  targetItemCatalogId?: string;

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

  @IsOptional()
  @IsEnum(ItemRequestCraftType)
  craftType?: ItemRequestCraftType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  currentQuantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetQuantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quintessenceQuantity?: number;

  @IsOptional()
  @IsUUID()
  targetItemCatalogId?: string;
}
