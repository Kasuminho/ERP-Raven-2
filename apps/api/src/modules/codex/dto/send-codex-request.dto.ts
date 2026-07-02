import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SendCodexRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  proofImageUrl?: string;
}
