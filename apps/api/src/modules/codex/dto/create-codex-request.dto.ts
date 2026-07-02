import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCodexRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  imageUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
