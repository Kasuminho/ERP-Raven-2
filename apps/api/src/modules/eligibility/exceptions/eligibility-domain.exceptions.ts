import { BadRequestException, NotFoundException } from '@nestjs/common';

export class EligibilityAuctionNotFoundException extends NotFoundException {
  constructor(auctionId: string) {
    super(`Auction ${auctionId} was not found.`);
  }
}

export class EligibilityPlayerNotFoundException extends NotFoundException {
  constructor(playerId: string) {
    super(`Player ${playerId} was not found.`);
  }
}

export class ForcedApprovalRejectedException extends BadRequestException {
  constructor(playerId: string, auctionId: string) {
    super(`Player ${playerId} cannot be force-approved for auction ${auctionId} because they are ineligible.`);
  }
}
