import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class VoteItemInterestDto {
  @IsUUID()
  entryId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
