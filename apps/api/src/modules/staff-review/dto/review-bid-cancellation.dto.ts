import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewBidCancellationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
