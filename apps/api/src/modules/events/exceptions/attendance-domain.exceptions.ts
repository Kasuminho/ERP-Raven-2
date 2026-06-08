import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

export class EventNotFoundException extends NotFoundException {
  constructor(eventId: string) {
    super(`Event ${eventId} was not found.`);
  }
}

export class PlayerNotFoundForAttendanceException extends NotFoundException {
  constructor(playerId: string) {
    super(`Player ${playerId} was not found.`);
  }
}

export class DuplicateAttendanceException extends ConflictException {
  constructor(eventId: string, playerId: string) {
    super(`Player ${playerId} is already registered for event ${eventId}.`);
  }
}

export class FinalizedEventModificationException extends BadRequestException {
  constructor(eventId: string) {
    super(`Event ${eventId} is finalized and cannot be modified without staff override.`);
  }
}

export class InvalidEventStateException extends BadRequestException {
  constructor(message = 'The event is not in a valid state for this operation.') {
    super(message);
  }
}
