import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, IsString, IsUUID, MaxLength, Min } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateStorageRequestDto {
  @IsUUID()
  storageItemId!: string;

  @IsInt()
  @IsPositive()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  playerNote?: string;
}

export class DispatchStorageRequestActionDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  staffNote?: string;
}

export class RejectStorageRequestDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  staffNote?: string;
}
