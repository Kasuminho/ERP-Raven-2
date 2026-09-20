import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ScanCatalogImageDto {
  @IsString()
  data!: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}

export class ScanCatalogOcrDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ScanCatalogImageDto)
  images!: ScanCatalogImageDto[];
}
