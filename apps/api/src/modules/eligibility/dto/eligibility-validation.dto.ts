export type EligibilityStatus = 'ELIGIBLE' | 'INELIGIBLE' | 'NEEDS_STAFF_REVIEW';

export class EligibilityValidationResponseDto {
  playerId!: string;
  auctionId!: string;
  canBid!: boolean;
  eligibilityStatus!: EligibilityStatus;
  eligibilityReason!: string;
  requiresStaffReview!: boolean;
  playerLayer?: number;
  requiredLayer?: number;
  availableDKP?: number;
  requiredDKP?: number;
  attendancePercentage?: number;
  auctionMode?: string;
  itemTier?: string;
  itemType?: string;
}
