import { BadRequestException, Injectable } from '@nestjs/common';
import { AuctionMode, BusinessRule, EventType, ItemTier, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { AuditService } from '../audit/services/audit.service';
import {
  AuctionTierRule,
  AuctionTierRules,
  EventRewardRules,
  PriorityScoreRules,
  StaffPendingThresholdRules,
  businessRuleDefaults,
  defaultAuctionTierRules,
  defaultEventRewardRules,
  defaultPriorityScoreRules,
  defaultStaffPendingThresholdRules,
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

  private async ensureDefaults(): Promise<void> {
    const count = await this.prisma.businessRule.count();

    if (count === 0) {
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

  private asRecord(value: unknown): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, unknown>;
  }
}
