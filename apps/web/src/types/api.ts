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
export type EventType =
  | 'LUNOS'
  | 'RIGRETO'
  | 'GARDRON'
  | 'MELKAR'
  | 'VARGAS'
  | 'BELLAMONICA'
  | 'SION'
  | 'ISTERIA'
  | 'NIDROK'
  | 'MORGON'
  | 'GUILD_DUNGEON'
  | 'SATURDAY_EVENT'
  | 'ABYSS_1'
  | 'ABYSS_1_2'
  | 'FLOUD'
  | 'KRATERIUS'
  | 'T3_ROTATION';

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
  createdAt: string;
  dropHistory?: {
    id: string;
    deliveredAt?: string;
  } | null;
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
  itemCatalog?: Pick<ItemCatalog, 'id' | 'kind' | 'category' | 'namePt' | 'nameEn' | 'nameEs' | 'typePt' | 'typeEn' | 'typeEs' | 'image1Url' | 'image2Url'>;
  entries?: ItemInterestEntry[];
  votes?: ItemInterestVote[];
};

export type CodexRequestStatus = 'PENDING' | 'SENT' | 'CONFIRMED' | 'NEEDS_RETRY' | 'CANCELLED';

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

export type AuctionBid = {
  id: string;
  auctionId: string;
  playerId: string;
  bidAmount: number;
  isValid: boolean;
  createdAt: string;
};

export type EligibilityRow = {
  playerId: string;
  nickname: string;
  dimensionalLayer: number;
  attendancePercentage: number;
  availableDKP: number;
  bidId?: string;
  bidAmount?: number;
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
};

export type EventRecord = {
  id: string;
  name: string;
  type: EventType;
  status: 'OPEN' | 'ATTENDANCE_REGISTRATION' | 'FINALIZED' | 'CANCELLED';
  dkpReward: number;
  startsAt: string;
  finalizedAt?: string;
};

export type EventAttendanceRow = {
  id: string;
  eventId: string;
  playerId: string;
  attended: boolean;
  createdAt: string;
  player: PlayerProfile;
};

export type EventDetails = EventRecord & {
  attendances: EventAttendanceRow[];
};

export type AttendanceStats = {
  playerId: string;
  participatedEvents: number;
  eligibleEvents: number;
  attendancePercentage: number;
};

export type PlayerAttendanceHistoryRow = {
  eventId: string;
  name: string;
  type: EventType;
  status: EventRecord['status'];
  dkpReward: number;
  startsAt: string;
  finalizedAt?: string;
  attendanceStatus: 'PRESENT' | 'ABSENT' | 'PENDING';
};

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

export type PlayerHistory = {
  discordId?: string;
  player?: PlayerProfile & { user?: { discordId: string; discordUsername: string; preferredLocale?: string } };
  drops: DropHistory[];
  progress: PlayerProgress[];
  itemRequests: ItemRequest[];
  transactions?: Transaction[];
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

export type OperationTask = {
  id: string;
  type: string;
  title: string;
  description: string;
  href: string;
  priority: 'high' | 'medium' | 'low';
  createdAt?: string;
  metadata?: Record<string, unknown>;
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

export type StaffHealthSummary = {
  generatedAt: string;
  checks: Array<{
    key: string;
    label: string;
    ready: boolean;
    detail: string;
  }>;
};
