import { Injectable } from "@nestjs/common";
import { EventStatus } from "@prisma/client";
import { PrismaService } from "@database/prisma.service";
type Signal = {
  key: string;
  kind: string;
  subjectType: "PLAYER" | "COHORT";
  subjectId: string;
  subjectLabel: string;
  facts: Array<{ label: string; value: string | number }>;
  window: { startsAt: Date; endsAt: Date; label: string };
  explanation: string;
  href: string;
  recommendedAction: string;
  automaticAction: false;
  affectsLoot: false;
  loyaltyScore: null;
};
@Injectable()
export class GuildHealthService {
  constructor(private readonly prisma: PrismaService) {}
  async getSignals() {
    const now = new Date();
    const d15 = new Date(now.getTime() - 15 * 86400000);
    const d30 = new Date(now.getTime() - 30 * 86400000);
    const d14 = new Date(now.getTime() - 14 * 86400000);
    const [players, events, attendances, plans, rsvpLogs, reactivations] =
      await Promise.all([
        this.prisma.player.findMany({
          where: { isActive: true },
          select: { id: true, nickname: true, class: true, joinedAt: true },
        }),
        this.prisma.event.findMany({
          where: {
            status: EventStatus.FINALIZED,
            startsAt: { gte: d30, lte: now },
          },
          select: { id: true, startsAt: true },
        }),
        this.prisma.eventAttendance.findMany({
          where: {
            event: {
              status: EventStatus.FINALIZED,
              startsAt: { gte: d30, lte: now },
            },
          },
          select: { playerId: true, eventId: true, attended: true },
        }),
        this.prisma.playerOnboardingPlan.findMany({
          where: { completedAt: null },
          select: {
            id: true,
            playerId: true,
            dueAt: true,
            startedAt: true,
            steps: { select: { updatedAt: true, completedAt: true } },
          },
        }),
        this.prisma.auditLog.findMany({
          where: { action: "EVENT_RSVP_UPDATED", createdAt: { gte: d30 } },
          select: { targetId: true, metadata: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        }),
        this.prisma.auditLog.findMany({
          where: { action: "PLAYER_REACTIVATED", createdAt: { gte: d30 } },
          select: { targetId: true, createdAt: true },
        }),
      ]);
    const signals: Signal[] = [];
    const byPlayer = new Map(players.map((p) => [p.id, p]));
    const eventsCurrent = events.filter((e) => e.startsAt >= d15);
    const eventsPrevious = events.filter((e) => e.startsAt < d15);
    const attMap = new Map(
      attendances.map((a) => [`${a.playerId}:${a.eventId}`, a.attended]),
    );
    for (const player of players) {
      const eligible = (list: typeof events) =>
        list.filter((e) => e.startsAt >= player.joinedAt);
      const current = eligible(eventsCurrent),
        previous = eligible(eventsPrevious);
      const currentRate = current.length
        ? current.filter((e) => attMap.get(`${player.id}:${e.id}`)).length /
          current.length
        : null;
      const previousRate = previous.length
        ? previous.filter((e) => attMap.get(`${player.id}:${e.id}`)).length /
          previous.length
        : null;
      if (
        currentRate !== null &&
        previousRate !== null &&
        current.length >= 2 &&
        previous.length >= 2 &&
        previousRate - currentRate >= 0.25
      )
        signals.push(
          this.signal(
            `participation-drop:${player.id}`,
            "PARTICIPATION_DROP",
            player.id,
            player.nickname,
            [
              {
                label: "participacao_ultimos_15d",
                value: `${Math.round(currentRate * 100)}%`,
              },
              {
                label: "participacao_15d_anteriores",
                value: `${Math.round(previousRate * 100)}%`,
              },
              {
                label: "eventos_por_janela",
                value: `${current.length}/${previous.length}`,
              },
            ],
            d30,
            now,
            "30 dias comparados em duas janelas de 15",
            "Queda de pelo menos 25 pontos percentuais, com dois ou mais eventos em cada janela.",
            "/dashboard/staff/players/" + player.id,
            "Conversar e confirmar contexto antes de qualquer conclusao.",
          ),
        );
    }
    for (const plan of plans) {
      const player = byPlayer.get(plan.playerId);
      if (!player) continue;
      const lastProgress =
        plan.steps
          .filter((s) => s.completedAt)
          .map((s) => s.updatedAt)
          .sort((a, b) => b.getTime() - a.getTime())[0] ?? plan.startedAt;
      if (lastProgress <= d14 || plan.dueAt < now)
        signals.push(
          this.signal(
            `onboarding-stalled:${player.id}`,
            "ONBOARDING_STALLED",
            player.id,
            player.nickname,
            [
              { label: "ultimo_progresso", value: lastProgress.toISOString() },
              { label: "prazo", value: plan.dueAt.toISOString() },
              {
                label: "dias_sem_progresso",
                value: Math.floor(
                  (now.getTime() - lastProgress.getTime()) / 86400000,
                ),
              },
            ],
            d14,
            now,
            "14 dias",
            "Plano incompleto sem progresso recente ou com prazo vencido.",
            "/dashboard/staff/onboarding",
            "Oferecer ajuda e remover bloqueios; atraso nao e punicao.",
          ),
        );
    }
    const lastByRsvp = new Map<string, string>();
    const cancelled = new Map<string, number>();
    for (const log of rsvpLogs) {
      const meta = (log.metadata ?? {}) as Record<string, unknown>;
      const id = log.targetId ?? "";
      const status = String(meta.status ?? "");
      const playerId = String(meta.playerId ?? "");
      if (lastByRsvp.get(id) === "CONFIRMED" && status !== "CONFIRMED")
        cancelled.set(playerId, (cancelled.get(playerId) ?? 0) + 1);
      lastByRsvp.set(id, status);
    }
    for (const [playerId, count] of cancelled) {
      if (count < 2) continue;
      const p = byPlayer.get(playerId);
      if (p)
        signals.push(
          this.signal(
            `commitment-cancelled:${playerId}`,
            "CONFIRMATIONS_CANCELLED",
            playerId,
            p.nickname,
            [{ label: "confirmacoes_revertidas", value: count }],
            d30,
            now,
            "30 dias",
            "Duas ou mais mudancas de CONFIRMED para outro status na trilha auditada.",
            "/dashboard/admin/events",
            "Perguntar sobre horario/carga e ajustar compromissos futuros.",
          ),
        );
    }
    for (const log of reactivations) {
      const p = log.targetId ? byPlayer.get(log.targetId) : null;
      if (p)
        signals.push(
          this.signal(
            `returned:${p.id}`,
            "RETURNED_MEMBER",
            p.id,
            p.nickname,
            [{ label: "reativado_em", value: log.createdAt.toISOString() }],
            d30,
            now,
            "30 dias",
            "Player retornou de inatividade na janela.",
            "/dashboard/staff/players/" + p.id,
            "Fazer acolhimento de retorno e revisar mudancas ocorridas.",
          ),
        );
    }
    const classes = new Map<string, typeof players>();
    for (const p of players)
      classes.set(p.class, [...(classes.get(p.class) ?? []), p]);
    for (const [klass, members] of classes) {
      if (members.length < 3) continue;
      const withAttendance = new Set(
        attendances
          .filter((a) => a.attended && members.some((m) => m.id === a.playerId))
          .map((a) => a.playerId),
      ).size;
      const rate = withAttendance / members.length;
      if (rate < 0.25)
        signals.push(
          this.signal(
            `isolated-class:${klass}`,
            "ISOLATED_COHORT",
            klass,
            klass,
            [
              { label: "membros_ativos", value: members.length },
              { label: "membros_com_presenca_30d", value: withAttendance },
              { label: "cobertura", value: `${Math.round(rate * 100)}%` },
            ],
            d30,
            now,
            "30 dias",
            "Coorte de classe com ao menos 3 ativos e menos de 25% deles presentes em eventos.",
            "/dashboard/staff/players",
            "Revisar horarios, composicao e canais; nao inferir desengajamento individual.",
            "COHORT",
          ),
        );
    }
    return {
      generatedAt: now,
      signals,
      signalCount: signals.length,
      loyaltyScore: null,
      automaticRemoval: false,
      automaticLootEffect: false,
      automaticBlocking: false,
    };
  }
  private signal(
    key: string,
    kind: string,
    subjectId: string,
    subjectLabel: string,
    facts: Signal["facts"],
    startsAt: Date,
    endsAt: Date,
    label: string,
    explanation: string,
    href: string,
    recommendedAction: string,
    subjectType: Signal["subjectType"] = "PLAYER",
  ): Signal {
    return {
      key,
      kind,
      subjectId,
      subjectLabel,
      subjectType,
      facts,
      window: { startsAt, endsAt, label },
      explanation,
      href,
      recommendedAction,
      automaticAction: false,
      affectsLoot: false,
      loyaltyScore: null,
    };
  }
}
