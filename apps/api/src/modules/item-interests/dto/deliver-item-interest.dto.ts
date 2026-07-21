import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

const PROOF_URL = /^(https?:\/\/|\/uploads\/).+/i;

export class DeliverItemInterestDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  entryIds?: string[];

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Matches(PROOF_URL)
  @MaxLength(2048)
  proofImageUrl?: string;
}
