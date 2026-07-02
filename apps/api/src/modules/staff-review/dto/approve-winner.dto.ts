import { IsUUID } from 'class-validator';

export class ApproveWinnerDto {
  @IsUUID()
  playerId!: string;
}
