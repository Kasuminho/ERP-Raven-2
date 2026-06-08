import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

export class StaffReviewAuctionNotFoundException extends NotFoundException {
  constructor(auctionId: string) {
    super(`Auction ${auctionId} was not found.`);
  }
}

export class StaffReviewBidNotFoundException extends NotFoundException {
  constructor(bidId: string) {
    super(`Bid ${bidId} was not found.`);
  }
}

export class InvalidStaffReviewStateException extends BadRequestException {
  constructor(message = 'This auction is not in a valid staff review state.') {
    super(message);
  }
}

export class InvalidStaffReviewActionException extends BadRequestException {
  constructor(message = 'This staff review action is invalid.') {
    super(message);
  }
}

export class IneligibleStaffApprovalException extends ForbiddenException {
  constructor(playerId: string, auctionId: string) {
    super(`Player ${playerId} is not eligible for approval on auction ${auctionId}.`);
  }
}
