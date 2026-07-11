import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class MarkEventChecklistItemDto {
  @IsBoolean()
  checked!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  note?: string;
}
