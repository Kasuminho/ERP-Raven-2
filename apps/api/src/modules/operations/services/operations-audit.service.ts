import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';

@Injectable()
export class OperationsAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async getRecentAudit(limit = 25) {
    return this.prisma.auditLog.findMany({
      include: {
        actor: {
          select: {
            id: true,
            discordUsername: true,
            discordNickname: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
    });
  }
}
