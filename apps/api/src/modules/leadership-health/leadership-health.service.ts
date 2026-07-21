import { Injectable } from "@nestjs/common";
import { LeadershipArea } from "@prisma/client";
import { PrismaService } from "@database/prisma.service";
import { AuditService } from "../audit/services/audit.service";
import { CreateLeadershipCheckInDto } from "./dto";
const AREAS = Object.values(LeadershipArea);
const identity = {
  id: true,
  discordUsername: true,
  discordNickname: true,
} as const;
@Injectable()
export class LeadershipHealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}
  async createCheckIn(userId: string, dto: CreateLeadershipCheckInDto) {
    const row = await this.prisma.leadershipCheckIn.create({
      data: {
        userId,
        area: dto.area,
        workload: dto.workload,
        availableOnCall: dto.availableOnCall,
        note: dto.note?.trim() || null,
      },
    });
    await this.audit.log({
      actorId: userId,
      action: "LEADERSHIP_HEALTH_CHECKED_IN",
      targetType: "LeadershipCheckIn",
      targetId: row.id,
      metadata: {
        area: dto.area,
        workload: dto.workload,
        availableOnCall: dto.availableOnCall,
        automaticAction: false,
      },
    });
    return row;
  }
  async getWorkspace() {
    const since = new Date(Date.now() - 14 * 86400000);
    const [rows, audits] = await Promise.all([
      this.prisma.leadershipCheckIn.findMany({
        where: { createdAt: { gte: since } },
        include: { user: { select: identity } },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.auditLog.findMany({
        where: { createdAt: { gte: since }, actorId: { not: null } },
        select: { actorId: true, action: true, targetType: true },
        take: 5000,
      }),
    ]);
    const latest = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      const key = `${row.userId}:${row.area}`;
      if (!latest.has(key)) latest.set(key, row);
    }
    const current = [...latest.values()];
    const areaCoverage = AREAS.map((area) => {
      const available = current.filter(
        (x) => x.area === area && x.availableOnCall,
      );
      return {
        area,
        availableCount: available.length,
        available: available.map((x) => x.user),
        withoutSubstitute: available.length <= 1,
      };
    });
    const activity = new Map<string, number>();
    for (const row of audits) {
      const area = this.areaFor(row.action, row.targetType);
      if (!area) continue;
      const key = `${area}:${row.actorId}`;
      activity.set(key, (activity.get(key) ?? 0) + 1);
    }
    const concentration = AREAS.map((area) => {
      const entries = [...activity]
        .filter(([key]) => key.startsWith(`${area}:`))
        .map(([key, count]) => ({ userId: key.slice(area.length + 1), count }));
      const total = entries.reduce((sum, x) => sum + x.count, 0);
      const leader = entries.sort((a, b) => b.count - a.count)[0];
      return {
        area,
        totalActions: total,
        leaderUserId: leader?.userId ?? null,
        leaderActions: leader?.count ?? 0,
        leaderShare: total && leader ? leader.count / total : 0,
        concentrated: Boolean(
          total >= 5 && leader && leader.count / total >= 0.6,
        ),
      };
    });
    const alerts = [
      ...current
        .filter((x) => x.workload >= 4)
        .map((x) => ({
          key: `overload:${x.userId}:${x.area}`,
          area: x.area,
          kind: "HIGH_WORKLOAD",
          facts: {
            workload: x.workload,
            availableOnCall: x.availableOnCall,
            checkedAt: x.createdAt,
          },
          recommendation:
            "Delegar, reduzir escopo ou pausar antes de pedir mais atividade.",
          automaticAction: false,
        })),
      ...areaCoverage
        .filter((x) => x.withoutSubstitute)
        .map((x) => ({
          key: `coverage:${x.area}`,
          area: x.area,
          kind: "NO_SUBSTITUTE",
          facts: { availableCount: x.availableCount },
          recommendation:
            "Nomear backup voluntario ou reduzir o plantao da area.",
          automaticAction: false,
        })),
      ...concentration
        .filter((x) => x.concentrated)
        .map((x) => ({
          key: `concentration:${x.area}`,
          area: x.area,
          kind: "TASK_CONCENTRATION",
          facts: {
            totalActions: x.totalActions,
            leaderActions: x.leaderActions,
            leaderShare: Math.round(x.leaderShare * 100),
          },
          recommendation:
            "Distribuir contexto e preparar handoff; nao cobrar mais do mesmo responsavel.",
          automaticAction: false,
        })),
    ];
    return {
      window: { startsAt: since, endsAt: new Date(), days: 14 },
      currentCheckIns: current,
      areaCoverage,
      concentration,
      alerts,
      automaticEscalation: false,
      permissionsChanged: false,
    };
  }
  private areaFor(action: string, targetType: string): LeadershipArea | null {
    const text = `${action} ${targetType}`.toUpperCase();
    if (/EVENT|ATTENDANCE|RSVP|WAR_ROOM/.test(text))
      return LeadershipArea.EVENTS;
    if (/AUCTION|BID|DROP|ITEM_REQUEST|WISHLIST/.test(text))
      return LeadershipArea.LOOT;
    if (/RECRUIT|ONBOARD|TRIAL|MENTOR/.test(text))
      return LeadershipArea.RECRUITMENT;
    if (/DISCORD|WEBHOOK|ANNOUNCEMENT/.test(text))
      return LeadershipArea.DISCORD;
    if (/DEPLOY|HEALTH|BACKUP|MAINTENANCE/.test(text))
      return LeadershipArea.DEPLOY;
    if (/DKP|DAOSHI|DIAMOND|TREASUR/.test(text)) return LeadershipArea.TREASURY;
    if (/PLAYER|CASE|POLICY|RULE/.test(text)) return LeadershipArea.PLAYER_CARE;
    return null;
  }
}
