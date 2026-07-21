import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class CreateItemAuctionsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  quantity!: number;
  // Internal audit context. Controllers must overwrite this with the authenticated actor.
  createdById?: string;
}
