import { IsIn, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class CreateAuctionDisputeDto {
  @IsString()
  @MinLength(12)
  @MaxLength(1000)
  reason!: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  proofImageUrl?: string;
}

export class ReviewAuctionDisputeDto {
  @IsIn(['ACCEPTED', 'REJECTED'])
  status!: 'ACCEPTED' | 'REJECTED';

  @IsString()
  @MinLength(8)
  @MaxLength(1000)
  reviewNote!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  externalNotePt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  externalNoteEn?: string;
}
