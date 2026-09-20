import { ItemTier, ItemType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class StorageItemEntryDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  itemName!: string;

  @IsInt()
  @IsPositive()
  quantity!: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(ItemTier)
  itemTier?: ItemTier;

  @IsOptional()
  @IsEnum(ItemType)
  itemType?: ItemType;

  @IsOptional()
  @Transform(trim)
  @IsString()
  kind?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  source?: string;
}

export class ImportStorageItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => StorageItemEntryDto)
  items!: StorageItemEntryDto[];
}
