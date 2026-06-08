import { Injectable } from '@nestjs/common';
import { Announcement, AnnouncementStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';

type AnnouncementClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class AnnouncementsRepository {
  constructor(private readonly prisma: PrismaService) {}

  get client(): PrismaService {
    return this.prisma;
  }

  async create(data: Prisma.AnnouncementCreateInput, client: AnnouncementClient = this.prisma): Promise<Announcement> {
    return client.announcement.create({ data });
  }

  async findMany(client: AnnouncementClient = this.prisma): Promise<Announcement[]> {
    return client.announcement.findMany({
      orderBy: [{ status: 'asc' }, { eventTime: 'asc' }],
    });
  }

  async findActive(client: AnnouncementClient = this.prisma): Promise<Announcement[]> {
    return client.announcement.findMany({
      where: { status: AnnouncementStatus.ACTIVE },
      orderBy: { eventTime: 'asc' },
    });
  }

  async findById(id: string, client: AnnouncementClient = this.prisma): Promise<Announcement | null> {
    return client.announcement.findUnique({ where: { id } });
  }

  async update(id: string, data: Prisma.AnnouncementUpdateInput, client: AnnouncementClient = this.prisma): Promise<Announcement> {
    return client.announcement.update({ where: { id }, data });
  }
}
