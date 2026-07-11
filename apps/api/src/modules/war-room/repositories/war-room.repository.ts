import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';

@Injectable()
export class WarRoomRepository {
  constructor(private readonly prisma: PrismaService) {}

  get client(): PrismaService {
    return this.prisma;
  }
}
