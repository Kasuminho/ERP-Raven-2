import { IsInt, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class DispatchStorageItemDto {
  @IsUUID()
  storageItemId!: string;

  @IsUUID()
  requestId!: string;

  @IsInt()
  @IsPositive()
  quantity!: number;

  @IsOptional()
  @IsString()
  proofImageUrl?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
