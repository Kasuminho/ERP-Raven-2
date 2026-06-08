import { Injectable, Logger } from '@nestjs/common';
import { AuditLog, Prisma } from '@prisma/client';
import { AuditRepository } from '../repositories/audit.repository';

export interface AuditRecord {
  actorId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Prisma.InputJsonObject;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly repository: AuditRepository) {}

  async log(record: AuditRecord): Promise<AuditLog> {
    this.logger.debug(`audit_event=${record.action}`);

    return this.create(record);
  }

  async logWithinTransaction(record: AuditRecord, client: Prisma.TransactionClient): Promise<AuditLog> {
    this.logger.debug(`audit_event=${record.action}`);

    return this.create(record, client);
  }

  private async create(record: AuditRecord, client?: Prisma.TransactionClient): Promise<AuditLog> {
    return this.repository.create({
      actor: record.actorId ? { connect: { id: record.actorId } } : undefined,
      action: record.action,
      targetType: record.targetType,
      targetId: record.targetId,
      metadata: record.metadata,
    }, client);
  }

  health(): { module: string; ready: boolean } {
    return { module: 'audit', ready: true };
  }

  async getTimeline(
    targetType: string,
    targetId: string,
    options: { page?: number; limit?: number } = {},
  ): Promise<AuditLog[]> {
    return this.repository.findTimeline(targetType, targetId, options);
  }
}
