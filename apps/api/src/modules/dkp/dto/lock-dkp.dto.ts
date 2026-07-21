import { Type } from 'class-transformer';
import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class LockDkpDto {
  @IsUUID()
  playerId!: string;

  @IsUUID()
  auctionId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  amount!: number;
}
