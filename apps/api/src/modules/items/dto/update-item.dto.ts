import { ItemTier, ItemType, PlayerClass } from '@prisma/client';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const IMAGE_URL = /^(https?:\/\/|\/uploads\/).+/i;
const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;

export class UpdateItemDto {
  @IsOptional() @Transform(trim) @IsString() @MinLength(1) @MaxLength(40)
  kind?: string;
  @IsOptional() @Transform(trim) @IsString() @MinLength(1) @MaxLength(80)
  category?: string;
  @IsOptional() @IsEnum(ItemTier)
  itemTier?: ItemTier;
  @IsOptional() @IsEnum(ItemType)
  itemType?: ItemType;
  @IsOptional() @Transform(trim) @IsString() @MinLength(1) @MaxLength(160)
  namePt?: string;
  @IsOptional() @Transform(trim) @IsString() @MinLength(1) @MaxLength(160)
  nameEn?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(160)
  nameEs?: string;
  @IsOptional() @Transform(trim) @IsString() @MinLength(1) @MaxLength(120)
  typePt?: string;
  @IsOptional() @Transform(trim) @IsString() @MinLength(1) @MaxLength(120)
  typeEn?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120)
  typeEs?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsEnum(PlayerClass, { each: true })
  preferredClasses?: PlayerClass[];
  @IsOptional() @Transform(trim) @IsString() @Matches(IMAGE_URL) @MaxLength(2048)
  image1Url?: string;
  @IsOptional() @Transform(trim) @IsString() @Matches(IMAGE_URL) @MaxLength(2048)
  image2Url?: string;
  @IsOptional() @IsBoolean()
  isActive?: boolean;
  @IsOptional() @IsBoolean()
  diamondSaleEnabled?: boolean;
  // Internal audit context. Controllers must overwrite this with the authenticated actor.
  updatedById?: string;
}
