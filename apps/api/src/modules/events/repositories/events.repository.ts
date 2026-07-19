import { Injectable } from '@nestjs/common';
import { Event, EventAttendance, EventStatus, Player, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';

type EventsClient = PrismaService | Prisma.TransactionClient;

export type EventDetails = Prisma.EventGetPayload<{
  include: {
    attendances: {
      include: {
        player: true;
      };
    };
  };
}>;

@Injectable()
export class EventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  health(): { module: string; ready: boolean } {
    return { module: 'events', ready: true };
  }

  get client(): PrismaService {
    return this.prisma;
  }

  async create(data: Prisma.EventCreateInput, client: EventsClient = this.prisma): Promise<Event> {
    return client.event.create({ data });
  }

  async findById(eventId: string, client: EventsClient = this.prisma): Promise<Event | null> {
    return client.event.findUnique({ where: { id: eventId } });
  }

  async findDetails(eventId: string, client: EventsClient = this.prisma): Promise<EventDetails | null> {
    return client.event.findUnique({
      where: { id: eventId },
      include: {
        attendances: {
          include: { player: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async findMany(
    options: { page?: number; limit?: number; hideFinalized?: boolean } = {},
    client: EventsClient = this.prisma,
  ): Promise<Event[]> {
    const page = Number.isInteger(options.page) && Number(options.page) > 0 ? Number(options.page) : 1;
    const limit = Number.isInteger(options.limit) && Number(options.limit) > 0 ? Math.min(Number(options.limit), 200) : 100;

    return client.event.findMany({
      where: options.hideFinalized ? { status: { notIn: [EventStatus.FINALIZED, EventStatus.CANCELLED] } } : undefined,
      orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findPlayer(playerId: string, client: EventsClient = this.prisma): Promise<Player | null> {
    return client.player.findUnique({ where: { id: playerId } });
  }

  async findPlayers(client: EventsClient = this.prisma): Promise<Player[]> {
    return client.player.findMany({
      where: { isActive: true },
      orderBy: { nickname: 'asc' },
    });
  }

  async countActivePlayers(client: EventsClient = this.prisma): Promise<number> {
    return client.player.count({
      where: { isActive: true },
    });
  }

  async findAttendance(
    eventId: string,
    playerId: string,
    client: EventsClient = this.prisma,
  ): Promise<EventAttendance | null> {
    return client.eventAttendance.findUnique({
      where: {
        eventId_playerId: {
          eventId,
          playerId,
        },
      },
    });
  }

  async createAttendance(
    eventId: string,
    playerId: string,
    client: EventsClient = this.prisma,
  ): Promise<EventAttendance> {
    return client.eventAttendance.create({
      data: {
        event: { connect: { id: eventId } },
        player: { connect: { id: playerId } },
        attended: true,
      },
    });
  }

  async deleteAttendance(attendanceId: string, client: EventsClient = this.prisma): Promise<EventAttendance> {
    return client.eventAttendance.delete({
      where: { id: attendanceId },
    });
  }

  async findAttendedPlayers(eventId: string, client: EventsClient = this.prisma): Promise<EventAttendance[]> {
    return client.eventAttendance.findMany({
      where: {
        eventId,
        attended: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateEvent(
    eventId: string,
    data: Prisma.EventUpdateInput,
    client: EventsClient = this.prisma,
  ): Promise<Event> {
    return client.event.update({
      where: { id: eventId },
      data,
    });
  }

  async countFinalizedEvents(client: EventsClient = this.prisma, since?: Date): Promise<number> {
    return client.event.count({
      where: {
        status: EventStatus.FINALIZED,
        startsAt: since ? { gte: since } : undefined,
      },
    });
  }

  async countPlayerFinalizedAttendance(playerId: string, client: EventsClient = this.prisma, since?: Date): Promise<number> {
    return client.eventAttendance.count({
      where: {
        playerId,
        attended: true,
        event: {
          status: EventStatus.FINALIZED,
          startsAt: since ? { gte: since } : undefined,
        },
      },
    });
  }
}
