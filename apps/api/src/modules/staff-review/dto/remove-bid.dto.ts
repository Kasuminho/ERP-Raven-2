import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class RemoveBidDto {
  @IsUUID()
  bidId!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
