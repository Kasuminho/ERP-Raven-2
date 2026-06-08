import { Injectable } from '@nestjs/common';
import { AuditLog, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';

type AuditClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  health(): { module: string; ready: boolean } {
    return { module: 'audit', ready: true };
  }

  async create(data: Prisma.AuditLogCreateInput, client: AuditClient = this.prisma): Promise<AuditLog> {
    return client.auditLog.create({ data });
  }

  async findTimeline(
    targetType: string,
    targetId: string,
    options: { page?: number; limit?: number } = {},
    client: AuditClient = this.prisma,
  ): Promise<AuditLog[]> {
    const page = Number.isInteger(options.page) && Number(options.page) > 0 ? Number(options.page) : 1;
    const limit = Number.isInteger(options.limit) && Number(options.limit) > 0 ? Math.min(Number(options.limit), 200) : 50;

    return client.auditLog.findMany({
      where: { targetType, targetId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }
}
