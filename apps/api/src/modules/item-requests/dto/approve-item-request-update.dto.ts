import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ApproveItemRequestUpdateDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  remainingQuantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
