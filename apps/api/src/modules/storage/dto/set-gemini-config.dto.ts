import { IsNotEmpty, IsString } from 'class-validator';

export class SetGeminiConfigDto {
  @IsString()
  @IsNotEmpty()
  apiKey!: string;
}
