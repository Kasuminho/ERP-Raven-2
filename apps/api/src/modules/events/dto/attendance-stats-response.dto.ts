export class AttendanceStatsResponseDto {
  playerId!: string;
  participatedEvents!: number;
  eligibleEvents!: number;
  attendancePercentage!: number;
}

export type PlayerAttendanceStatus = 'PRESENT' | 'ABSENT' | 'PENDING';

export class PlayerAttendanceHistoryRowDto {
  eventId!: string;
  name!: string;
  type!: string;
  status!: string;
  dkpReward!: number;
  startsAt!: Date;
  finalizedAt?: Date | null;
  attendanceStatus!: PlayerAttendanceStatus;
}
