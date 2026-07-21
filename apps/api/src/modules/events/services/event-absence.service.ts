import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PlayerAbsenceReasonVisibility } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { AuditService } from '../../audit/services/audit.service';
import { UpsertPlayerAbsenceDto } from '../dto';

@Injectable()
export class EventAbsenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listMine(userId: string) {
    const player = await this.getPrimaryPlayer(userId);
    return this.prisma.playerAbsence.findMany({
      where: { playerId: player.id, endsAt: { gte: new Date() } },
      orderBy: [{ startsAt: 'asc' }, { endsAt: 'asc' }],
    });
  }

  async create(userId: string, dto: UpsertPlayerAbsenceDto) {
    const player = await this.getPrimaryPlayer(userId);
    const period = this.parsePeriod(dto);
    await this.assertNoOverlap(player.id, period.startsAt, period.endsAt);
    const absence = await this.prisma.playerAbsence.create({
      data: {
        playerId: player.id,
        ...period,
        reason: dto.reason,
        reasonVisibility: dto.reasonVisibility ?? PlayerAbsenceReasonVisibility.STAFF_ONLY,
      },
    });
    await this.auditService.log({
      actorId: userId,
      action: 'PLAYER_ABSENCE_CREATED',
      targetType: 'PlayerAbsence',
      targetId: absence.id,
      metadata: { playerId: player.id, startsAt: period.startsAt.toISOString(), endsAt: period.endsAt.toISOString(), reasonVisibility: absence.reasonVisibility },
    });
    return absence;
  }

  async update(absenceId: string, userId: string, dto: UpsertPlayerAbsenceDto) {
    const player = await this.getPrimaryPlayer(userId);
    const existing = await this.prisma.playerAbsence.findFirst({ where: { id: absenceId, playerId: player.id } });
    if (!existing) throw new NotFoundException(`Absence ${absenceId} was not found.`);
    const period = this.parsePeriod(dto);
    await this.assertNoOverlap(player.id, period.startsAt, period.endsAt, absenceId);
    const absence = await this.prisma.playerAbsence.update({
      where: { id: absenceId },
      data: {
        ...period,
        reason: dto.reason ?? null,
        reasonVisibility: dto.reasonVisibility ?? PlayerAbsenceReasonVisibility.STAFF_ONLY,
      },
    });
    await this.auditService.log({
      actorId: userId,
      action: 'PLAYER_ABSENCE_UPDATED',
      targetType: 'PlayerAbsence',
      targetId: absence.id,
      metadata: { playerId: player.id, startsAt: period.startsAt.toISOString(), endsAt: period.endsAt.toISOString(), reasonVisibility: absence.reasonVisibility },
    });
    return absence;
  }

  async remove(absenceId: string, userId: string): Promise<void> {
    const player = await this.getPrimaryPlayer(userId);
    const existing = await this.prisma.playerAbsence.findFirst({ where: { id: absenceId, playerId: player.id } });
    if (!existing) throw new NotFoundException(`Absence ${absenceId} was not found.`);
    await this.prisma.playerAbsence.delete({ where: { id: absenceId } });
    await this.auditService.log({
      actorId: userId,
      action: 'PLAYER_ABSENCE_REMOVED',
      targetType: 'PlayerAbsence',
      targetId: absenceId,
      metadata: { playerId: player.id, startsAt: existing.startsAt.toISOString(), endsAt: existing.endsAt.toISOString() },
    });
  }

  private parsePeriod(dto: UpsertPlayerAbsenceDto): { startsAt: Date; endsAt: Date } {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (endsAt <= startsAt) throw new BadRequestException('Absence end must be after its start.');
    if (endsAt <= new Date()) throw new BadRequestException('Absence must end in the future.');
    return { startsAt, endsAt };
  }

  private async assertNoOverlap(playerId: string, startsAt: Date, endsAt: Date, excludeId?: string): Promise<void> {
    const overlap = await this.prisma.playerAbsence.findFirst({
      where: {
        playerId,
        id: excludeId ? { not: excludeId } : undefined,
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
      select: { id: true },
    });
    if (overlap) throw new BadRequestException('Absence period overlaps another registered absence.');
  }

  private async getPrimaryPlayer(userId: string): Promise<{ id: string }> {
    const player = await this.prisma.player.findFirst({
      where: { userId, isActive: true },
      select: { id: true },
      orderBy: { joinedAt: 'asc' },
    });
    if (!player) throw new NotFoundException('Authenticated user does not have an active player profile.');
    return player;
  }
}
