import { IsUUID } from 'class-validator';

export class RegisterAttendanceDto {
  @IsUUID()
  playerId!: string;
}
