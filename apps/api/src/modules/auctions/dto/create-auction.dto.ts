import { ItemTier, ItemType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateAuctionDto {
  @IsOptional()
  @IsUUID()
  itemCatalogId?: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  itemName!: string;

  @IsEnum(ItemType)
  itemType!: ItemType;

  @IsEnum(ItemTier)
  itemTier!: ItemTier;

  // Internal audit context. Controllers must overwrite this with the authenticated actor.
  createdById!: string;
}
