import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ItemTier, ItemType, PlayerClass, PlayerCombatRole, Prisma, ProgressReviewStatus, WarRoomRosterSlotStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { DkpService } from '../../dkp/services/dkp.service';
import { EligibilityService } from '../../eligibility/services/eligibility.service';
import {
  ContextualEligibilityDecision,
  ContextualEligibilityReason,
  ContextualEligibilitySummary,
  ContextualEligibilityType,
} from '../operations.types';

type ContextualEligibilityQuery = {
  type?: string;
  contextId?: string;
  role?: string;
};

type PlayerContext = Prisma.PlayerGetPayload<{
  include: {
    combatProfile: true;
    progressUpdates: true;
    dropHistories: { include: { itemCatalog: { select: { itemTier: true; itemType: true; namePt: true; nameEn: true } } } };
    itemRequests: true;
  };
}>;

@Injectable()
export class ContextualEligibilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dkpService: DkpService,
    private readonly eligibilityService: EligibilityService,
  ) {}

  async getContextualEligibility(playerId: string, query: ContextualEligibilityQuery): Promise<ContextualEligibilitySummary> {
    const type = this.parseType(query.type);
    const [player, availableDkp] = await Promise.all([
      this.prisma.player.findUnique({
        where: { id: playerId },
        include: {
          combatProfile: true,
          progressUpdates: { orderBy: { createdAt: 'desc' }, take: 10 },
          dropHistories: {
            orderBy: { deliveredAt: 'desc' },
            take: 10,
            include: { itemCatalog: { select: { itemTier: true, itemType: true, namePt: true, nameEn: true } } },
          },
          itemRequests: { orderBy: { updatedAt: 'desc' }, take: 10 },
        },
      }),
      this.dkpService.calculateAvailableDKP(playerId),
    ]);

    if (!player) throw new NotFoundException('Player nao encontrado.');

    const baseReasons = this.buildBaseReasons(player, availableDkp);
    const summary = type === 'auction'
      ? await this.forAuction(player, availableDkp, query.contextId, baseReasons)
      : type === 'request'
        ? await this.forRequest(player, availableDkp, query.contextId, baseReasons)
        : type === 'war-room'
          ? await this.forWarRoom(player, availableDkp, query.contextId, baseReasons)
          : await this.forRecruitment(player, availableDkp, query.role, baseReasons);

    return {
      generatedAt: new Date(),
      ...summary,
      player: {
        id: player.id,
        nickname: player.nickname,
        class: player.class,
        dimensionalLayer: player.dimensionalLayer,
        attendancePercentage: player.attendancePercentage,
        availableDkp,
        combatPower: player.combatPower,
        build: player.combatProfile?.declaredBuild ?? null,
        preferredRole: player.combatProfile?.preferredRole ?? null,
      },
    };
  }

  private async forAuction(
    player: PlayerContext,
    availableDkp: number,
    auctionId: string | undefined,
    baseReasons: ContextualEligibilityReason[],
  ): Promise<Omit<ContextualEligibilitySummary, 'generatedAt' | 'player'>> {
    if (!auctionId) throw new BadRequestException('contextId e obrigatorio para elegibilidade de leilao.');

    const [auction, eligibility] = await Promise.all([
      this.prisma.auction.findUnique({ where: { id: auctionId }, include: { itemCatalog: true } }),
      this.prisma.$transaction((tx) => this.eligibilityService.canPlayerBidWithinTransaction(player.id, auctionId, tx)),
    ]);

    if (!auction) throw new NotFoundException('Leilao nao encontrado.');

    const reasons = [
      ...baseReasons,
      this.reason('auction-rule', 'Regra de leilao', this.fromAuctionStatus(eligibility.eligibilityStatus), eligibility.eligibilityReason, undefined, `${auction.itemTier}/${auction.itemType} | ${auction.auctionMode}`),
      this.reason(
        'layer',
        'Camada',
        player.dimensionalLayer >= (eligibility.requiredLayer ?? 1) ? 'eligible' : 'blocked',
        `Camada ${player.dimensionalLayer}; requisito ${eligibility.requiredLayer ?? 1}+ para este item.`,
        `${player.dimensionalLayer}/${eligibility.requiredLayer ?? 1}`,
        'minimumLayer efetivo do leilao',
      ),
      this.reason(
        'dkp',
        'DKP disponivel',
        availableDkp >= (eligibility.requiredDKP ?? 0) ? 'eligible' : 'blocked',
        `Disponivel ${availableDkp}; minimo ${eligibility.requiredDKP ?? 0}.`,
        `${availableDkp}/${eligibility.requiredDKP ?? 0}`,
        'minimumBid + regra por tier',
      ),
      this.reason(
        'class-build',
        'Classe/build',
        this.itemClassDecision(player, auction.itemType, auction.itemCatalog?.preferredClasses ?? []),
        this.itemClassExplanation(player, auction.itemType, auction.itemCatalog?.preferredClasses ?? []),
        player.combatProfile?.declaredBuild ?? player.class,
        auction.itemType === ItemType.WEAPON ? 'weapon compatibility' : 'sem bloqueio de classe por tipo',
        `/dashboard/staff/players/${player.id}`,
      ),
      this.recentHistoryReason(player, auction.itemTier),
    ];

    const decision = this.worstDecision(reasons);

    return {
      context: { type: 'auction', id: auction.id, label: auction.itemName },
      decision,
      headline: this.headline(decision, 'leilao'),
      reasons,
      appliedRules: [
        `Modo: ${auction.auctionMode}`,
        `Tier/tipo: ${auction.itemTier}/${auction.itemType}`,
        `Review Staff: ${auction.requiresStaffReview ? 'sim' : 'nao'}`,
      ],
      evidenceLinks: [
        { label: 'Leilao', href: `/dashboard/auctions/${auction.id}` },
        { label: 'Diagnostico Staff', href: `/dashboard/staff/auction-diagnostics?auctionId=${auction.id}` },
      ],
    };
  }

  private async forRequest(
    player: PlayerContext,
    availableDkp: number,
    requestId: string | undefined,
    baseReasons: ContextualEligibilityReason[],
  ): Promise<Omit<ContextualEligibilitySummary, 'generatedAt' | 'player'>> {
    if (!requestId) throw new BadRequestException('contextId e obrigatorio para elegibilidade de request.');

    const request = await this.prisma.itemRequest.findUnique({
      where: { id: requestId },
      include: { itemCatalog: true, player: { select: { id: true, nickname: true } } },
    });

    if (!request) throw new NotFoundException('Request nao encontrado.');

    const tier = request.itemCatalog?.itemTier ?? this.inferTier(request.itemName);
    const requiredLayer = this.requiredLayerForTier(tier);
    const ownRequest = request.playerId === player.id;
    const reasons = [
      ...baseReasons,
      this.reason(
        'request-owner',
        'Vinculo do request',
        ownRequest ? 'eligible' : 'review',
        ownRequest ? 'Request pertence ao player consultado.' : `Request esta vinculado a ${request.player?.nickname ?? request.playerName}; confirmar uso como comparador.`,
        ownRequest ? 'proprio' : 'terceiro',
        'ItemRequest.playerId',
        `/dashboard/staff/dossier?type=request&id=${request.id}`,
      ),
      this.reason(
        'queue-rank',
        'Fila',
        request.rankPosition <= 1 ? 'eligible' : 'review',
        `Posicao atual ${request.rankPosition}; quantidade restante ${request.remainingQuantity}/${request.totalQuantity}.`,
        String(request.rankPosition),
        'rankPosition do request',
      ),
      this.reason(
        'layer',
        'Camada',
        player.dimensionalLayer >= requiredLayer ? 'eligible' : 'review',
        `Camada ${player.dimensionalLayer}; referencia operacional ${requiredLayer}+ para ${tier}.`,
        `${player.dimensionalLayer}/${requiredLayer}`,
        'referencia por tier do catalogo',
      ),
      this.reason(
        'dkp',
        'DKP',
        availableDkp >= 0 ? 'eligible' : 'review',
        `DKP disponivel ${availableDkp}; requests nao consomem bid, mas DKP negativo pede revisao manual.`,
        String(availableDkp),
        'DKP apenas contextual em request',
      ),
      this.reason(
        'class-build',
        'Classe/build',
        this.itemClassDecision(player, request.itemCatalog?.itemType ?? ItemType.ARMOR, request.itemCatalog?.preferredClasses ?? []),
        this.itemClassExplanation(player, request.itemCatalog?.itemType ?? ItemType.ARMOR, request.itemCatalog?.preferredClasses ?? []),
        player.combatProfile?.declaredBuild ?? player.class,
        'preferredClasses do catalogo quando existir',
      ),
      this.recentHistoryReason(player, tier),
    ];

    const decision = this.worstDecision(reasons);

    return {
      context: { type: 'request', id: request.id, label: request.itemName },
      decision,
      headline: this.headline(decision, 'request'),
      reasons,
      appliedRules: [
        `Rank atual: ${request.rankPosition}`,
        `Tier/tipo: ${tier}/${request.itemCatalog?.itemType ?? 'desconhecido'}`,
        `Update proof: ${request.updateProofStatus ?? 'sem pendencia'}`,
      ],
      evidenceLinks: [
        { label: 'Dossie do request', href: `/dashboard/staff/dossier?type=request&id=${request.id}` },
        { label: 'Historico do player', href: `/dashboard/staff/item-audit?playerId=${player.id}` },
      ],
    };
  }

  private async forWarRoom(
    player: PlayerContext,
    availableDkp: number,
    operationId: string | undefined,
    baseReasons: ContextualEligibilityReason[],
  ): Promise<Omit<ContextualEligibilitySummary, 'generatedAt' | 'player'>> {
    if (!operationId) throw new BadRequestException('contextId e obrigatorio para elegibilidade de War Room.');

    const operation = await this.prisma.warRoomOperation.findUnique({
      where: { id: operationId },
      include: { rosterSlots: { where: { playerId: player.id } } },
    });

    if (!operation) throw new NotFoundException('Operacao de War Room nao encontrada.');

    const slot = operation.rosterSlots[0];
    const requiredLayer = slot?.requiredLayer ?? 1;
    const acceptedRoles = player.combatProfile?.acceptedRoles ?? [];
    const roleMatches = !slot || player.combatProfile?.preferredRole === slot.role || acceptedRoles.includes(slot.role);
    const reasons = [
      ...baseReasons,
      this.reason(
        'war-room-slot',
        'Escala',
        slot ? (slot.status === WarRoomRosterSlotStatus.DECLINED ? 'blocked' : 'eligible') : 'review',
        slot ? `Player esta na escala como ${slot.role} com status ${slot.status}.` : 'Player ainda nao esta na escala desta operacao.',
        slot?.status ?? 'sem slot',
        'WarRoomRosterSlot',
        `/dashboard/staff/war-room?operationId=${operation.id}`,
      ),
      this.reason(
        'layer',
        'Camada',
        player.dimensionalLayer >= requiredLayer ? 'eligible' : 'review',
        `Camada ${player.dimensionalLayer}; slot pede ${requiredLayer}+.`,
        `${player.dimensionalLayer}/${requiredLayer}`,
        'requiredLayer do slot',
      ),
      this.reason(
        'class-build',
        'Classe/build',
        !slot?.requiredClass || slot.requiredClass === player.class ? 'eligible' : 'review',
        slot?.requiredClass ? `Slot pede ${slot.requiredClass}; player esta como ${player.class}.` : `Sem classe obrigatoria; build declarada: ${player.combatProfile?.declaredBuild ?? 'ausente'}.`,
        player.combatProfile?.declaredBuild ?? player.class,
        'requiredClass do slot',
      ),
      this.reason(
        'role',
        'Papel tatico',
        roleMatches ? 'eligible' : 'review',
        slot ? `Slot pede ${slot.role}; preferido ${player.combatProfile?.preferredRole ?? 'nao declarado'}; aceitos ${acceptedRoles.join(', ') || 'nenhum'}.` : 'Sem slot para comparar papel tatico.',
        slot?.role ?? player.combatProfile?.preferredRole ?? 'sem papel',
        'preferredRole/acceptedRoles',
      ),
      this.reason(
        'dkp',
        'DKP',
        'eligible',
        `DKP disponivel ${availableDkp}; War Room nao usa DKP como trava, apenas sinal economico lateral.`,
        String(availableDkp),
        'nao bloqueante em War Room',
      ),
    ];

    const decision = this.worstDecision(reasons);

    return {
      context: { type: 'war-room', id: operation.id, label: operation.name },
      decision,
      headline: this.headline(decision, 'War Room'),
      reasons,
      appliedRules: [
        `Operacao: ${operation.type}/${operation.priority}/${operation.status}`,
        `Janela: ${operation.startsAt.toISOString()} - ${operation.endsAt.toISOString()}`,
      ],
      evidenceLinks: [
        { label: 'War Room Staff', href: `/dashboard/staff/war-room?operationId=${operation.id}` },
        { label: 'Perfil Staff', href: `/dashboard/staff/players/${player.id}` },
      ],
    };
  }

  private async forRecruitment(
    player: PlayerContext,
    availableDkp: number,
    role: string | undefined,
    baseReasons: ContextualEligibilityReason[],
  ): Promise<Omit<ContextualEligibilitySummary, 'generatedAt' | 'player'>> {
    const targetRole = this.parseRole(role);
    const criticalClasses: PlayerClass[] = [PlayerClass.VANGUARD, PlayerClass.DIVINE_CASTER, PlayerClass.DEATHBRINGER];
    const acceptedRoles = player.combatProfile?.acceptedRoles ?? [];
    const roleMatches = !targetRole || player.combatProfile?.preferredRole === targetRole || acceptedRoles.includes(targetRole);
    const reasons = [
      ...baseReasons,
      this.reason(
        'role',
        'Papel buscado',
        roleMatches ? 'eligible' : 'review',
        targetRole ? `Busca por ${targetRole}; preferido ${player.combatProfile?.preferredRole ?? 'nao declarado'}; aceitos ${acceptedRoles.join(', ') || 'nenhum'}.` : 'Sem papel alvo, usando sinais gerais de roster.',
        targetRole ?? 'geral',
        'filtro de recrutamento Staff',
      ),
      this.reason(
        'class-build',
        'Classe/build',
        player.combatProfile?.declaredBuild ? 'eligible' : 'review',
        player.combatProfile?.declaredBuild ? `Build declarada: ${player.combatProfile.declaredBuild}.` : 'Build ausente; revisar antes de convocar para vaga especifica.',
        player.combatProfile?.declaredBuild ?? player.class,
        'PlayerCombatProfile',
      ),
      this.reason(
        'critical-class',
        'Classe critica',
        criticalClasses.includes(player.class) ? 'eligible' : 'review',
        criticalClasses.includes(player.class) ? `${player.class} e classe critica para composicao.` : `${player.class} pode entrar como apoio/flex, mas nao cobre gargalo critico por si so.`,
        player.class,
        'matriz Staff de composicao',
      ),
      this.reason(
        'dkp',
        'DKP',
        availableDkp >= 0 ? 'eligible' : 'review',
        `DKP disponivel ${availableDkp}; recrutamento nao bloqueia por DKP, mas negativo pede conversa.`,
        String(availableDkp),
        'nao bloqueante em recrutamento',
      ),
    ];

    const decision = this.worstDecision(reasons);

    return {
      context: { type: 'recruitment', id: targetRole ?? null, label: targetRole ? `Recrutamento ${targetRole}` : 'Recrutamento geral' },
      decision,
      headline: this.headline(decision, 'recrutamento'),
      reasons,
      appliedRules: ['Camada, presenca, perfil de combate, classe critica e historico recente'],
      evidenceLinks: [
        { label: 'Roster Staff', href: '/dashboard/staff/players' },
        { label: 'Perfil Staff', href: `/dashboard/staff/players/${player.id}` },
      ],
    };
  }

  private buildBaseReasons(player: PlayerContext, availableDkp: number): ContextualEligibilityReason[] {
    const latestApproved = player.progressUpdates.find((progress) => progress.reviewStatus === ProgressReviewStatus.APPROVED);

    return [
      this.reason(
        'active',
        'Status',
        player.isActive ? 'eligible' : 'blocked',
        player.isActive ? 'Player ativo.' : 'Player inativo nao deve aparecer como candidato automatico.',
        player.isActive ? 'ativo' : 'inativo',
        'Player.isActive',
      ),
      this.reason(
        'attendance',
        'Presenca',
        player.attendancePercentage >= 60 ? 'eligible' : player.attendancePercentage >= 40 ? 'review' : 'blocked',
        `Presenca atual ${player.attendancePercentage.toFixed(2)}%.`,
        `${player.attendancePercentage.toFixed(2)}%`,
        'threshold operacional 60% / 40%',
        '/dashboard/attendance',
      ),
      this.reason(
        'progress',
        'STATUS/progresso',
        latestApproved ? 'eligible' : 'review',
        latestApproved ? `Ultimo progresso aprovado em ${latestApproved.createdAt.toISOString()}.` : 'Sem progresso aprovado recente entre os ultimos registros.',
        latestApproved?.category ?? 'sem aprovado',
        'ProgressReviewStatus.APPROVED',
        `/dashboard/staff/players/${player.id}`,
      ),
      this.reason(
        'economy',
        'Economia',
        availableDkp >= 0 ? 'eligible' : 'review',
        `DKP disponivel atual: ${availableDkp}.`,
        String(availableDkp),
        'DKP total - locks ativos',
      ),
    ];
  }

  private recentHistoryReason(player: PlayerContext, tier: ItemTier): ContextualEligibilityReason {
    const expensiveRecent = player.dropHistories.find((drop) => {
      const deliveredAt = drop.deliveredAt ?? drop.createdAt;
      const ageMs = Date.now() - deliveredAt.getTime();
      const dropTier = drop.itemCatalog?.itemTier;
      return ageMs <= 30 * 24 * 60 * 60 * 1000 && (dropTier === tier || dropTier === ItemTier.T4 || dropTier === ItemTier.LEGENDARY);
    });

    if (!expensiveRecent) {
      return this.reason('recent-history', 'Historico recente', 'eligible', 'Sem loot caro recente conflitante nos ultimos 30 dias.', 'limpo 30d', 'drops recentes');
    }

    return this.reason(
      'recent-history',
      'Historico recente',
      'review',
      `Recebeu ${expensiveRecent.itemName ?? expensiveRecent.itemCatalog?.namePt ?? 'item'} recentemente; revisar prioridade humana.`,
      expensiveRecent.itemCatalog?.itemTier ?? 'drop recente',
      'drops 30d',
      `/dashboard/staff/item-audit?playerId=${player.id}`,
    );
  }

  private itemClassDecision(player: PlayerContext, itemType: ItemType, preferredClasses: PlayerClass[]): ContextualEligibilityDecision {
    if (preferredClasses.includes(player.class)) return 'eligible';
    if (itemType !== ItemType.WEAPON || preferredClasses.length === 0) return 'eligible';
    if (player.combatProfile?.secondaryClass && preferredClasses.includes(player.combatProfile.secondaryClass)) return 'review';
    return 'blocked';
  }

  private itemClassExplanation(player: PlayerContext, itemType: ItemType, preferredClasses: PlayerClass[]): string {
    if (preferredClasses.length === 0) return `${itemType} sem preferredClasses no catalogo; sem bloqueio automatico.`;
    if (preferredClasses.includes(player.class)) return `Classe primaria ${player.class} consta nas classes preferidas do item.`;
    if (player.combatProfile?.secondaryClass && preferredClasses.includes(player.combatProfile.secondaryClass)) {
      return `Classe secundaria ${player.combatProfile.secondaryClass} combina, mas a primaria e ${player.class}.`;
    }
    return `Classes preferidas: ${preferredClasses.join(', ')}; player esta como ${player.class}.`;
  }

  private reason(
    key: string,
    label: string,
    status: ContextualEligibilityDecision,
    explanation: string,
    metric?: string,
    rule?: string,
    evidenceHref?: string,
  ): ContextualEligibilityReason {
    return { key, label, status, explanation, metric, rule, evidenceHref };
  }

  private worstDecision(reasons: ContextualEligibilityReason[]): ContextualEligibilityDecision {
    if (reasons.some((reason) => reason.status === 'blocked')) return 'blocked';
    if (reasons.some((reason) => reason.status === 'review')) return 'review';
    return 'eligible';
  }

  private headline(decision: ContextualEligibilityDecision, label: string): string {
    if (decision === 'eligible') return `Elegivel para ${label}; sinais principais batem com a regra aplicada.`;
    if (decision === 'review') return `Pode aparecer em ${label}, mas pede revisao Staff antes de decisao.`;
    return `Nao deveria ser tratado como elegivel automatico para ${label}.`;
  }

  private fromAuctionStatus(status: string): ContextualEligibilityDecision {
    if (status === 'ELIGIBLE') return 'eligible';
    if (status === 'NEEDS_STAFF_REVIEW') return 'review';
    return 'blocked';
  }

  private parseType(type: string | undefined): ContextualEligibilityType {
    if (type === 'auction' || type === 'request' || type === 'war-room' || type === 'recruitment') return type;
    throw new BadRequestException('Tipo de elegibilidade contextual invalido.');
  }

  private parseRole(role: string | undefined): PlayerCombatRole | undefined {
    if (!role) return undefined;
    const normalized = role.toUpperCase();
    if (Object.values(PlayerCombatRole).includes(normalized as PlayerCombatRole)) return normalized as PlayerCombatRole;
    throw new BadRequestException('Papel de recrutamento invalido.');
  }

  private inferTier(itemName: string): ItemTier {
    const normalized = itemName.toUpperCase();
    if (normalized.includes('LEGEND')) return ItemTier.LEGENDARY;
    if (normalized.includes('T4')) return ItemTier.T4;
    if (normalized.includes('T2')) return ItemTier.T2;
    return ItemTier.T3;
  }

  private requiredLayerForTier(tier: ItemTier): number {
    if (tier === ItemTier.T4 || tier === ItemTier.LEGENDARY) return 4;
    if (tier === ItemTier.T3) return 2;
    return 1;
  }
}
