import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

export class InsufficientDkpException extends BadRequestException {
  constructor(playerId: string) {
    super(`Player ${playerId} does not have enough available DKP.`);
  }
}

export class DuplicateDkpLockException extends ConflictException {
  constructor(playerId: string, auctionId: string) {
    super(`Player ${playerId} already has a DKP lock for auction ${auctionId}.`);
  }
}

export class InvalidDkpLockException extends BadRequestException {
  constructor(message = 'The DKP lock is invalid.') {
    super(message);
  }
}

export class DkpLockNotFoundException extends NotFoundException {
  constructor(lockId: string) {
    super(`DKP lock ${lockId} was not found.`);
  }
}

export class InvalidDkpTransactionException extends BadRequestException {
  constructor(message = 'The DKP transaction is invalid.') {
    super(message);
  }
}
