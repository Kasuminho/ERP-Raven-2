import { BadRequestException, Injectable } from '@nestjs/common';
import { AuctionMode, BusinessRule, EventType, ItemTier, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { AuditService } from '../audit/services/audit.service';
import {
  AuctionTierRule,
  AuctionTierRules,
  AuctionDisputeRules,
  AttendanceEligibilityRules,
  DkpBidPolicyRules,
  EventRewardRules,
  PriorityScoreRules,
  StaffPendingThresholdRules,
  defaultAttendanceEligibilityRules,
  businessRuleDefaults,
  defaultAuctionDisputeRules,
  defaultAuctionTierRules,
  defaultDkpBidPolicyRules,
  defaultEventRewardRules,
  defaultMaintenanceModeRules,
  defaultPriorityScoreRules,
  defaultStaffPendingThresholdRules,
  MaintenanceModeRules,
} from './business-rules.defaults';

@Injectable()
export class BusinessRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listRules(): Promise<BusinessRule[]> {
    await this.ensureDefaults();

    return this.prisma.businessRule.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
  }

  async updateRule(key: string, value: unknown, actorId?: string): Promise<BusinessRule> {
    const definition = businessRuleDefaults.find((rule) => rule.key === key);

    if (!definition) {
      throw new BadRequestException(`Unknown business rule: ${key}`);
    }

    const previous = key === 'maintenanceMode'
      ? await this.getMaintenanceMode().catch(() => defaultMaintenanceModeRules)
      : undefined;
    const normalizedValue = this.normalizeRuleValue(key, value);
    const updated = await this.prisma.businessRule.upsert({
      where: { key },
      update: {
        value: normalizedValue,
        isActive: true,
        updatedBy: actorId ? { connect: { id: actorId } } : undefined,
      },
      create: {
        key,
        category: definition.category,
        label: definition.label,
        description: definition.description,
        value: normalizedValue,
        updatedBy: actorId ? { connect: { id: actorId } } : undefined,
      },
    });

    await this.auditService.log({
      actorId,
      action: 'BUSINESS_RULE_UPDATED',
      targetType: 'BusinessRule',
      targetId: updated.id,
      metadata: {
        key,
        category: updated.category,
        value: normalizedValue,
      },
    });

    if (key === 'maintenanceMode') {
      const current = normalizedValue as unknown as MaintenanceModeRules;
      if (previous?.enabled !== current.enabled) {
        await this.auditService.log({
          actorId,
          action: current.enabled ? 'MAINTENANCE_MODE_ENABLED' : 'MAINTENANCE_MODE_DISABLED',
          targetType: 'BusinessRule',
          targetId: updated.id,
          metadata: {
            key,
            enabled: current.enabled,
            message: current.message,
          },
        });
      }
    }

    return updated;
  }

  async resetRule(key: string, actorId?: string): Promise<BusinessRule> {
    const definition = businessRuleDefaults.find((rule) => rule.key === key);

    if (!definition) {
      throw new BadRequestException(`Unknown business rule: ${key}`);
    }

    return this.updateRule(key, definition.value, actorId);
  }

  async seedDefaults(actorId?: string): Promise<BusinessRule[]> {
    const rows: BusinessRule[] = [];

    for (const definition of businessRuleDefaults) {
      rows.push(await this.prisma.businessRule.upsert({
        where: { key: definition.key },
        update: {
          category: definition.category,
          label: definition.label,
          description: definition.description,
          isActive: true,
        },
        create: {
          key: definition.key,
          category: definition.category,
          label: definition.label,
          description: definition.description,
          value: definition.value as Prisma.InputJsonValue,
          updatedBy: actorId ? { connect: { id: actorId } } : undefined,
        },
      }));
    }

    return rows;
  }

  async getEventRewards(): Promise<EventRewardRules> {
    return this.mergeEventRewards(await this.getRuleValue('eventRewards'), defaultEventRewardRules);
  }

  async getEventReward(type: EventType): Promise<number> {
    const rewards = await this.getEventRewards();
    return rewards[type] ?? defaultEventRewardRules[type];
  }

  async getAuctionTierRules(): Promise<AuctionTierRules> {
    return this.mergeAuctionTierRules(await this.getRuleValue('auctionTierRules'), defaultAuctionTierRules);
  }

  async getAuctionTierRule(itemTier: ItemTier): Promise<AuctionTierRule> {
    const rules = await this.getAuctionTierRules();
    return rules[itemTier] ?? defaultAuctionTierRules[itemTier];
  }

  async getPriorityScoreRules(): Promise<PriorityScoreRules> {
    return this.mergePriorityScoreRules(await this.getRuleValue('priorityScore'), defaultPriorityScoreRules);
  }

  async getStaffPendingThresholds(): Promise<StaffPendingThresholdRules> {
    return this.mergeStaffPendingThresholds(await this.getRuleValue('staffPendingThresholds'), defaultStaffPendingThresholdRules);
  }

  async getMaintenanceMode(): Promise<MaintenanceModeRules> {
    return this.mergeMaintenanceMode(await this.getRuleValue('maintenanceMode'), defaultMaintenanceModeRules);
  }

  async getDkpBidPolicy(): Promise<DkpBidPolicyRules> {
    return this.mergeDkpBidPolicy(await this.getRuleValue('dkpBidPolicy'), defaultDkpBidPolicyRules);
  }

  async getAuctionDisputeRules(): Promise<AuctionDisputeRules> {
    return this.mergeAuctionDisputeRules(await this.getRuleValue('auctionDisputeRules'), defaultAuctionDisputeRules);
  }

  async getAttendanceEligibilityRules(): Promise<AttendanceEligibilityRules> {
    return this.mergeAttendanceEligibilityRules(await this.getRuleValue('attendanceEligibilityRules'), defaultAttendanceEligibilityRules);
  }

  private async ensureDefaults(): Promise<void> {
    const count = await this.prisma.businessRule.count();

    if (count < businessRuleDefaults.length) {
      await this.seedDefaults();
    }
  }

  private async getRuleValue(key: string): Promise<Prisma.JsonValue | undefined> {
    const row = await this.prisma.businessRule.findUnique({
      where: { key },
      select: { value: true, isActive: true },
    });

    if (!row?.isActive) {
      return undefined;
    }

    return row.value;
  }

  private normalizeRuleValue(key: string, value: unknown): Prisma.InputJsonValue {
    switch (key) {
      case 'eventRewards':
        return this.mergeEventRewards(value, defaultEventRewardRules) as Prisma.InputJsonValue;
      case 'auctionTierRules':
        return this.mergeAuctionTierRules(value, defaultAuctionTierRules) as Prisma.InputJsonValue;
      case 'priorityScore':
        return this.mergePriorityScoreRules(value, defaultPriorityScoreRules) as unknown as Prisma.InputJsonValue;
      case 'staffPendingThresholds':
        return this.mergeStaffPendingThresholds(value, defaultStaffPendingThresholdRules) as Prisma.InputJsonValue;
      case 'maintenanceMode':
        return this.mergeMaintenanceMode(value, defaultMaintenanceModeRules) as unknown as Prisma.InputJsonValue;
      case 'dkpBidPolicy':
        return this.mergeDkpBidPolicy(value, defaultDkpBidPolicyRules) as unknown as Prisma.InputJsonValue;
      case 'auctionDisputeRules':
        return this.mergeAuctionDisputeRules(value, defaultAuctionDisputeRules) as unknown as Prisma.InputJsonValue;
      case 'attendanceEligibilityRules':
        return this.mergeAttendanceEligibilityRules(value, defaultAttendanceEligibilityRules) as unknown as Prisma.InputJsonValue;
      default:
        throw new BadRequestException(`Unknown business rule: ${key}`);
    }
  }

  private mergeEventRewards(value: unknown, fallback: EventRewardRules): EventRewardRules {
    const input = this.asRecord(value);
    const output = { ...fallback };

    for (const type of Object.values(EventType)) {
      const amount = Number(input[type]);
      if (Number.isInteger(amount) && amount >= 0 && amount <= 10000) {
        output[type] = amount;
      }
    }

    return output;
  }

  private mergeAuctionTierRules(value: unknown, fallback: AuctionTierRules): AuctionTierRules {
    const input = this.asRecord(value);
    const output = { ...fallback };

    for (const tier of Object.values(ItemTier)) {
      const row = this.asRecord(input[tier]);
      const fallbackRule = fallback[tier];
      const auctionMode = Object.values(AuctionMode).includes(row.auctionMode as AuctionMode)
        ? row.auctionMode as AuctionMode
        : fallbackRule.auctionMode;
      const minimumBid = Number(row.minimumBid);
      const minimumLayer = Number(row.minimumLayer);

      output[tier] = {
        minimumBid: Number.isInteger(minimumBid) && minimumBid >= 0 ? minimumBid : fallbackRule.minimumBid,
        auctionMode,
        requiresStaffReview: typeof row.requiresStaffReview === 'boolean'
          ? row.requiresStaffReview
          : fallbackRule.requiresStaffReview,
        minimumLayer: Number.isInteger(minimumLayer) && minimumLayer >= 1 && minimumLayer <= 10
          ? minimumLayer
          : fallbackRule.minimumLayer,
      };
    }

    return output;
  }

  private mergePriorityScoreRules(value: unknown, fallback: PriorityScoreRules): PriorityScoreRules {
    const input = this.asRecord(value);

    return {
      layerWeight: this.numberOr(input.layerWeight, fallback.layerWeight),
      attendanceWeight: this.numberOr(input.attendanceWeight, fallback.attendanceWeight),
      bidDkpWeight: this.numberOr(input.bidDkpWeight, fallback.bidDkpWeight),
      classPriorityBonus: this.numberOr(input.classPriorityBonus, fallback.classPriorityBonus),
    };
  }

  private mergeStaffPendingThresholds(
    value: unknown,
    fallback: StaffPendingThresholdRules,
  ): StaffPendingThresholdRules {
    const input = this.asRecord(value);
    const output = { ...fallback };

    for (const [key, threshold] of Object.entries(fallback)) {
      const row = this.asRecord(input[key]);
      output[key] = {
        mediumAfterMs: this.numberOr(row.mediumAfterMs, threshold.mediumAfterMs),
        highAfterMs: this.numberOr(row.highAfterMs, threshold.highAfterMs),
      };
    }

    return output;
  }

  private numberOr(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }

  private mergeMaintenanceMode(value: unknown, fallback: MaintenanceModeRules): MaintenanceModeRules {
    const input = this.asRecord(value);
    const message = typeof input.message === 'string' && input.message.trim().length > 0
      ? input.message.trim().slice(0, 240)
      : fallback.message;

    return {
      enabled: typeof input.enabled === 'boolean' ? input.enabled : fallback.enabled,
      message,
    };
  }

  private mergeDkpBidPolicy(value: unknown, fallback: DkpBidPolicyRules): DkpBidPolicyRules {
    const input = this.asRecord(value);
    return {
      enabled: typeof input.enabled === 'boolean' ? input.enabled : fallback.enabled,
      minimumCost: this.boundedInteger(input.minimumCost, fallback.minimumCost, 0, 100000),
      winTaxPercent: this.boundedInteger(input.winTaxPercent, fallback.winTaxPercent, 0, 100),
      tierCaps: this.numberMap(input.tierCaps),
      itemTypeCaps: this.numberMap(input.itemTypeCaps),
      layerCaps: this.numberMap(input.layerCaps),
      fixedCostByTier: this.numberMap(input.fixedCostByTier),
      modeMultiplierPercent: this.numberMap(input.modeMultiplierPercent),
      sourceSimulationId: this.shortString(input.sourceSimulationId, 80),
      sourceSimulationName: this.shortString(input.sourceSimulationName, 120),
      promotedAt: this.shortString(input.promotedAt, 40),
      promotedById: this.shortString(input.promotedById, 80),
      reason: this.shortString(input.reason, 240),
    };
  }

  private mergeAuctionDisputeRules(value: unknown, fallback: AuctionDisputeRules): AuctionDisputeRules {
    const input = this.asRecord(value);
    return {
      enabled: typeof input.enabled === 'boolean' ? input.enabled : fallback.enabled,
      windowHours: this.boundedInteger(input.windowHours, fallback.windowHours, 1, 720),
    };
  }

  private mergeAttendanceEligibilityRules(
    value: unknown,
    fallback: AttendanceEligibilityRules,
  ): AttendanceEligibilityRules {
    const input = this.asRecord(value);
    return {
      bidMinimumPercent: this.boundedInteger(input.bidMinimumPercent, fallback.bidMinimumPercent, 0, 100),
      participationMinimumPercent: this.boundedInteger(
        input.participationMinimumPercent,
        fallback.participationMinimumPercent,
        0,
        100,
      ),
    };
  }

  private boundedInteger(value: unknown, fallback: number, min: number, max: number): number {
    const parsed = Math.trunc(Number(value));
    return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
  }

  private numberMap(value: unknown): Record<string, number> {
    const input = this.asRecord(value);
    const output: Record<string, number> = {};
    for (const [key, raw] of Object.entries(input)) {
      const parsed = Math.trunc(Number(raw));
      if (key.length <= 40 && Number.isInteger(parsed) && parsed >= 0 && parsed <= 100000) {
        output[key] = parsed;
      }
    }
    return output;
  }

  private shortString(value: unknown, maxLength: number): string | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized.slice(0, maxLength) : undefined;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, unknown>;
  }
}
