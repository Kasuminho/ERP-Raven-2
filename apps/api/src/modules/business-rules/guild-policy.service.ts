import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GuildPolicyStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import type { GuildPolicyPublicWorkspace, GuildPolicySnapshot, GuildPolicySnapshotRule, GuildPolicyStaffWorkspace, GuildPolicyVersionRecord } from '@shared/types/policies';
import { AuditService } from '../audit/services/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateGuildPolicyDraftDto, UpdateGuildPolicyDraftDto } from './dto';
import { BusinessRulesService } from './business-rules.service';

const PUBLISHABLE_RULE_KEYS = new Set([
  'eventRewards',
  'auctionTierRules',
  'priorityScore',
  'dkpBidPolicy',
  'auctionDisputeRules',
  'attendanceEligibilityRules',
]);

const identitySelect = { id: true, discordUsername: true, discordNickname: true } as const;
const policyInclude = { createdBy: { select: identitySelect }, publishedBy: { select: identitySelect } } as const;

@Injectable()
export class GuildPolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessRules: BusinessRulesService,
    private readonly auditService: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async getPublicWorkspace(now = new Date(), userId?: string): Promise<GuildPolicyPublicWorkspace<Date>> {
    const rows = await this.prisma.guildPolicyVersion.findMany({
      where: { status: GuildPolicyStatus.PUBLISHED },
      include: policyInclude,
      orderBy: [{ effectiveAt: 'desc' }, { version: 'desc' }],
    });
    let receiptByPolicyId = new Map<string, { openedAt: Date | null; acknowledgedAt: Date | null }>();
    if (userId && rows.length > 0) {
      const player = await this.prisma.player.findFirst({ where: { userId, isActive: true }, select: { id: true }, orderBy: { joinedAt: 'asc' } });
      if (player) {
        const receipts = await this.prisma.guildPolicyReceipt.findMany({
          where: { playerId: player.id, policyId: { in: rows.map((row) => row.id) } },
          select: { policyId: true, openedAt: true, acknowledgedAt: true },
        });
        receiptByPolicyId = new Map(receipts.map((receipt) => [receipt.policyId, receipt]));
      }
    }
    const policies = rows.map((policy) => ({ ...this.toRecord(policy), myReceipt: receiptByPolicyId.get(policy.id) ?? null }));
    const current = policies.find((policy) => policy.effectiveAt <= now) ?? null;
    return {
      current,
      upcoming: policies.filter((policy) => policy.effectiveAt > now).sort((a, b) => a.effectiveAt.getTime() - b.effectiveAt.getTime()),
      history: policies.filter((policy) => policy.effectiveAt <= now && policy.id !== current?.id),
    };
  }

  async getStaffWorkspace(now = new Date()): Promise<GuildPolicyStaffWorkspace<Date>> {
    const [publicWorkspace, drafts, operationalSnapshot, activePlayers] = await Promise.all([
      this.getPublicWorkspace(now),
      this.prisma.guildPolicyVersion.findMany({
        where: { status: GuildPolicyStatus.DRAFT },
        include: policyInclude,
        orderBy: { updatedAt: 'desc' },
      }),
      this.captureOperationalSnapshot(),
      this.prisma.player.findMany({ where: { isActive: true }, select: { id: true, nickname: true }, orderBy: { nickname: 'asc' } }),
    ]);
    const coveragePolicies = [publicWorkspace.current, ...publicWorkspace.upcoming, ...publicWorkspace.history].filter((policy): policy is NonNullable<typeof policy> => Boolean(policy));
    const receipts = coveragePolicies.length > 0 ? await this.prisma.guildPolicyReceipt.findMany({
      where: { policyId: { in: coveragePolicies.map((policy) => policy.id) }, playerId: { in: activePlayers.map((player) => player.id) } },
      select: { policyId: true, playerId: true, openedAt: true, acknowledgedAt: true },
    }) : [];
    const drift = this.buildDiff(publicWorkspace.current?.snapshot, operationalSnapshot);
    return {
      ...publicWorkspace,
      drafts: drafts.map((policy) => this.toRecord(policy)),
      operationalSnapshot,
      operationalDriftPt: drift.pt,
      operationalDriftEn: drift.en,
      coverage: coveragePolicies.map((policy) => {
        const policyReceipts = receipts.filter((receipt) => receipt.policyId === policy.id);
        const byPlayer = new Map(policyReceipts.map((receipt) => [receipt.playerId, receipt]));
        return {
          policyId: policy.id,
          version: policy.version,
          activePlayers: activePlayers.length,
          opened: activePlayers.filter((player) => byPlayer.get(player.id)?.openedAt).length,
          acknowledged: activePlayers.filter((player) => byPlayer.get(player.id)?.acknowledgedAt).length,
          unopened: activePlayers.filter((player) => !byPlayer.get(player.id)?.openedAt).map((player) => ({ playerId: player.id, nickname: player.nickname })),
        };
      }),
    };
  }

  async createDraft(dto: CreateGuildPolicyDraftDto, actorId: string) {
    if (dto.isEmergency && (!dto.emergencyReason || dto.emergencyReason.trim().length < 5)) {
      throw new BadRequestException('Emergency policy changes require a reason.');
    }
    const snapshot = await this.captureOperationalSnapshot();
    const draft = await this.prisma.guildPolicyVersion.create({
      data: {
        titlePt: dto.titlePt.trim(),
        titleEn: dto.titleEn.trim(),
        summaryPt: dto.summaryPt.trim(),
        summaryEn: dto.summaryEn.trim(),
        effectiveAt: new Date(dto.effectiveAt),
        isEmergency: dto.isEmergency ?? false,
        emergencyReason: dto.isEmergency ? dto.emergencyReason?.trim() : null,
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
        createdById: actorId,
      },
      include: policyInclude,
    });
    await this.auditService.log({
      actorId,
      action: 'GUILD_POLICY_DRAFT_CREATED',
      targetType: 'GuildPolicyVersion',
      targetId: draft.id,
      metadata: { effectiveAt: draft.effectiveAt.toISOString(), snapshotRuleKeys: snapshot.rules.map((rule) => rule.key) },
    });
    return draft;
  }

  async updateDraft(policyId: string, dto: UpdateGuildPolicyDraftDto, actorId: string) {
    const draft = await this.requireDraft(policyId);
    const nextEmergency = dto.isEmergency ?? draft.isEmergency;
    const nextReason = dto.emergencyReason?.trim() ?? draft.emergencyReason;
    if (nextEmergency && (!nextReason || nextReason.length < 5)) throw new BadRequestException('Emergency policy changes require a reason.');
    const updated = await this.prisma.guildPolicyVersion.update({
      where: { id: policyId },
      data: {
        titlePt: dto.titlePt?.trim(),
        titleEn: dto.titleEn?.trim(),
        summaryPt: dto.summaryPt?.trim(),
        summaryEn: dto.summaryEn?.trim(),
        effectiveAt: dto.effectiveAt ? new Date(dto.effectiveAt) : undefined,
        isEmergency: dto.isEmergency,
        emergencyReason: nextEmergency ? nextReason : null,
      },
      include: policyInclude,
    });
    await this.auditService.log({ actorId, action: 'GUILD_POLICY_DRAFT_UPDATED', targetType: 'GuildPolicyVersion', targetId: policyId });
    return updated;
  }

  async refreshDraftSnapshot(policyId: string, actorId: string) {
    await this.requireDraft(policyId);
    const snapshot = await this.captureOperationalSnapshot();
    const updated = await this.prisma.guildPolicyVersion.update({
      where: { id: policyId },
      data: { snapshot: snapshot as unknown as Prisma.InputJsonValue },
      include: policyInclude,
    });
    await this.auditService.log({
      actorId,
      action: 'GUILD_POLICY_DRAFT_SNAPSHOT_REFRESHED',
      targetType: 'GuildPolicyVersion',
      targetId: policyId,
      metadata: { snapshotRuleKeys: snapshot.rules.map((rule) => rule.key) },
    });
    return updated;
  }

  async publish(policyId: string, actorId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const draft = await tx.guildPolicyVersion.findUnique({ where: { id: policyId } });
      if (!draft) throw new NotFoundException('Guild policy draft not found.');
      if (draft.status !== GuildPolicyStatus.DRAFT) throw new BadRequestException('Published policies are immutable.');
      const previous = await tx.guildPolicyVersion.findFirst({
        where: { status: GuildPolicyStatus.PUBLISHED },
        orderBy: { version: 'desc' },
      });
      const aggregate = await tx.guildPolicyVersion.aggregate({ _max: { version: true } });
      const diff = this.buildDiff(previous?.snapshot, draft.snapshot);
      if (draft.isEmergency && (!draft.emergencyReason || draft.emergencyReason.trim().length < 5)) {
        throw new BadRequestException('Emergency policy changes require a reason.');
      }
      const published = await tx.guildPolicyVersion.update({
        where: { id: policyId },
        data: {
          status: GuildPolicyStatus.PUBLISHED,
          version: (aggregate._max.version ?? 0) + 1,
          publishedAt: new Date(),
          publishedById: actorId,
          diffPt: diff.pt,
          diffEn: diff.en,
        },
        include: policyInclude,
      });
      const players = await tx.player.findMany({ where: { isActive: true }, select: { id: true } });
      if (players.length > 0) {
        await tx.guildPolicyReceipt.createMany({
          data: players.map((player) => ({ policyId: published.id, playerId: player.id })),
          skipDuplicates: true,
        });
      }
      return { published, playerIds: players.map((player) => player.id) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    const published = result.published;
    const notificationResults = await Promise.allSettled(result.playerIds.map((playerId) => this.notifications.createForPlayer({
      playerId,
      type: published.isEmergency ? 'GUILD_POLICY_EMERGENCY' : 'GUILD_POLICY_PUBLISHED',
      title: published.isEmergency ? 'Mudanca emergencial / Emergency policy change' : 'Nova politica / New policy',
      body: `PT-BR: ${published.titlePt}. ${published.summaryPt} EN: ${published.titleEn}. ${published.summaryEn}`,
      href: '/dashboard/rules',
      metadata: { policyId: published.id, version: published.version, effectiveAt: published.effectiveAt.toISOString(), isEmergency: published.isEmergency },
      deduplicationKey: `guild-policy:${published.id}:${playerId}`,
    })));
    const notificationFailures = notificationResults.filter((delivery) => delivery.status === 'rejected').length;
    await this.auditService.log({
      actorId,
      action: 'GUILD_POLICY_VERSION_PUBLISHED',
      targetType: 'GuildPolicyVersion',
      targetId: published.id,
      metadata: {
        version: published.version,
        effectiveAt: published.effectiveAt.toISOString(),
        receiptCount: result.playerIds.length,
        notificationFailures,
      },
    });
    return published;
  }

  async markOpened(policyId: string, userId: string) {
    const [player, policy] = await Promise.all([this.getActivePlayer(userId), this.requirePublished(policyId)]);
    const existing = await this.prisma.guildPolicyReceipt.findUnique({ where: { policyId_playerId: { policyId, playerId: player.id } } });
    if (existing?.openedAt) return existing;
    const receipt = await this.prisma.guildPolicyReceipt.upsert({
      where: { policyId_playerId: { policyId, playerId: player.id } },
      create: { policyId, playerId: player.id, openedAt: new Date() },
      update: { openedAt: new Date() },
    });
    await this.auditService.log({ actorId: userId, action: 'GUILD_POLICY_OPENED', targetType: 'GuildPolicyVersion', targetId: policy.id, metadata: { playerId: player.id, version: policy.version } });
    return receipt;
  }

  async acknowledge(policyId: string, userId: string) {
    const [player, policy] = await Promise.all([this.getActivePlayer(userId), this.requirePublished(policyId)]);
    const existing = await this.prisma.guildPolicyReceipt.findUnique({ where: { policyId_playerId: { policyId, playerId: player.id } } });
    if (existing?.acknowledgedAt) return existing;
    const now = new Date();
    const receipt = await this.prisma.guildPolicyReceipt.upsert({
      where: { policyId_playerId: { policyId, playerId: player.id } },
      create: { policyId, playerId: player.id, openedAt: now, acknowledgedAt: now },
      update: { openedAt: now, acknowledgedAt: now },
    });
    await this.auditService.log({ actorId: userId, action: 'GUILD_POLICY_ACKNOWLEDGED', targetType: 'GuildPolicyVersion', targetId: policy.id, metadata: { playerId: player.id, version: policy.version, legalAgreement: false } });
    return receipt;
  }

  private async captureOperationalSnapshot(): Promise<GuildPolicySnapshot> {
    const rules = await this.businessRules.listRules();
    return {
      rules: rules
        .filter((rule) => PUBLISHABLE_RULE_KEYS.has(rule.key))
        .map((rule) => ({
          key: rule.key,
          category: rule.category,
          label: rule.label,
          description: rule.description,
          value: rule.value,
        })),
    };
  }

  private async requireDraft(policyId: string) {
    const policy = await this.prisma.guildPolicyVersion.findUnique({ where: { id: policyId } });
    if (!policy) throw new NotFoundException('Guild policy draft not found.');
    if (policy.status !== GuildPolicyStatus.DRAFT) throw new BadRequestException('Published policies are immutable.');
    return policy;
  }

  private async requirePublished(policyId: string) {
    const policy = await this.prisma.guildPolicyVersion.findUnique({ where: { id: policyId } });
    if (!policy || policy.status !== GuildPolicyStatus.PUBLISHED) throw new NotFoundException('Published guild policy not found.');
    return policy;
  }

  private async getActivePlayer(userId: string) {
    const player = await this.prisma.player.findFirst({ where: { userId, isActive: true }, select: { id: true }, orderBy: { joinedAt: 'asc' } });
    if (!player) throw new NotFoundException('Authenticated user does not have an active player profile.');
    return player;
  }

  private buildDiff(previousValue: Prisma.JsonValue | GuildPolicySnapshot | undefined, currentValue: Prisma.JsonValue | GuildPolicySnapshot) {
    const previous = this.readSnapshot(previousValue);
    const current = this.readSnapshot(currentValue);
    if (previous.rules.length === 0) {
      return {
        pt: ['Primeira versao publicada: este snapshot passa a ser a referencia comprovavel.'],
        en: ['First published version: this snapshot becomes the verifiable reference.'],
      };
    }
    const previousByKey = new Map(previous.rules.map((rule) => [rule.key, rule]));
    const lines: Array<{ label: string; path: string; before: unknown; after: unknown }> = [];
    for (const rule of current.rules) {
      const oldRule = previousByKey.get(rule.key);
      this.compareValue(rule.label, rule.key, oldRule?.value, rule.value, lines);
      previousByKey.delete(rule.key);
    }
    for (const removed of previousByKey.values()) lines.push({ label: removed.label, path: removed.key, before: removed.value, after: undefined });
    if (lines.length === 0) return { pt: ['Nenhuma regra publicavel mudou.'], en: ['No publishable rule changed.'] };
    return {
      pt: lines.slice(0, 120).map((line) => `Alterado: ${line.label} (${line.path}), de ${this.display(line.before)} para ${this.display(line.after)}.`),
      en: lines.slice(0, 120).map((line) => `Changed: ${line.path} (${line.label}), from ${this.display(line.before)} to ${this.display(line.after)}.`),
    };
  }

  private compareValue(label: string, path: string, before: unknown, after: unknown, output: Array<{ label: string; path: string; before: unknown; after: unknown }>) {
    if (this.isRecord(before) && this.isRecord(after)) {
      for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
        this.compareValue(label, `${path}.${key}`, before[key], after[key], output);
      }
      return;
    }
    if (JSON.stringify(before) !== JSON.stringify(after)) output.push({ label, path, before, after });
  }

  private readSnapshot(value: Prisma.JsonValue | GuildPolicySnapshot | undefined): GuildPolicySnapshot {
    const record = this.isRecord(value) ? value : undefined;
    if (!record || !Array.isArray(record.rules)) return { rules: [] };
    const rules = record.rules.flatMap((rule): GuildPolicySnapshotRule[] => {
      if (!this.isRecord(rule) || typeof rule.key !== 'string' || typeof rule.label !== 'string') return [];
      return [{
        key: rule.key,
        category: typeof rule.category === 'string' ? rule.category : 'unknown',
        label: rule.label,
        description: typeof rule.description === 'string' ? rule.description : null,
        value: rule.value,
      }];
    });
    return { rules };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  }

  private toRecord(policy: {
    id: string;
    version: number | null;
    status: GuildPolicyStatus;
    titlePt: string;
    titleEn: string;
    summaryPt: string;
    summaryEn: string;
    effectiveAt: Date;
    isEmergency: boolean;
    emergencyReason: string | null;
    snapshot: Prisma.JsonValue;
    diffPt: Prisma.JsonValue;
    diffEn: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
    publishedAt: Date | null;
    createdBy: { id: string; discordUsername: string; discordNickname: string | null };
    publishedBy: { id: string; discordUsername: string; discordNickname: string | null } | null;
  }): GuildPolicyVersionRecord<Date> {
    return {
      ...policy,
      snapshot: this.readSnapshot(policy.snapshot),
      diffPt: this.readStringArray(policy.diffPt),
      diffEn: this.readStringArray(policy.diffEn),
    };
  }

  private readStringArray(value: Prisma.JsonValue): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }

  private display(value: unknown) {
    if (value === undefined) return '-';
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    return text.length > 100 ? `${text.slice(0, 97)}...` : text;
  }
}
