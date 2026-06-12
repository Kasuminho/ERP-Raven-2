import { Injectable } from '@nestjs/common';
import { Auction, ItemTier, ItemType, Player, PlayerClass, Prisma } from '@prisma/client';
import { AuditService } from '../../audit/services/audit.service';
import { DkpService } from '../../dkp/services/dkp.service';
import {
  EligibilityValidationResponseDto,
  PriorityResponseDto,
  RankingResponseDto,
} from '../dto';
import {
  EligibilityAuctionNotFoundException,
  EligibilityPlayerNotFoundException,
  ForcedApprovalRejectedException,
} from '../exceptions/eligibility-domain.exceptions';
import { EligibilityRepository } from '../repositories/eligibility.repository';

type EligibilityRuleConfig = {
  minimumLayer: number;
  minimumDKP: number;
  requiresStaffReview: boolean;
  progressiveLayerFallback: boolean;
  classCompatibilityRequired: boolean;
  automaticWinnerAllowed: boolean;
};

type PriorityScoreConfig = {
  layerWeight: number;
  attendanceWeight: number;
  availableDkpWeight: number;
  classPriorityBonus: number;
};

type ClassCompatibilityResult = {
  compatible: boolean;
  reason: string;
};

@Injectable()
export class EligibilityService {
  private readonly priorityScoreConfig: PriorityScoreConfig = {
    layerWeight: 100,
    attendanceWeight: 5,
    availableDkpWeight: 0.25,
    classPriorityBonus: 10000,
  };

  private readonly weaponClassKeywords: Record<PlayerClass, string[]> = {
    [PlayerClass.ASSASSIN]: ['adagas', 'daggers'],
    [PlayerClass.NIGHT_RANGER]: ['arco', 'bow'],
    [PlayerClass.DESTROYER]: ['besta', 'crossbow'],
    [PlayerClass.GUNSLINGER]: ['pistolas', 'handgun'],
    [PlayerClass.BERSERKER]: ['grande espada', 'greatsword'],
    [PlayerClass.VANGUARD]: ['lamina de egide', 'aegisblade'],
    [PlayerClass.ELEMENTALIST]: ['esfera elemental', 'elemental sphere'],
    [PlayerClass.DEATHBRINGER]: ['varinha magica', 'hexing wand'],
    [PlayerClass.DIVINE_CASTER]: ['cajado', 'staff'],
    [PlayerClass.WARLORD]: [],
  };

  constructor(
    private readonly repository: EligibilityRepository,
    private readonly dkpService: DkpService,
    private readonly auditService: AuditService,
  ) {}

  health(): { module: string; ready: boolean } {
    return this.repository.health();
  }

  async canPlayerBid(playerId: string, auctionId: string): Promise<EligibilityValidationResponseDto> {
    const result = await this.repository.client.$transaction((tx) =>
      this.canPlayerBidWithinTransaction(playerId, auctionId, tx),
    );

    if (!result.canBid) {
      await this.audit('ELIGIBILITY_FAILURE', 'Auction', auctionId, undefined, {
        playerId,
        reason: result.eligibilityReason,
      });
    }

    return result;
  }

  async canPlayerBidWithinTransaction(
    playerId: string,
    auctionId: string,
    client: Prisma.TransactionClient,
  ): Promise<EligibilityValidationResponseDto> {
    const { auction, player } = await this.getAuctionAndPlayer(playerId, auctionId, client);
    const rules = await this.getEffectiveRules(auction, client);

    if (!player.isActive) {
      return this.ineligible(playerId, auctionId, auction.requiresStaffReview, 'Player is not active.');
    }

    if (!this.isValidLayer(player.dimensionalLayer)) {
      return this.ineligible(playerId, auctionId, rules.requiresStaffReview, 'Player dimensional layer is outside 1-10.');
    }

    const classCompatibility = this.validateClassCompatibility(player, auction);

    if (!classCompatibility.compatible) {
      return this.ineligible(playerId, auctionId, rules.requiresStaffReview, classCompatibility.reason);
    }

    if (player.dimensionalLayer < rules.minimumLayer) {
      return this.ineligible(
        playerId,
        auctionId,
        rules.requiresStaffReview,
        `Player requires dimensional layer ${rules.minimumLayer}+ for this auction.`,
      );
    }

    const availableDKP = await this.dkpService.calculateAvailableDKPWithinTransaction(playerId, client);

    if (availableDKP < rules.minimumDKP) {
      return this.ineligible(
        playerId,
        auctionId,
        rules.requiresStaffReview,
        `Player requires at least ${rules.minimumDKP} available DKP for this auction.`,
      );
    }

    return {
      playerId,
      auctionId,
      canBid: true,
      eligibilityStatus: rules.requiresStaffReview ? 'NEEDS_STAFF_REVIEW' : 'ELIGIBLE',
      eligibilityReason: rules.requiresStaffReview
        ? 'Player can participate, but final selection requires staff review.'
        : 'Player is eligible to bid.',
      requiresStaffReview: rules.requiresStaffReview,
    };
  }

  async validateLayerRequirement(playerId: string, auctionId: string): Promise<boolean> {
    return this.repository.client.$transaction(async (tx) => {
      const { auction, player } = await this.getAuctionAndPlayer(playerId, auctionId, tx);
      const rules = await this.getEffectiveRules(auction, tx);

      return player.dimensionalLayer >= rules.minimumLayer;
    });
  }

  async validateMinimumDKP(playerId: string, auctionId: string): Promise<boolean> {
    return this.repository.client.$transaction(async (tx) => {
      const { auction } = await this.getAuctionAndPlayer(playerId, auctionId, tx);
      const rules = await this.getEffectiveRules(auction, tx);
      const availableDKP = await this.dkpService.calculateAvailableDKPWithinTransaction(playerId, tx);

      return availableDKP >= rules.minimumDKP;
    });
  }

  async canApproveExistingBidWithinTransaction(
    playerId: string,
    auctionId: string,
    client: Prisma.TransactionClient,
  ): Promise<EligibilityValidationResponseDto> {
    const { auction, player } = await this.getAuctionAndPlayer(playerId, auctionId, client);
    const bid = await this.repository.findValidBidByPlayerAndAuction(playerId, auctionId, client);
    const rules = await this.getEffectiveRules(auction, client);

    if (!bid) {
      return this.ineligible(playerId, auctionId, rules.requiresStaffReview, 'Player does not have a valid bid.');
    }

    if (!player.isActive) {
      return this.ineligible(playerId, auctionId, rules.requiresStaffReview, 'Player is not active.');
    }

    const classCompatibility = this.validateClassCompatibility(player, auction);

    if (!classCompatibility.compatible) {
      return this.ineligible(playerId, auctionId, rules.requiresStaffReview, classCompatibility.reason);
    }

    if (player.dimensionalLayer < rules.minimumLayer) {
      return this.ineligible(
        playerId,
        auctionId,
        rules.requiresStaffReview,
        `Player requires dimensional layer ${rules.minimumLayer}+ for this auction.`,
      );
    }

    if (bid.bidAmount < rules.minimumDKP) {
      return this.ineligible(
        playerId,
        auctionId,
        rules.requiresStaffReview,
        `Player bid must satisfy minimum ${rules.minimumDKP} DKP for this auction.`,
      );
    }

    return {
      playerId,
      auctionId,
      canBid: true,
      eligibilityStatus: rules.requiresStaffReview ? 'NEEDS_STAFF_REVIEW' : 'ELIGIBLE',
      eligibilityReason: rules.requiresStaffReview
        ? 'Player has a valid bid and final selection requires staff review.'
        : 'Player has a valid bid and is eligible.',
      requiresStaffReview: rules.requiresStaffReview,
    };
  }

  async calculatePriorityScore(playerId: string, auctionId: string): Promise<PriorityResponseDto> {
    return this.repository.client.$transaction(async (tx) => {
      const { auction, player } = await this.getAuctionAndPlayer(playerId, auctionId, tx);
      const availableDKP = await this.dkpService.calculateAvailableDKPWithinTransaction(playerId, tx);

      return {
        playerId,
        auctionId,
        priorityScore: this.score(
          player.dimensionalLayer,
          player.attendancePercentage,
          availableDKP,
          this.getClassPriorityBonus(player, auction),
        ),
        dimensionalLayer: player.dimensionalLayer,
        attendancePercentage: player.attendancePercentage,
        availableDKP,
      };
    });
  }

  async rankAuctionCandidates(auctionId: string): Promise<RankingResponseDto[]> {
    const ranking = await this.repository.client.$transaction((tx) =>
      this.rankAuctionCandidatesWithinTransaction(auctionId, tx),
    );

    await this.audit('ELIGIBILITY_RANKING_GENERATED', 'Auction', auctionId, undefined, {
      playerIds: ranking.map((row) => row.playerId),
    });

    return ranking;
  }

  async rankAuctionCandidatesWithinTransaction(
    auctionId: string,
    client: Prisma.TransactionClient,
  ): Promise<RankingResponseDto[]> {
    const auction = await this.requireAuction(auctionId, client);
    const bids = await this.repository.findValidAuctionBids(auctionId, client);
    const rows: RankingResponseDto[] = [];

    for (const bid of bids) {
      rows.push(await this.buildRankingRow(auction, bid.player, auctionId, client, bid.bidAmount, bid.id));
    }

    return this.sortRanking(rows);
  }

  async getEligiblePlayers(auctionId: string): Promise<RankingResponseDto[]> {
    const players = await this.repository.client.$transaction(async (tx) => {
      const auction = await this.requireAuction(auctionId, tx);
      const activePlayers = await this.repository.findActivePlayers(tx);
      const rows: RankingResponseDto[] = [];

      for (const player of activePlayers) {
        const row = await this.buildRankingRow(auction, player, auctionId, tx);

        if (row.eligibilityStatus !== 'INELIGIBLE') {
          rows.push(row);
        }
      }

      return this.sortRanking(rows);
    });

    await this.audit('ELIGIBILITY_ELIGIBLE_PLAYERS_GENERATED', 'Auction', auctionId, undefined, {
      playerIds: players.map((row) => row.playerId),
    });

    return players;
  }

  async requiresStaffReview(auctionId: string): Promise<boolean> {
    const auction = await this.requireAuction(auctionId);
    const rules = await this.getEffectiveRules(auction);

    return rules.requiresStaffReview;
  }

  async logStaffOverride(
    actorId: string,
    playerId: string,
    auctionId: string,
    metadata: Prisma.InputJsonObject = {},
  ): Promise<void> {
    await this.audit('ELIGIBILITY_STAFF_OVERRIDE', 'Auction', auctionId, actorId, {
      playerId,
      ...metadata,
    });
  }

  async logForcedApproval(
    actorId: string,
    playerId: string,
    auctionId: string,
    metadata: Prisma.InputJsonObject = {},
  ): Promise<void> {
    const eligibility = await this.canPlayerBid(playerId, auctionId);

    if (!eligibility.canBid) {
      await this.audit('ELIGIBILITY_FORCED_APPROVAL_REJECTED', 'Auction', auctionId, actorId, {
        playerId,
        reason: eligibility.eligibilityReason,
        ...metadata,
      });
      throw new ForcedApprovalRejectedException(playerId, auctionId);
    }

    await this.audit('ELIGIBILITY_FORCED_APPROVAL', 'Auction', auctionId, actorId, {
      playerId,
      ...metadata,
    });
  }

  private async buildRankingRow(
    auction: Auction,
    player: Pick<Player, 'id' | 'nickname' | 'dimensionalLayer' | 'attendancePercentage' | 'class' | 'isActive'>,
    auctionId: string,
    client: Prisma.TransactionClient,
    bidAmount?: number,
    bidId?: string,
  ): Promise<RankingResponseDto> {
    const availableDKP = await this.dkpService.calculateAvailableDKPWithinTransaction(player.id, client);
    const eligibility = await this.evaluatePlayer(player, auction, availableDKP, client);

    return {
      playerId: player.id,
      nickname: player.nickname,
      dimensionalLayer: player.dimensionalLayer,
      attendancePercentage: player.attendancePercentage,
      availableDKP,
      bidId,
      bidAmount,
      priorityScore: this.score(
        player.dimensionalLayer,
        player.attendancePercentage,
        bidAmount ?? availableDKP,
        this.getClassPriorityBonus(player, auction),
      ),
      eligibilityStatus: eligibility.eligibilityStatus,
      eligibilityReason: eligibility.eligibilityReason,
    };
  }

  private async evaluatePlayer(
    player: Pick<Player, 'id' | 'dimensionalLayer' | 'attendancePercentage' | 'class' | 'isActive'>,
    auction: Auction,
    availableDKP: number,
    client: Prisma.TransactionClient,
  ): Promise<Pick<EligibilityValidationResponseDto, 'eligibilityStatus' | 'eligibilityReason'>> {
    const rules = await this.getEffectiveRules(auction, client);

    if (!player.isActive) {
      return { eligibilityStatus: 'INELIGIBLE', eligibilityReason: 'Player is not active.' };
    }

    const classCompatibility = this.validateClassCompatibility(player, auction);

    if (!classCompatibility.compatible) {
      return { eligibilityStatus: 'INELIGIBLE', eligibilityReason: classCompatibility.reason };
    }

    if (player.dimensionalLayer < rules.minimumLayer) {
      return {
        eligibilityStatus: 'INELIGIBLE',
        eligibilityReason: `Player requires dimensional layer ${rules.minimumLayer}+ for this auction.`,
      };
    }

    if (availableDKP < rules.minimumDKP) {
      return {
        eligibilityStatus: 'INELIGIBLE',
        eligibilityReason: `Player requires at least ${rules.minimumDKP} available DKP for this auction.`,
      };
    }

    return {
      eligibilityStatus: rules.requiresStaffReview ? 'NEEDS_STAFF_REVIEW' : 'ELIGIBLE',
      eligibilityReason: rules.requiresStaffReview
        ? 'Player can participate, but final selection requires staff review.'
        : 'Player is eligible.',
    };
  }

  private async getAuctionAndPlayer(
    playerId: string,
    auctionId: string,
    client: Prisma.TransactionClient,
  ): Promise<{ auction: Auction; player: Player }> {
    const [auction, player] = await Promise.all([
      this.repository.findAuction(auctionId, client),
      this.repository.findPlayer(playerId, client),
    ]);

    if (!auction) {
      throw new EligibilityAuctionNotFoundException(auctionId);
    }

    if (!player) {
      throw new EligibilityPlayerNotFoundException(playerId);
    }

    return { auction, player };
  }

  private async requireAuction(auctionId: string, client?: Prisma.TransactionClient): Promise<Auction> {
    const auction = await this.repository.findAuction(auctionId, client);

    if (!auction) {
      throw new EligibilityAuctionNotFoundException(auctionId);
    }

    return auction;
  }

  private async getEffectiveRules(auction: Auction, client?: Prisma.TransactionClient): Promise<EligibilityRuleConfig> {
    const baseRules = this.getBaseRules(auction);

    if (!baseRules.progressiveLayerFallback) {
      return baseRules;
    }

    const effectiveLayer = auction.minimumLayer ?? await this.getProgressiveMinimumLayer(auction, baseRules, client);

    return {
      ...baseRules,
      minimumLayer: effectiveLayer,
    };
  }

  private getBaseRules(auction: Auction): EligibilityRuleConfig {
    if (auction.itemTier === ItemTier.T4 && auction.itemType === ItemType.WEAPON) {
      return {
        minimumLayer: 4,
        minimumDKP: 900,
        requiresStaffReview: true,
        progressiveLayerFallback: true,
        classCompatibilityRequired: true,
        automaticWinnerAllowed: false,
      };
    }

    if (auction.itemTier === ItemTier.T4) {
      return {
        minimumLayer: 4,
        minimumDKP: auction.minimumBid,
        requiresStaffReview: true,
        progressiveLayerFallback: true,
        classCompatibilityRequired: false,
        automaticWinnerAllowed: false,
      };
    }

    if (auction.itemTier === ItemTier.LEGENDARY) {
      return {
        minimumLayer: 5,
        minimumDKP: Math.max(auction.minimumBid, 1),
        requiresStaffReview: true,
        progressiveLayerFallback: true,
        classCompatibilityRequired: auction.itemType === ItemType.WEAPON,
        automaticWinnerAllowed: false,
      };
    }

    return {
      minimumLayer: 1,
      minimumDKP: auction.minimumBid,
      requiresStaffReview: false,
      progressiveLayerFallback: false,
      classCompatibilityRequired: false,
      automaticWinnerAllowed: true,
    };
  }

  private async getProgressiveMinimumLayer(
    auction: Auction,
    baseRules: EligibilityRuleConfig,
    client?: Prisma.TransactionClient,
  ): Promise<number> {
    const interestedLayers = await this.repository.findInterestedLayers(auction.id, client);

    for (let layer = baseRules.minimumLayer; layer >= 1; layer -= 1) {
      if (interestedLayers.some((interestedLayer) => interestedLayer >= layer)) {
        return layer;
      }
    }

    const activePlayers = await this.repository.findActivePlayers(client);

    for (let layer = baseRules.minimumLayer; layer >= 1; layer -= 1) {
      for (const player of activePlayers) {
        if (player.dimensionalLayer < layer) {
          continue;
        }

        if (!this.validateClassCompatibility(player, auction).compatible) {
          continue;
        }

        const availableDKP = client
          ? await this.dkpService.calculateAvailableDKPWithinTransaction(player.id, client)
          : await this.dkpService.calculateAvailableDKP(player.id);

        if (availableDKP >= baseRules.minimumDKP) {
          return layer;
        }
      }
    }

    return 1;
  }

  private validateClassCompatibility(
    _player: Pick<Player, 'class'>,
    auction: Pick<Auction, 'itemType'>,
  ): ClassCompatibilityResult {
    if (auction.itemType !== ItemType.WEAPON) {
      return { compatible: true, reason: 'Class compatibility is not required for this item type.' };
    }

    return { compatible: true, reason: 'Class compatibility rules are prepared for future item metadata.' };
  }

  private getClassPriorityBonus(
    player: Pick<Player, 'class'>,
    auction: Pick<Auction, 'itemType' | 'itemName'>,
  ): number {
    if (auction.itemType !== ItemType.WEAPON) {
      return 0;
    }

    const itemName = this.normalizeText(auction.itemName);
    const keywords = this.weaponClassKeywords[player.class] ?? [];

    return keywords.some((keyword) => itemName.includes(this.normalizeText(keyword)))
      ? this.priorityScoreConfig.classPriorityBonus
      : 0;
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase();
  }

  private score(dimensionalLayer: number, attendancePercentage: number, dkpFactor: number, bonus = 0): number {
    return (
      dimensionalLayer * this.priorityScoreConfig.layerWeight
      + attendancePercentage * this.priorityScoreConfig.attendanceWeight
      + dkpFactor * this.priorityScoreConfig.availableDkpWeight
      + bonus
    );
  }

  private sortRanking(rows: RankingResponseDto[]): RankingResponseDto[] {
    return rows.sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }

      if ((b.bidAmount ?? 0) !== (a.bidAmount ?? 0)) {
        return (b.bidAmount ?? 0) - (a.bidAmount ?? 0);
      }

      return a.nickname.localeCompare(b.nickname);
    });
  }

  private isValidLayer(layer: number): boolean {
    return Number.isInteger(layer) && layer >= 1 && layer <= 10;
  }

  private ineligible(
    playerId: string,
    auctionId: string,
    requiresStaffReview: boolean,
    reason: string,
  ): EligibilityValidationResponseDto {
    return {
      playerId,
      auctionId,
      canBid: false,
      eligibilityStatus: 'INELIGIBLE',
      eligibilityReason: reason,
      requiresStaffReview,
    };
  }

  private async audit(
    action: string,
    targetType: string,
    targetId: string,
    actorId: string | undefined,
    metadata: Prisma.InputJsonObject,
  ): Promise<void> {
    await this.auditService.log({
      actorId,
      action,
      targetType,
      targetId,
      metadata,
    });
  }
}
