import { WishlistPriority } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateWishlistItemDto {
  @IsUUID()
  itemCatalogId!: string;

  @IsEnum(WishlistPriority)
  priority!: WishlistPriority;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  build?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  proofImageUrl?: string;
}

export class FulfillWishlistItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
