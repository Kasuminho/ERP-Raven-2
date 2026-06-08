import { EventType } from '@prisma/client';

export class CreateEventDto {
  name!: string;
  type!: EventType;
  startsAt!: string;
  createdById?: string;
}
