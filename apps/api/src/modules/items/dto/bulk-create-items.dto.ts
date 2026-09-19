import { ItemTier, ItemType, PlayerClass } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class BulkItemEntryDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(40)
  kind?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsEnum(ItemTier)
  itemTier?: ItemTier;

  @IsOptional()
  @IsEnum(ItemType)
  itemType?: ItemType;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  namePt!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(160)
  nameEn?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(160)
  nameEs?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  typePt?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  typeEn?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  typeEs?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsEnum(PlayerClass, { each: true })
  preferredClasses?: PlayerClass[];

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2048)
  image1Url?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2048)
  image2Url?: string;

  @IsOptional()
  @IsBoolean()
  diamondSaleEnabled?: boolean;
}

export class BulkCreateItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => BulkItemEntryDto)
  items!: BulkItemEntryDto[];
}
