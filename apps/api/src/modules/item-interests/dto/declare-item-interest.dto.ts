import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const IMAGE_URL = /^(?:https?:\/\/.+|\/uploads\/.+|\/transmutar\.png)$/i;

export class DeclareItemInterestDto {
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Matches(IMAGE_URL)
  @MaxLength(2048)
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  isTransmuteRequest?: boolean;
}
