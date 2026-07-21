import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpsertEventReserveDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(999)
  position!: number;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class RespondEventReservePromotionDto {
  @IsBoolean()
  accept!: boolean;

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() || undefined : value)
  @IsString()
  @MaxLength(500)
  note?: string;
}
