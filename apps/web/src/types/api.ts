import type {
  AuctionDiagnosticIssue as SharedAuctionDiagnosticIssue,
  AuctionDiagnosticOption as SharedAuctionDiagnosticOption,
  AuctionDiagnosticSummary as SharedAuctionDiagnosticSummary,
  AuctionDossier as SharedAuctionDossier,
  AuctionFinalizationPreview as SharedAuctionFinalizationPreview,
  AuctionTimelineEvent as SharedAuctionTimelineEvent,
} from '@shared/types/auctions';
import type {
  AttendanceStats as SharedAttendanceStats,
  EventBatchPanel as SharedEventBatchPanel,
  EventDetails as SharedEventDetails,
  EventFinalizationChecklist as SharedEventFinalizationChecklist,
  EventReadinessReport as SharedEventReadinessReport,
  EventRecord as SharedEventRecord,
  EventType as SharedEventType,
  FinalizeEventResult as SharedFinalizeEventResult,
  PlayerAttendanceHistoryRow as SharedPlayerAttendanceHistoryRow,
} from '@shared/types/events';
import type { OperationPriority as SharedOperationPriority, OperationTask as SharedOperationTask, PlayerActionPlan as SharedPlayerActionPlan } from '@shared/types/operations';

export type ItemTier = 'T2' | 'T3' | 'T4' | 'LEGENDARY';
export type ItemType = 'WEAPON' | 'ARMOR' | 'ACCESSORY' | 'CELESTIAL_STONE';
export type PlayerClass =
  | 'GUNSLINGER'
  | 'BERSERKER'
  | 'DESTROYER'
  | 'DEATHBRINGER'
  | 'ASSASSIN'
  | 'DIVINE_CASTER'
  | 'NIGHT_RANGER'
  | 'VANGUARD'
  | 'ELEMENTALIST'
  | 'WARLORD';
export type ProgressCategory =
  | 'STELLAS_AMPLIFICATION'
  | 'EQUIPMENT'
  | 'RELICS'
  | 'STIGMA'
  | 'ITEM_COLLECTION'
  | 'SKILLS'
  | 'PARADISE_STONES'
  | 'STATUS'
  | 'DIMENSIONAL_RIFT'
  | 'RUNES';
export type ProgressReviewStatus = 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type AuctionStatus = 'OPEN' | 'PENDING_REVIEW' | 'FINISHED' | 'CANCELLED' | 'RELISTED';
export type AuctionMode = 'STANDARD' | 'ALL_IN' | 'STAFF_REVIEW';
export type OperationPriority = SharedOperationPriority;
export type DeploymentProtocolStepStatus = 'done' | 'pending' | 'blocked' | 'manual';
export type EventType = SharedEventType;

export type DeploymentPanelSummary = {
  generatedAt: string;
  currentApiVersion: string;
  expectedVersion: {
    sha?: string | null;
    shortSha?: string | null;
    source: 'github-public-api' | 'env' | 'unavailable';
    matchesCurrent: boolean | null;
    checkedAt?: string | null;
    message?: string | null;
  };
  publicHealth: {
    status: 'ok' | 'degraded' | 'down';
    checkedAt?: string | null;
    version?: string | null;
    latencyMs?: number | null;
    message?: string | null;
  };
  privateHealth: StaffHealthSummary;
  publicSmoke: {
    status: 'ok' | 'degraded' | 'down';
    checkedAt: string;
    checks: Array<{
      path: string;
      ready: boolean;
      statusCode?: number | null;
      latencyMs?: number | null;
      version?: string | null;
      message?: string | null;
    }>;
  };
  latestStaffChangelog: {
    title: string;
    fileName?: string | null;
    inferredDate?: string | null;
    source: 'docs' | 'unavailable';
    sentReceiptAvailable: boolean;
    note: string;
  };
  protocol: Array<{
    key: string;
    label: string;
    detail: string;
    status: DeploymentProtocolStepStatus;
  }>;
  actionsUrl?: string | null;
};

export type Auction = {
  id: string;
  itemCatalogId?: string;
  itemName: string;
  itemType: ItemType;
  itemTier: ItemTier;
  minimumBid: number;
  auctionMode: AuctionMode;
  status: AuctionStatus;
  requiresStaffReview: boolean;
  endsAt: string;
  createdAt: string;
  itemCatalog?: ItemCatalog;
  reviewVotes?: AuctionReviewVote[];
  bidInvalidationVotes?: AuctionBidInvalidationVote[];
};

export type AuctionReviewVote = {
  id: string;
  auctionId: string;
  voterId: string;
  action: 'APPROVE' | 'REJECT' | string;
  playerId?: string;
  reason?: string;
  createdAt: string;
  updatedAt: string;
  voter?: {
    id: string;
    discordUsername: string;
    discordNickname?: string;
  };
};

export type AuctionBidInvalidationVote = {
  id: string;
  auctionId: string;
  bidId: string;
  voterId: string;
  reason: string;
  createdAt: string;
  updatedAt: string;
  voter?: {
    id: string;
    discordUsername: string;
    discordNickname?: string;
  };
};

export type ItemCatalog = {
  id: string;
  legacyId?: number;
  kind: string;
  category: string;
  itemTier?: ItemTier;
  itemType?: ItemType;
  namePt: string;
  nameEn: string;
  nameEs?: string;
  typePt: string;
  typeEn: string;
  typeEs?: string;
  preferredClasses: PlayerClass[];
  image1Url?: string;
  image2Url?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ItemRequest = {
  id: string;
  legacyId?: number;
  itemCatalogId?: string;
  playerId?: string;
  discordId: string;
  playerName: string;
  itemName: string;
  imageUrl?: string;
  totalQuantity: number;
  remainingQuantity: number;
  rankPosition: number;
  threadId?: string;
  threadChannelId?: string;
  warned3d: boolean;
  warned4d: boolean;
  updateProofImageUrl?: string;
  updateProofNote?: string;
  updateProofStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  updateProofSubmittedAt?: string;
  updateProofReviewedAt?: string;
  updateProofReviewedById?: string;
  lastReminderStage?: string;
  lastReminderAt?: string;
  legacyCreatedAt?: string;
  legacyUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
  itemCatalog?: ItemCatalog;
  player?: PlayerProfile & {
    user?: {
      discordId: string;
      discordUsername: string;
      discordNickname?: string;
    };
  };
  queueForecast?: {
    position: number;
    queueSize: number;
    requestsAhead: number;
    unitsAhead: number;
    estimatedDeliveriesBefore: number;
    isNext: boolean;
    needsUpdate: boolean;
    updateStage: 'clear' | 'warned_3d' | 'warned_4d' | 'pending_review' | 'boss_manual';
    lastUpdateAt: string;
    daysSinceUpdate: number;
    lastDeliveryAt?: string | null;
    lastDeliveryPlayerName?: string | null;
    summaryPt: string;
    summaryEn: string;
    staffSummaryPt: string;
  };
  swapSuggestions?: Array<{
    itemCatalogId: string;
    itemName: string;
    itemNamePt: string;
    itemNameEn: string;
    category: string;
    itemTier?: ItemTier | null;
    itemType?: ItemType | null;
    queueSize: number;
    unitsInQueue: number;
    estimatedPosition: number;
    tradeoffPt: string;
    tradeoffEn: string;
  }>;
  materialPriority?: {
    affected: boolean;
    reason: 'NONE' | 'T3_CRAFT_PRIORITY' | 'T3_CRAFT_OVER_QUINTESSENCE';
    materialKey?: string | null;
    blockingCraftRequests: number;
    blockingRequestIds: string[];
    blockingItemNames: string[];
    summaryPt: string;
    summaryEn: string;
    staffSummaryPt: string;
  };
};

export type ItemInterestStatus = 'OPEN' | 'CLOSED' | 'VOTING' | 'READY_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

export type ItemInterestVote = {
  id: string;
  entryId: string;
  voterId: string;
  round: number;
  voter?: {
    discordUsername: string;
    discordNickname?: string;
  };
};

export type ItemInterestEntry = {
  id: string;
  postId: string;
  playerId: string;
  note?: string;
  imageUrl?: string;
  isTransmuteRequest: boolean;
  createdAt: string;
  dropHistory?: {
    id: string;
    deliveredAt?: string;
  } | null;
  lootStats?: {
    queueDays: number;
    totalDrops: number;
    sameItemDrops: number;
    sameTypeDrops: number;
    lastDropAt?: string | null;
  };
  staffComparison?: {
    playerClass: string;
    dimensionalLayer: number;
    attendancePercentage: number;
    totalDkp: number;
    lockedDkp: number;
    availableDkp: number;
    activeRequests: Array<{
      id: string;
      itemName: string;
      remainingQuantity: number;
      totalQuantity: number;
      rankPosition: number;
      category?: string | null;
      itemTier?: ItemTier | null;
      itemType?: ItemType | null;
    }>;
    latestStaffNote?: {
      severity: string;
      body: string;
      createdAt: string;
      authorName: string;
    } | null;
    recentLoot: {
      queueDays: number;
      totalDrops: number;
      sameItemDrops: number;
      sameTypeDrops: number;
      lastDropAt?: string | null;
    };
    decisionSignalsPt: string[];
    summaryPt: string;
  };
  player?: {
    id: string;
    nickname: string;
    dimensionalLayer: number;
    attendancePercentage: number;
  };
  votes?: ItemInterestVote[];
};

export type ItemInterestPost = {
  id: string;
  itemCatalogId: string;
  mode: 'PvE' | 'PvP';
  title: string;
  criteriaPt: string;
  criteriaEn: string;
  status: ItemInterestStatus;
  votingRound: number;
  votingCandidateEntryIds?: string[];
  selectedEntryId?: string;
  deliveryEnabledAt?: string;
  closesAt: string;
  closedAt?: string;
  proofImageUrl?: string;
  createdAt: string;
  updatedAt: string;
  itemCatalog?: Pick<ItemCatalog, 'id' | 'kind' | 'category' | 'itemType' | 'namePt' | 'nameEn' | 'nameEs' | 'typePt' | 'typeEn' | 'typeEs' | 'image1Url' | 'image2Url'>;
  entries?: ItemInterestEntry[];
  votes?: ItemInterestVote[];
  viewerHasDeclared?: boolean;
  viewerSeenAt?: string | null;
};

export type CodexRequestStatus = 'PENDING' | 'SENT' | 'CONFIRMED' | 'NEEDS_RETRY' | 'CANCELLED';
export type DaoshiReceiptStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type CodexRequest = {
  id: string;
  playerId: string;
  imageUrl: string;
  note?: string;
  status: CodexRequestStatus;
  proofImageUrl?: string;
  sentById?: string;
  sentAt?: string;
  confirmedAt?: string;
  retryRequestedAt?: string;
  queuedAt: string;
  createdAt: string;
  updatedAt: string;
  player?: {
    id: string;
    nickname: string;
    user: {
      discordId: string;
      discordUsername: string;
    };
  };
};

export type DaoshiCashReceipt = {
  id: string;
  playerId: string;
  proofImageUrl?: string;
  purchaseCents: number;
  approvedCents?: number;
  purchaseDate: string;
  couponCode: string;
  status: DaoshiReceiptStatus;
  playerNote?: string;
  reviewNote?: string;
  reviewedById?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  player?: {
    id: string;
    nickname: string;
    user: {
      discordId: string;
      discordUsername: string;
      discordNickname?: string;
    };
  };
  reviewedBy?: {
    id: string;
    discordUsername: string;
    discordNickname?: string;
  };
};

export type DaoshiMonthlyEntry = {
  playerId: string;
  nickname: string;
  discordId: string;
  approvedCents: number;
  coupons: number;
  couponStart: number;
  couponEnd: number;
};

export type DaoshiRaffle = {
  id: string;
  month: string;
  prizeUsdCents: number;
  totalCents: number;
  totalCoupons: number;
  winnerPlayerId?: string;
  winnerCoupon?: number;
  entries: DaoshiMonthlyEntry[];
  executedById: string;
  executedAt: string;
  createdAt: string;
};

export type DaoshiMonthlySummary = {
  month: string;
  targetCents: number;
  prizeUsdCents: number;
  totalApprovedCents: number;
  totalCoupons: number;
  raffleEnabled: boolean;
  entries: DaoshiMonthlyEntry[];
  raffle?: DaoshiRaffle;
};

export type DaoshiPlayerSummary = {
  month: string;
  targetCents: number;
  prizeUsdCents: number;
  totalApprovedCents: number;
  guildProgressPercent: number;
  raffleEnabled: boolean;
  playerApprovedCents: number;
  playerCoupons: number;
};

export type AuctionBid = {
  id: string;
  auctionId: string;
  playerId: string;
  bidAmount: number;
  isValid: boolean;
  createdAt: string;
};

export type AuctionBidCancellationRequest = {
  id: string;
  auctionId: string;
  bidId: string;
  playerId: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedById?: string;
  reviewNote?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  auction?: Pick<Auction, 'id' | 'itemName' | 'status' | 'auctionMode' | 'endsAt'>;
  bid?: Pick<AuctionBid, 'id' | 'bidAmount' | 'isValid' | 'createdAt'>;
  player?: Pick<PlayerProfile, 'id' | 'nickname' | 'dimensionalLayer'> & {
    user?: {
      discordId: string;
      discordUsername: string;
      discordNickname?: string;
    };
  };
};

export type EligibilityRow = {
  playerId: string;
  nickname: string;
  dimensionalLayer: number;
  attendancePercentage: number;
  availableDKP: number;
  bidId?: string;
  bidAmount?: number;
  lockAmount?: number;
  lockMatchesBid?: boolean;
  priorityScore: number;
  eligibilityStatus: 'ELIGIBLE' | 'INELIGIBLE' | 'NEEDS_STAFF_REVIEW';
  eligibilityReason: string;
};

export type EligibilityResponse = {
  playerId: string;
  auctionId: string;
  canBid: boolean;
  eligibilityStatus: EligibilityRow['eligibilityStatus'];
  eligibilityReason: string;
  requiresStaffReview: boolean;
  playerLayer?: number;
  requiredLayer?: number;
  availableDKP?: number;
  requiredDKP?: number;
  attendancePercentage?: number;
  auctionMode?: string;
  itemTier?: string;
  itemType?: string;
};

export type EventRecord = SharedEventRecord<string>;
export type FinalizeEventResult = SharedFinalizeEventResult<EventRecord, string>;
export type EventFinalizationChecklist = SharedEventFinalizationChecklist<string, PlayerClass>;
export type EventBatchPanel = SharedEventBatchPanel<string>;
export type EventReadinessReport = SharedEventReadinessReport<string, PlayerClass, ProgressReviewStatus>;
export type EventDetails = SharedEventDetails<string, PlayerProfile>;
export type EventAttendanceRow = EventDetails['attendances'][number];
export type AttendanceStats = SharedAttendanceStats;
export type PlayerAttendanceHistoryRow = SharedPlayerAttendanceHistoryRow<string>;

export type Transaction = {
  id: string;
  playerId: string;
  amount: number;
  type: string;
  referenceId?: string;
  createdAt: string;
};

export type DkpLeaderboardRow = {
  playerId: string;
  nickname: string;
  total: number;
  locked: number;
  available: number;
};

export type StaffDkpPlayerRow = DkpLeaderboardRow & {
  userId: string;
  discordId: string;
  discordUsername: string;
  class: PlayerClass;
  dimensionalLayer: number;
};

export type DkpEconomySummary = {
  generatedAt: string;
  activePlayers: number;
  totalPositiveDkp: number;
  totalNegativeDkp: number;
  netDkp: number;
  totalLockedDkp: number;
  eventRewardDkp: number;
  auctionSpentDkp: number;
  adminAdjustmentDkp: number;
  topBalances: DkpLeaderboardRow[];
  topEarners: Array<{ playerId: string; nickname: string; amount: number }>;
  topSpenders: Array<{ playerId: string; nickname: string; amount: number }>;
};

export type ItemAuditSummary = {
  itemKey: string;
  itemCatalogId?: string;
  itemName: string;
  namePt?: string;
  nameEn?: string;
  nameEs?: string;
  itemTier?: ItemTier;
  itemType?: ItemType;
  imageUrl?: string;
  deliveredCount: number;
  uniquePlayers: number;
  lastDeliveredAt?: string;
  sources: string[];
};

export type ItemAuditDrop = DropHistory & {
  source: 'AUCTION' | 'INTEREST' | 'LEGACY_OR_REQUEST';
  player?: PlayerProfile & {
    user?: {
      discordId: string;
      discordUsername: string;
      discordNickname?: string;
    };
  };
  staff?: {
    id: string;
    discordUsername: string;
    discordNickname?: string;
  } | null;
  itemInterestEntry?: {
    id: string;
    post?: ItemInterestPost;
  } | null;
};

export type ItemAuditFull = {
  summary: ItemAuditDrop[];
  drops: ItemAuditDrop[];
  auctions: Array<Auction & {
    itemCatalog?: ItemCatalog;
    bids?: AuctionBid[];
    dropHistory?: DropHistory & { player?: PlayerProfile };
  }>;
  interestPosts: Array<ItemInterestPost & {
    entries?: Array<{ id: string; player?: PlayerProfile; imageUrl?: string; isTransmuteRequest?: boolean; status: string; createdAt: string }>;
    votes?: Array<{ id: string; voter?: { discordUsername: string; discordNickname?: string }; targetPlayerId: string; createdAt: string }>;
    dropHistory?: DropHistory[];
  }>;
  winners: Array<{ auctionId: string; auctionTitle: string; player?: PlayerProfile; deliveredAt?: string }>;
  logs: AuditLog[];
};

export type PlayerStaffNote = {
  id: string;
  playerId: string;
  authorId: string;
  severity: 'INFO' | 'WARNING' | 'STRIKE';
  body: string;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    discordUsername: string;
    discordNickname?: string;
  };
};

export type PlayerProfile = {
  id: string;
  userId?: string;
  nickname: string;
  class: PlayerClass;
  dimensionalLayer: number;
  combatPower?: number;
  timezone?: string;
  attendancePercentage: number;
};

export type DropHistory = {
  id: string;
  itemCatalogId?: string;
  auctionId?: string;
  itemInterestEntryId?: string;
  playerId?: string;
  discordId?: string;
  nicknameIngame?: string;
  itemName?: string;
  staffDiscordId?: string;
  proofImageUrl?: string;
  deliveredAt?: string;
  createdAt: string;
  itemCatalog?: ItemCatalog;
  auction?: Auction;
  player?: PlayerProfile;
};

export type PendingAuctionDelivery = {
  auction: Auction & { itemCatalog?: ItemCatalog };
  player: PlayerProfile & {
    user?: {
      discordId: string;
      discordUsername: string;
    };
  };
  transaction: Transaction;
  urgency?: 'overdue' | 'urgent' | 'today';
  ageHours?: number;
  deliveryDueAt?: string;
  priorityReason?: string;
};

export type PlayerProgress = {
  id: string;
  playerId: string;
  category: ProgressCategory;
  level?: number;
  note?: string;
  imageUrl?: string;
  imageUrls?: string[];
  reviewStatus: ProgressReviewStatus;
  requiresStaffReview: boolean;
  combatPower?: number;
  dimensionalLayer?: number;
  reviewedAt?: string;
  reviewNote?: string;
  playerReadCommentsAt?: string;
  createdAt: string;
  comments?: PlayerProgressComment[];
  player?: PlayerProfile & {
    user?: {
      discordId: string;
      discordUsername: string;
    };
  };
};

export type PlayerProgressComment = {
  id: string;
  progressId: string;
  authorId: string;
  body: string;
  createdAt: string;
  author?: {
    id: string;
    discordUsername: string;
    discordNickname?: string;
    players?: Array<{
      roles?: Array<{ role: { name: string } }>;
    }>;
  };
};

export type PlayerTimelineEntry = {
  id: string;
  type: string;
  title: string;
  description: string;
  titleEn?: string;
  descriptionEn?: string;
  tone?: 'gold' | 'green' | 'red' | 'blue' | 'muted';
  href?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

export type PlayerHistory = {
  discordId?: string;
  player?: PlayerProfile & { user?: { discordId: string; discordUsername: string; preferredLocale?: string } };
  drops: DropHistory[];
  progress: PlayerProgress[];
  itemRequests: ItemRequest[];
  transactions?: Transaction[];
  daoshiReceipts?: DaoshiCashReceipt[];
  codexRequests?: CodexRequest[];
  auctionBids?: AuctionBid[];
  attendances?: Array<{ id: string; attended: boolean; createdAt: string; event: EventRecord }>;
  timeline?: PlayerTimelineEntry[];
};

export type AuditIdentity = {
  discordId: string;
  playerId?: string;
  playerNickname?: string;
  discordUsername?: string;
  discordNickname?: string;
  nicknameIngame?: string;
  requestPlayerName?: string;
  dropsCount: number;
  requestsCount: number;
  lastActivityAt?: string;
};

export type StaffPlayer = PlayerProfile & {
  isActive: boolean;
  user: {
    discordId: string;
    discordUsername: string;
    discordNickname?: string;
    preferredLocale?: string;
  };
  roles: Array<{ role: { name: string } }>;
};

export type AnnouncementStatus = 'ACTIVE' | 'SENT' | 'CANCELLED';

export type Announcement = {
  id: string;
  type: string;
  title: string;
  description?: string;
  channelId: string;
  mentionRoleId?: string;
  eventTime: string;
  timezone: string;
  status: AnnouncementStatus;
  warned4h: boolean;
  warned1h: boolean;
  warned30m: boolean;
  warnedNow: boolean;
  warnedDailyDay?: number;
  createdAt: string;
};

export type AuditLog = {
  id: string;
  actorId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  actor?: {
    id: string;
    discordUsername: string;
    discordNickname?: string;
  };
};

export type OperationTask = SharedOperationTask<string>;

export type GlobalSearchResult = {
  id: string;
  kind: 'item' | 'auction' | 'event' | 'player';
  title: string;
  subtitle: string;
  href: string;
};

export type PlayerOperationsSummary = {
  tasks: OperationTask[];
  counts: {
    urgent: number;
    bids: number;
    requests: number;
    codex: number;
    interests: number;
    progress: number;
  };
};

export type MaintenanceModeSummary = {
  enabled: boolean;
  message: string;
};

export type PlayerActionPlan = SharedPlayerActionPlan<string>;

export type StaffOperationsSummary = {
  tasks: OperationTask[];
  counts: {
    reviews: number;
    codex: number;
    itemRequests: number;
    interests: number;
    deliveries: number;
    progress: number;
    events: number;
    announcements: number;
  };
};

export type IntegritySummary = {
  generatedAt: string;
  counts: {
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  issues: Array<{
    id: string;
    type: string;
    severity: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    href?: string;
    createdAt?: string;
    metadata?: Record<string, unknown>;
  }>;
};

export type BusinessRule = {
  id: string;
  key: string;
  category: string;
  label: string;
  description?: string | null;
  value: unknown;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type InternalNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  href?: string | null;
  metadata?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
};

export type StaffHealthSummary = {
  generatedAt: string;
  checks: Array<{
    key: string;
    label: string;
    ready: boolean;
    detail: string;
  }>;
};

export type NoticeBoardItem = OperationTask;

export type GuildRulesSummary = {
  sections: Array<{
    key: string;
    title: string;
    bullets: string[];
  }>;
};

export type LootFairnessSummary = {
  days: number;
  generatedAt: string;
  rows: Array<{
    playerId: string;
    nickname: string;
    dropsCount: number;
    t4Drops: number;
    legendaryDrops: number;
    attendancePercentage: number;
    currentDkp: number;
    lastDropAt?: string;
  }>;
};

export type PlayerComparisonSummary = {
  players: Array<{
    playerId: string;
    nickname: string;
    class: PlayerClass;
    dimensionalLayer: number;
    attendancePercentage: number;
    combatPower: number;
    currentDkp: number;
    drops30d: number;
    drops90d: number;
    activeRequests: number;
    lastDropAt?: string;
  }>;
};

export type StaffMeetingSummary = StaffDayViewSummary & {
  reviewAuctions: Array<{ id: string; itemName: string; status: string; updatedAt: string }>;
  votingInterests: Array<{ id: string; title: string; status: string; entries: number; updatedAt: string }>;
  openEventRows: Array<{ id: string; name: string; type: string; startsAt: string; status: string }>;
  meetingDay: string;
  sections: Array<{
    key: string;
    title: string;
    description: string;
    href: string;
    priority: OperationPriority;
    items: Array<OperationTask & { meetingItemKey: string; resolved: boolean }>;
  }>;
  resolvedItemKeys: string[];
  markdown: string;
};

export type LegacyAuditSummary = {
  generatedAt: string;
  unlinkedDrops: number;
  unlinkedRequests: number;
  itemsWithoutTier: number;
  itemsWithoutType: number;
  inactiveItems: number;
  recentUnlinkedDrops: Array<{ id: string; discordId?: string; nicknameIngame?: string; itemName?: string; deliveredAt?: string }>;
  recentUnlinkedRequests: Array<{ id: string; discordId: string; playerName: string; itemName: string; updatedAt: string }>;
};

export type DiscordTemplateSummary = {
  templates: Array<{
    key: string;
    channel: string;
    title: string;
    preview: string;
    playerFacing: boolean;
    previews: Array<{
      locale: 'pt-BR' | 'en';
      label: string;
      payload: {
        username: string;
        avatar_url?: string;
        content?: string;
        embeds?: Array<{
          title?: string;
          description?: string;
          color?: number;
          fields?: Array<{ name: string; value: string; inline?: boolean }>;
          image?: { url?: string };
          thumbnail?: { url?: string };
          timestamp?: string;
        }>;
        allowed_mentions?: unknown;
      };
    }>;
  }>;
};

export type DiscordWebhookDeliveryStatus = 'PENDING' | 'SENDING' | 'SENT' | 'FAILED' | 'RETRYING';

export type DiscordWebhookDeliveryItem = {
  id: string;
  webhookKey: string;
  channelLabel: string;
  action?: string;
  targetId?: string;
  status: DiscordWebhookDeliveryStatus;
  attempts: number;
  maxAttempts: number;
  retryable: boolean;
  payloadPreview: unknown;
  payloadSummary: string;
  lastError?: string;
  queuedAt: string;
  startedAt?: string;
  sentAt?: string;
  failedAt?: string;
  retriedAt?: string;
};

export type DiscordWebhookQueueSummary = {
  generatedAt: string;
  counts: Record<DiscordWebhookDeliveryStatus, number>;
  deliveries: DiscordWebhookDeliveryItem[];
};

export type OperationalHealthSummary = StaffHealthSummary & {
  discordFailures24h: number;
  latestAutomationAudit?: string;
  latestDiscordFailure?: string;
  activeAnnouncements: number;
  pendingQueueApproximation: number;
};

export type AuctionDiagnosticIssue = SharedAuctionDiagnosticIssue;

export type AuctionDiagnosticOption = SharedAuctionDiagnosticOption<string>;

export type AuctionTimelineEvent = SharedAuctionTimelineEvent<string>;

export type AuctionFinalizationPreview = SharedAuctionFinalizationPreview<string>;

export type AuctionDossier = SharedAuctionDossier<string>;

export type UniversalDossierType = 'player' | 'auction' | 'request' | 'interest' | 'drop' | 'event';

export type UniversalDossier = {
  generatedAt: string;
  type: UniversalDossierType;
  id: string;
  title: string;
  summary: Array<{ label: string; value: string }>;
  internalLinks: Array<{ label: string; href: string }>;
  auditLogs: Array<{
    id: string;
    action: string;
    targetType: string;
    targetId?: string | null;
    actorName?: string | null;
    createdAt: string;
  }>;
  markdown: string;
};

export type AuctionDiagnosticSummary = SharedAuctionDiagnosticSummary<string>;

export type StaffDayViewSummary = {
  generatedAt: string;
  todaysAnnouncements: number;
  openEvents: number;
  pendingStaffVotes: number;
  pendingDeliveries: number;
  pendingProgressReviews: number;
  urgentTasks: OperationTask[];
};

export type StaffMorningBriefing = {
  generatedAt: string;
  title: string;
  summary: string;
  counts: {
    urgent: number;
    reviews: number;
    deliveries: number;
    codex: number;
    itemRequests: number;
    interests: number;
    progress: number;
    events: number;
    expiredOpenAuctions: number;
    endingAuctions24h: number;
    integrityHigh: number;
    healthAlerts: number;
  };
  sections: Array<{
    key: string;
    title: string;
    description: string;
    href: string;
    priority: OperationPriority;
    count: number;
    tasks: OperationTask[];
  }>;
  markdown: string;
};

export type SeasonMonthlySummary = {
  month: string;
  dkpEarned: number;
  dkpSpent: number;
  attendanceEvents: number;
  dropsDelivered: number;
  daoshiApprovedCents: number;
  itemRequestsDelivered: number;
  topPlayers: Array<{
    playerId: string;
    nickname: string;
    dkpDelta: number;
    attendanceCount: number;
    dropsCount: number;
    daoshiApprovedCents: number;
  }>;
};

export type WeeklyGuildSummary = Omit<SeasonMonthlySummary, 'month'> & {
  weekStart: string;
  weekEnd: string;
};
