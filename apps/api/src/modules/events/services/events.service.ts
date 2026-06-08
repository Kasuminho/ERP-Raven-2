import { Injectable } from '@nestjs/common';
import { EventsRepository } from '../repositories/events.repository';

@Injectable()
export class EventsService {
  constructor(private readonly repository: EventsRepository) {}

  health(): { module: string; ready: boolean } {
    return this.repository.health();
  }
}
