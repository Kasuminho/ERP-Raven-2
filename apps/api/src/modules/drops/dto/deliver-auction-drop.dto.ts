import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const PROOF_URL = /^(https?:\/\/|\/uploads\/).+/i;

export class DeliverAuctionDropDto {
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Matches(PROOF_URL)
  @MaxLength(2048)
  proofImageUrl?: string;
}
