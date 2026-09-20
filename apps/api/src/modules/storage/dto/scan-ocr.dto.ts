import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ImageInputDto {
  @IsString()
  data!: string; // base64 string or data URL

  @IsOptional()
  @IsString()
  mimeType?: string;
}

export class ScanOcrDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20) // Suporta até 20 prints de uma só vez em batch
  @ValidateNested({ each: true })
  @Type(() => ImageInputDto)
  images!: ImageInputDto[];

  @IsOptional()
  @IsString()
  apiKey?: string;
}
