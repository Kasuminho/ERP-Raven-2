import { IsUUID } from 'class-validator';

export class VoteItemInterestDto {
  @IsUUID()
  entryId!: string;
}
