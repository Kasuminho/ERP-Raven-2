import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';

export class BulkCreateItemInterestPostDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  itemCatalogIds!: string[];

  @IsOptional()
  @IsIn(['PvE', 'PvP'])
  mode?: 'PvE' | 'PvP';

  @IsDateString()
  closesAt!: string;
}
