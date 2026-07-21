import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { LeadershipArea } from "@prisma/client";
import { PrismaService } from "@database/prisma.service";
import { AuditService } from "../audit/services/audit.service";
import { CreateStaffAvailabilityDto, UpsertStaffAreaCoverageDto } from "./dto";

const identity = {
  id: true,
  discordUsername: true,
  discordNickname: true,
} as const;
const areas = Object.values(LeadershipArea);

@Injectable()
export class StaffCoverageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getWorkspace(actorId: string) {
    const now = new Date();
    const [rows, assignees, unavailability] = await Promise.all([
      this.prisma.staffAreaCoverage.findMany({
        include: {
          primaryUser: { select: identity },
          backupUser: { select: identity },
        },
        orderBy: { area: "asc" },
      }),
      this.prisma.user.findMany({
        where: {
          players: {
            some: {
              isActive: true,
              roles: { some: { role: { name: { in: ["STAFF", "ADMIN"] } } } },
            },
          },
        },
        select: identity,
        orderBy: { discordUsername: "asc" },
      }),
      this.prisma.staffAvailabilityPeriod.findMany({
        where: { endsAt: { gte: now } },
        include: { user: { select: identity } },
        orderBy: { startsAt: "asc" },
        take: 300,
      }),
    ]);
    const byArea = new Map(rows.map((row) => [row.area, row]));
    const activeUnavailable = new Set(
      unavailability
        .filter((period) => period.startsAt <= now && period.endsAt >= now)
        .map((period) => period.userId),
    );
    const coverage = areas.map((area) => {
      const row = byArea.get(area);
      const primaryUnavailable = Boolean(
        row?.primaryUserId && activeUnavailable.has(row.primaryUserId),
      );
      const backupUnavailable = Boolean(
        row?.backupUserId && activeUnavailable.has(row.backupUserId),
      );
      const effectiveResponsible = primaryUnavailable
        ? backupUnavailable
          ? null
          : (row?.backupUser ?? null)
        : (row?.primaryUser ?? null);
      return {
        area,
        configuration: row ?? null,
        primaryUnavailable,
        backupUnavailable,
        effectiveResponsible,
        escalationReason: primaryUnavailable ? "DECLARED_UNAVAILABILITY" : null,
        missingBackup: !row?.backupUserId,
        permissionChanged: false,
      };
    });
    return {
      generatedAt: now,
      coverage,
      assignees,
      declaredUnavailability: unavailability.map((period) => ({
        ...period,
        isMine: period.userId === actorId,
      })),
      escalationUsesDeclaredUnavailabilityOnly: true,
      silenceNeverTriggersEscalation: true,
      permissionsSeparateFromResponsibility: true,
      counts: {
        areasWithoutPrimary: coverage.filter(
          (item) => !item.configuration?.primaryUserId,
        ).length,
        areasWithoutBackup: coverage.filter((item) => item.missingBackup)
          .length,
      },
    };
  }

  async upsert(actorId: string, dto: UpsertStaffAreaCoverageDto) {
    const primaryUserId = dto.primaryUserId || null;
    const backupUserId = dto.backupUserId || null;
    if (primaryUserId) await this.requireStaff(primaryUserId);
    if (backupUserId) await this.requireStaff(backupUserId);
    if (primaryUserId && primaryUserId === backupUserId)
      throw new BadRequestException("Primary and backup must differ.");
    try {
      new Intl.DateTimeFormat("en", { timeZone: dto.timezone }).format();
    } catch {
      throw new BadRequestException("Invalid IANA timezone.");
    }
    const data = {
      primaryUserId,
      backupUserId,
      onCallStartsAt: dto.onCallStartsAt,
      onCallEndsAt: dto.onCallEndsAt,
      timezone: dto.timezone,
      updatedById: actorId,
    };
    const result = await this.prisma.staffAreaCoverage.upsert({
      where: { area: dto.area },
      create: { area: dto.area, ...data },
      update: data,
    });
    await this.audit.log({
      actorId,
      action: "STAFF_AREA_COVERAGE_UPDATED",
      targetType: "StaffAreaCoverage",
      targetId: result.id,
      metadata: {
        area: dto.area,
        primaryUserId,
        backupUserId,
        onCallWindow: `${dto.onCallStartsAt}-${dto.onCallEndsAt}`,
        timezone: dto.timezone,
        permissionChanged: false,
      },
    });
    return result;
  }

  async declareUnavailable(actorId: string, dto: CreateStaffAvailabilityDto) {
    await this.requireStaff(actorId);
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (endsAt <= startsAt)
      throw new BadRequestException("Availability end must be after start.");
    if (endsAt.getTime() - startsAt.getTime() > 90 * 86_400_000)
      throw new BadRequestException(
        "Declared unavailability cannot exceed 90 days.",
      );
    const result = await this.prisma.staffAvailabilityPeriod.create({
      data: {
        userId: actorId,
        startsAt,
        endsAt,
        reason: dto.reason?.trim() || null,
      },
    });
    await this.audit.log({
      actorId,
      action: "STAFF_UNAVAILABILITY_DECLARED",
      targetType: "StaffAvailabilityPeriod",
      targetId: result.id,
      metadata: {
        startsAt,
        endsAt,
        reasonProvided: Boolean(result.reason),
        changesPermissions: false,
      },
    });
    return result;
  }

  async removeDeclaration(actorId: string, id: string) {
    const period = await this.prisma.staffAvailabilityPeriod.findUnique({
      where: { id },
    });
    if (!period || period.userId !== actorId)
      throw new NotFoundException("Availability period not found.");
    await this.prisma.staffAvailabilityPeriod.delete({ where: { id } });
    await this.audit.log({
      actorId,
      action: "STAFF_UNAVAILABILITY_REMOVED",
      targetType: "StaffAvailabilityPeriod",
      targetId: id,
      metadata: { changesPermissions: false },
    });
    return { ok: true };
  }

  private async requireStaff(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        players: {
          some: {
            isActive: true,
            roles: { some: { role: { name: { in: ["STAFF", "ADMIN"] } } } },
          },
        },
      },
      select: { id: true },
    });
    if (!user)
      throw new BadRequestException(
        "Coverage participants must be active Staff.",
      );
  }
}
