import { EligibilityStatus } from './eligibility-validation.dto';

export class RankingResponseDto {
  playerId!: string;
  nickname!: string;
  dimensionalLayer!: number;
  attendancePercentage!: number;
  availableDKP!: number;
  bidId?: string;
  bidAmount?: number;
  lockAmount?: number;
  lockMatchesBid?: boolean;
  priorityScore!: number;
  eligibilityStatus!: EligibilityStatus;
  eligibilityReason!: string;
}
