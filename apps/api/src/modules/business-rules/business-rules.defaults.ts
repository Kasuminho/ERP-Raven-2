import { AuctionMode, EventType, ItemTier } from '@prisma/client';

export type EventRewardRules = Record<EventType, number>;

export type AuctionTierRule = {
  minimumBid: number;
  auctionMode: AuctionMode;
  requiresStaffReview: boolean;
  minimumLayer: number;
};

export type AuctionTierRules = Record<ItemTier, AuctionTierRule>;

export type PriorityScoreRules = {
  layerWeight: number;
  attendanceWeight: number;
  bidDkpWeight: number;
  classPriorityBonus: number;
};

export type StaffPendingThresholdRule = {
  mediumAfterMs: number;
  highAfterMs: number;
};

export type StaffPendingThresholdRules = Record<string, StaffPendingThresholdRule>;

export type MaintenanceModeRules = {
  enabled: boolean;
  message: string;
};

export type DkpBidPolicyRules = {
  enabled: boolean;
  minimumCost: number;
  winTaxPercent: number;
  tierCaps: Record<string, number>;
  itemTypeCaps: Record<string, number>;
  layerCaps: Record<string, number>;
  fixedCostByTier: Record<string, number>;
  modeMultiplierPercent: Record<string, number>;
  sourceSimulationId?: string;
  sourceSimulationName?: string;
  promotedAt?: string;
  promotedById?: string;
  reason?: string;
};

export type AuctionDisputeRules = {
  enabled: boolean;
  windowHours: number;
};

export type AttendanceEligibilityRules = {
  bidMinimumPercent: number;
  participationMinimumPercent: number;
};

export const defaultEventRewardRules: EventRewardRules = {
  [EventType.LUNOS]: 20,
  [EventType.RIGRETO]: 20,
  [EventType.GARDRON]: 20,
  [EventType.MELKAR]: 100,
  [EventType.VARGAS]: 20,
  [EventType.BELLAMONICA]: 20,
  [EventType.SION]: 20,
  [EventType.ISTERIA]: 20,
  [EventType.NIDROK]: 20,
  [EventType.MORGON]: 20,
  [EventType.GUILD_DUNGEON]: 30,
  [EventType.SATURDAY_EVENT]: 40,
  [EventType.ABYSS_1]: 10,
  [EventType.ABYSS_1_2]: 35,
  [EventType.FLOUD]: 40,
  [EventType.KRATERIUS]: 40,
  [EventType.T3_ROTATION]: 20,
};

export const defaultAuctionTierRules: AuctionTierRules = {
  [ItemTier.T2]: {
    minimumBid: 650,
    auctionMode: AuctionMode.STANDARD,
    requiresStaffReview: false,
    minimumLayer: 1,
  },
  [ItemTier.T3]: {
    minimumBid: 800,
    auctionMode: AuctionMode.STANDARD,
    requiresStaffReview: false,
    minimumLayer: 1,
  },
  [ItemTier.T4]: {
    minimumBid: 900,
    auctionMode: AuctionMode.ALL_IN,
    requiresStaffReview: true,
    minimumLayer: 4,
  },
  [ItemTier.LEGENDARY]: {
    minimumBid: 0,
    auctionMode: AuctionMode.ALL_IN,
    requiresStaffReview: true,
    minimumLayer: 5,
  },
};

export const defaultPriorityScoreRules: PriorityScoreRules = {
  layerWeight: 100,
  attendanceWeight: 5,
  bidDkpWeight: 0.25,
  classPriorityBonus: 10000,
};

const HOURS = 60 * 60 * 1000;
const DAYS = 24 * HOURS;

export const defaultStaffPendingThresholdRules: StaffPendingThresholdRules = {
  auctionReview: { mediumAfterMs: 3 * DAYS, highAfterMs: 5 * DAYS },
  auctionDropDelivery: { mediumAfterMs: 10 * HOURS, highAfterMs: 1 * DAYS },
  codexPending: { mediumAfterMs: 15 * DAYS, highAfterMs: 25 * DAYS },
  codexRetry: { mediumAfterMs: 20 * DAYS, highAfterMs: 30 * DAYS },
  interestDelivery: { mediumAfterMs: 10 * HOURS, highAfterMs: 1 * DAYS },
  progressReview: { mediumAfterMs: 2 * DAYS, highAfterMs: 3 * DAYS },
  eventFinalization: { mediumAfterMs: 10 * HOURS, highAfterMs: 20 * HOURS },
  itemRequest: { mediumAfterMs: 2 * DAYS, highAfterMs: 5 * DAYS },
};

export const defaultMaintenanceModeRules: MaintenanceModeRules = {
  enabled: false,
  message: 'Operacao em manutencao. Leituras continuam liberadas; acoes sensiveis ficam pausadas ate a Staff liberar.',
};

export const defaultDkpBidPolicyRules: DkpBidPolicyRules = {
  enabled: false,
  minimumCost: 0,
  winTaxPercent: 0,
  tierCaps: {},
  itemTypeCaps: {},
  layerCaps: {},
  fixedCostByTier: {},
  modeMultiplierPercent: {},
};

export const defaultAuctionDisputeRules: AuctionDisputeRules = {
  enabled: true,
  windowHours: 48,
};

export const defaultAttendanceEligibilityRules: AttendanceEligibilityRules = {
  bidMinimumPercent: 65,
  participationMinimumPercent: 50,
};

export const businessRuleDefaults = [
  {
    key: 'eventRewards',
    category: 'attendance',
    label: 'DKP por tipo de evento',
    description: 'Controla quanto DKP cada evento entrega quando a Staff finaliza presenca.',
    value: defaultEventRewardRules,
  },
  {
    key: 'auctionTierRules',
    category: 'auctions',
    label: 'Regras por tier de leilao',
    description: 'Controla lance minimo, modo, review e camada minima padrao por tier.',
    value: defaultAuctionTierRules,
  },
  {
    key: 'priorityScore',
    category: 'eligibility',
    label: 'Pontuacao de prioridade',
    description: 'Controla pesos de camada, presenca, DKP bidado e bonus de classe em armas.',
    value: defaultPriorityScoreRules,
  },
  {
    key: 'staffPendingThresholds',
    category: 'operations',
    label: 'Severidade da central de pendencias',
    description: 'Controla quando uma pendencia vira media ou alta.',
    value: defaultStaffPendingThresholdRules,
  },
  {
    key: 'maintenanceMode',
    category: 'operations',
    label: 'Modo manutencao',
    description: 'Bloqueia mutacoes sensiveis durante restore, incidente ou janela operacional controlada.',
    value: defaultMaintenanceModeRules,
  },
  {
    key: 'dkpBidPolicy',
    category: 'auctions',
    label: 'Politica operacional de bids',
    description: 'Documenta cap, taxa, floor e multiplicadores aprovados pela Staff a partir de simulacoes DKP.',
    value: defaultDkpBidPolicyRules,
  },
  {
    key: 'auctionDisputeRules',
    category: 'auctions',
    label: 'Contestacao pos-leilao',
    description: 'Controla janela e disponibilidade da contestacao controlada depois do resultado.',
    value: defaultAuctionDisputeRules,
  },
  {
    key: 'attendanceEligibilityRules',
    category: 'eligibility',
    label: 'Cortes de presenca D-30',
    description: 'Controla a presenca minima dos ultimos 30 dias para bid, interesses e requests.',
    value: defaultAttendanceEligibilityRules,
  },
] as const;
