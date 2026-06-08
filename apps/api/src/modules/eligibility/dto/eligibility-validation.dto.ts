export type EligibilityStatus = 'ELIGIBLE' | 'INELIGIBLE' | 'NEEDS_STAFF_REVIEW';

export class EligibilityValidationResponseDto {
  playerId!: string;
  auctionId!: string;
  canBid!: boolean;
  eligibilityStatus!: EligibilityStatus;
  eligibilityReason!: string;
  requiresStaffReview!: boolean;
}
