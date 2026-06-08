import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

export class AuctionNotFoundException extends NotFoundException {
  constructor(auctionId: string) {
    super(`Auction ${auctionId} was not found.`);
  }
}

export class InvalidAuctionStateException extends BadRequestException {
  constructor(message = 'The auction is not in a valid state for this operation.') {
    super(message);
  }
}

export class InvalidBidException extends BadRequestException {
  constructor(message = 'The bid is invalid.') {
    super(message);
  }
}

export class DuplicateBidException extends ConflictException {
  constructor(playerId: string, auctionId: string) {
    super(`Player ${playerId} already has a bid for auction ${auctionId}.`);
  }
}
