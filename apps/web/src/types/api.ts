import type {
  AuctionDiagnosticIssue as SharedAuctionDiagnosticIssue,
  AuctionDiagnosticOption as SharedAuctionDiagnosticOption,
  AuctionDiagnosticSummary as SharedAuctionDiagnosticSummary,
  AuctionDossier as SharedAuctionDossier,
  AuctionFinalizationPreview as SharedAuctionFinalizationPreview,
  AuctionTimelineEvent as SharedAuctionTimelineEvent,
} from "@shared/types/auctions";
import type {
  ItemInterestEntryRecord as SharedItemInterestEntryRecord,
  ItemInterestPostRecord as SharedItemInterestPostRecord,
  ItemInterestStaffComparison as SharedItemInterestStaffComparison,
  ItemInterestStatus as SharedItemInterestStatus,
  ItemInterestVote as SharedItemInterestVote,
} from "@shared/types/interests";
import type {
  AttendanceStats as SharedAttendanceStats,
  EventBatchPanel as SharedEventBatchPanel,
  EventDetails as SharedEventDetails,
  EventFinalizationChecklist as SharedEventFinalizationChecklist,
  EventChecklistItem as SharedEventChecklistItem,
  EventOperationalCategory as SharedEventOperationalCategory,
  EventOperationalPriority as SharedEventOperationalPriority,
  EventCompositionTarget as SharedEventCompositionTarget,
  EventSeriesRecord as SharedEventSeriesRecord,
  EventReserveEntryRecord as SharedEventReserveEntryRecord,
  EventReserveStatus as SharedEventReserveStatus,
  EventReminderChannel as SharedEventReminderChannel,
  EventNoShowRecord as SharedEventNoShowRecord,
  EventRsvpNoteVisibility as SharedEventRsvpNoteVisibility,
  EventRsvpRecord as SharedEventRsvpRecord,
  EventRsvpStaffSummary as SharedEventRsvpStaffSummary,
  EventRsvpStatus as SharedEventRsvpStatus,
  EventReadinessReport as SharedEventReadinessReport,
  EventRecord as SharedEventRecord,
  EventType as SharedEventType,
  FinalizeEventResult as SharedFinalizeEventResult,
  PlayerAttendanceHistoryRow as SharedPlayerAttendanceHistoryRow,
  PlayerAbsenceReasonVisibility as SharedPlayerAbsenceReasonVisibility,
  PlayerAbsenceRecord as SharedPlayerAbsenceRecord,
  PlayerEventCommitment as SharedPlayerEventCommitment,
} from "@shared/types/events";
import type {
  OperationPriority as SharedOperationPriority,
  OperationTask as SharedOperationTask,
  PlayerActionPlan as SharedPlayerActionPlan,
} from "@shared/types/operations";
import type {
  PlayerCombatAvailability as SharedPlayerCombatAvailability,
  PlayerCombatProfileChangeRequestRecord as SharedPlayerCombatProfileChangeRequestRecord,
  PlayerCombatProfileChangeStatus as SharedPlayerCombatProfileChangeStatus,
  PlayerCombatProfileRecord as SharedPlayerCombatProfileRecord,
  PlayerCombatRole as SharedPlayerCombatRole,
  RosterCompositionMatrix as SharedRosterCompositionMatrix,
} from "@shared/types/roster";
import type {
  PlayerWarRoomAssignment as SharedPlayerWarRoomAssignment,
  WarRoomInternalLink as SharedWarRoomInternalLink,
  WarRoomOperationPriority as SharedWarRoomOperationPriority,
  WarRoomOperationRecord as SharedWarRoomOperationRecord,
  WarRoomOperationStatus as SharedWarRoomOperationStatus,
  WarRoomOperationType as SharedWarRoomOperationType,
  WarRoomRosterConflict as SharedWarRoomRosterConflict,
  WarRoomRosterDossier as SharedWarRoomRosterDossier,
  WarRoomRosterSlotRecord as SharedWarRoomRosterSlotRecord,
  WarRoomRosterSlotStatus as SharedWarRoomRosterSlotStatus,
  WarRoomLiveDossier as SharedWarRoomLiveDossier,
  WarRoomTimelineEventRecord as SharedWarRoomTimelineEventRecord,
  WarRoomTimelineEventType as SharedWarRoomTimelineEventType,
  WarRoomAfterActionReport as SharedWarRoomAfterActionReport,
} from "@shared/types/war-room";
import type { ItemRequestRecord as SharedItemRequestRecord } from "@shared/types/requests";
import type {
  StaffWishlistDemand as SharedStaffWishlistDemand,
  WishlistItemRecord as SharedWishlistItemRecord,
  WishlistPriority as SharedWishlistPriority,
  WishlistStatus as SharedWishlistStatus,
} from "@shared/types/wishlist";
import type {
  GuildPolicyPublicWorkspace as SharedGuildPolicyPublicWorkspace,
  GuildPolicyStaffWorkspace as SharedGuildPolicyStaffWorkspace,
  GuildPolicyVersionRecord as SharedGuildPolicyVersionRecord,
} from "@shared/types/policies";
import type {
  DiamondSaleRecord as SharedDiamondSaleRecord,
  DiamondSaleRecipientRecord as SharedDiamondSaleRecipientRecord,
} from "@shared/types/diamond-sales";

export type ItemTier = "T2" | "T3" | "T4" | "LEGENDARY";
export type ItemType = "WEAPON" | "ARMOR" | "ACCESSORY" | "CELESTIAL_STONE";
export type WishlistPriority = SharedWishlistPriority;
export type WishlistStatus = SharedWishlistStatus;
export type WishlistItem = SharedWishlistItemRecord<string>;
export type StaffWishlistDemand = SharedStaffWishlistDemand<string>;
export type PlayerClass =
  | "GUNSLINGER"
  | "BERSERKER"
  | "DESTROYER"
  | "DEATHBRINGER"
  | "ASSASSIN"
  | "DIVINE_CASTER"
  | "NIGHT_RANGER"
  | "VANGUARD"
  | "ELEMENTALIST"
  | "WARLORD";
export type ProgressCategory =
  | "STELLAS_AMPLIFICATION"
  | "EQUIPMENT"
  | "RELICS"
  | "STIGMA"
  | "ITEM_COLLECTION"
  | "SKILLS"
  | "PARADISE_STONES"
  | "STATUS"
  | "DIMENSIONAL_RIFT"
  | "RUNES";
export type ProgressReviewStatus =
  "NOT_REQUIRED" | "PENDING" | "APPROVED" | "REJECTED";
export type PlayerCombatRole = SharedPlayerCombatRole;
export type PlayerCombatAvailability = SharedPlayerCombatAvailability;
export type PlayerCombatProfileChangeStatus =
  SharedPlayerCombatProfileChangeStatus;
export type AuctionStatus =
  "OPEN" | "PENDING_REVIEW" | "FINISHED" | "CANCELLED" | "RELISTED";
export type AuctionMode = "STANDARD" | "ALL_IN" | "STAFF_REVIEW";
export type OperationPriority = SharedOperationPriority;
export type DeploymentProtocolStepStatus =
  "done" | "pending" | "blocked" | "manual";
export type EventType = SharedEventType;

export type DeploymentPanelSummary = {
  generatedAt: string;
  currentApiVersion: string;
  expectedVersion: {
    sha?: string | null;
    shortSha?: string | null;
    source: "github-public-api" | "env" | "unavailable";
    matchesCurrent: boolean | null;
    checkedAt?: string | null;
    message?: string | null;
  };
  publicHealth: {
    status: "ok" | "degraded" | "down";
    diagnostic:
      | "ok"
      | "edge-challenge"
      | "http-error"
      | "network-error"
      | "not-configured";
    checkedAt?: string | null;
    version?: string | null;
    latencyMs?: number | null;
    message?: string | null;
  };
  privateHealth: StaffHealthSummary;
  publicSmoke: {
    status: "ok" | "degraded" | "down";
    outcome:
      "ok" | "partial" | "edge-challenge" | "api-failure" | "not-configured";
    checkedAt: string;
    totalLatencyMs?: number | null;
    message: string;
    checks: Array<{
      path: string;
      ready: boolean;
      diagnostic:
        | "ok"
        | "edge-challenge"
        | "http-error"
        | "network-error"
        | "not-configured";
      statusCode?: number | null;
      latencyMs?: number | null;
      version?: string | null;
      message?: string | null;
    }>;
  };
  webhookQueue: {
    status: "ok" | "degraded" | "down";
    checkedAt: string;
    pending: number;
    sending: number;
    retrying: number;
    failed: number;
    oldestPendingQueuedAt?: string | null;
    oldestPendingAgeMinutes?: number | null;
    latestRetryAt?: string | null;
    latestRetryAction?: string | null;
    latestFailureAt?: string | null;
    latestFailureAction?: string | null;
    message: string;
  };
  latestStaffChangelog: {
    title: string;
    fileName?: string | null;
    inferredDate?: string | null;
    source: "docs" | "unavailable";
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
  action: "APPROVE" | "REJECT" | string;
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
  diamondSaleEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ItemRequest = SharedItemRequestRecord<
  string,
  ItemCatalog,
  PlayerProfile & {
    user?: {
      discordId: string;
      discordUsername: string;
      discordNickname?: string;
    };
  },
  ItemTier,
  ItemType
>;

export type ItemInterestStatus = SharedItemInterestStatus;

export type ItemInterestVote = SharedItemInterestVote<{
  discordUsername: string;
  discordNickname?: string;
}>;

export type ItemInterestStaffComparison = SharedItemInterestStaffComparison<
  string,
  ItemTier,
  ItemType
>;

export type ItemInterestEntry = SharedItemInterestEntryRecord<
  string,
  {
    id: string;
    nickname: string;
    dimensionalLayer: number;
    attendancePercentage: number;
  },
  ItemInterestStaffComparison,
  ItemInterestVote
>;

export type ItemInterestPost = SharedItemInterestPostRecord<
  string,
  Pick<
    ItemCatalog,
    | "id"
    | "kind"
    | "category"
    | "itemType"
    | "namePt"
    | "nameEn"
    | "nameEs"
    | "typePt"
    | "typeEn"
    | "typeEs"
    | "image1Url"
    | "image2Url"
  >,
  ItemInterestEntry,
  ItemInterestVote
>;

export type CodexRequestStatus =
  "PENDING" | "SENT" | "CONFIRMED" | "NEEDS_RETRY" | "CANCELLED";
export type DaoshiReceiptStatus = "PENDING" | "APPROVED" | "REJECTED";

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
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedById?: string;
  reviewNote?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  auction?: Pick<
    Auction,
    "id" | "itemName" | "status" | "auctionMode" | "endsAt"
  >;
  bid?: Pick<AuctionBid, "id" | "bidAmount" | "isValid" | "createdAt">;
  player?: Pick<PlayerProfile, "id" | "nickname" | "dimensionalLayer"> & {
    user?: {
      discordId: string;
      discordUsername: string;
      discordNickname?: string;
    };
  };
};

export type DiamondSaleRecipient = SharedDiamondSaleRecipientRecord<string> & {
  player?: { id: string; nickname: string; isActive: boolean };
};

export type DiamondSale = Omit<
  SharedDiamondSaleRecord<string>,
  "recipients"
> & {
  itemCatalog?: ItemCatalog;
  buyerPlayer?: { id: string; nickname: string; isActive: boolean } | null;
  recipients: DiamondSaleRecipient[];
};

export type DiamondSaleSetup = {
  items: ItemCatalog[];
  activePlayers: Array<
    Pick<PlayerProfile, "id" | "nickname" | "class" | "dimensionalLayer">
  >;
  activePlayerCount: number;
};

export type PlayerAuctionResultReceipt = {
  auction: Pick<
    Auction,
    | "id"
    | "itemName"
    | "itemTier"
    | "itemType"
    | "minimumBid"
    | "auctionMode"
    | "requiresStaffReview"
    | "status"
    | "endsAt"
  > & {
    minimumLayer?: number | null;
  };
  role: "WINNER" | "PARTICIPANT" | "OBSERVER";
  finalStatus: "WON" | "NOT_SELECTED" | "NO_PARTICIPATION";
  ownBidAmount?: number | null;
  ownBidValid?: boolean | null;
  winnerCost?: number | null;
  deliveryStatus: "PENDING_DELIVERY" | "DELIVERED" | "NOT_APPLICABLE";
  deliveredAt?: string | null;
  ruleApplied: {
    minimumBid: number;
    auctionMode: AuctionMode;
    requiresStaffReview: boolean;
    minimumLayer?: number | null;
    itemTier: ItemTier;
  };
  safeReason: {
    pt: string;
    en: string;
  };
  nextSteps: {
    pt: string;
    en: string;
  };
};

export type PlayerAuctionTimelineEvent = {
  key:
    | "AUCTION_OPENED"
    | "AUCTION_CLOSED"
    | "STAFF_REVIEW"
    | "RESULT_PUBLISHED"
    | "DELIVERY_PENDING"
    | "DELIVERED"
    | "RELISTED"
    | "CANCELLED";
  occurredAt: string;
  tone: "info" | "warning" | "success" | "muted";
  title: {
    pt: string;
    en: string;
  };
  description: {
    pt: string;
    en: string;
  };
};

export type AuctionDisputeStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export type AuctionDispute = {
  id: string;
  auctionId: string;
  playerId: string;
  reason: string;
  proofImageUrl?: string | null;
  status: AuctionDisputeStatus;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  externalNotePt?: string | null;
  externalNoteEn?: string | null;
  createdAt: string;
  updatedAt: string;
  auction?: Pick<
    Auction,
    "id" | "itemName" | "status" | "auctionMode" | "endsAt"
  >;
  player?: Pick<PlayerProfile, "id" | "nickname" | "dimensionalLayer">;
};

export type GuildCaseCategory = "QUESTION" | "OPERATIONAL_REPORT" | "APPEAL";
export type GuildCaseSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type GuildCaseStatus =
  "OPEN" | "IN_REVIEW" | "WAITING_PLAYER" | "RESOLVED" | "CLOSED";
export type GuildCaseIdentity = {
  id: string;
  discordUsername: string;
  discordNickname?: string | null;
};

export type GuildCaseEntry = {
  id: string;
  caseId: string;
  kind:
    | "CREATED"
    | "PLAYER_MESSAGE"
    | "STAFF_RESPONSE"
    | "INTERNAL_NOTE"
    | "STATUS_CHANGED"
    | "ASSIGNED";
  visibility: "PLAYER" | "STAFF";
  bodyPt?: string | null;
  bodyEn?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  actor?: GuildCaseIdentity | null;
};

export type GuildCase = {
  id: string;
  playerId: string;
  category: GuildCaseCategory;
  severity: GuildCaseSeverity;
  status: GuildCaseStatus;
  subject: string;
  description: string;
  assignedToId?: string | null;
  assignedTo?: GuildCaseIdentity | null;
  player?: { id: string; nickname: string; userId?: string };
  dueAt?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  entries: GuildCaseEntry[];
};

export type GuildCaseStaffWorkspace = {
  cases: GuildCase[];
  auctionDisputes: AuctionDispute[];
  assignees: GuildCaseIdentity[];
  automaticDisciplinaryDecision: false;
};

export type OnboardingCompletionType =
  | "MANUAL"
  | "RULES_ACK"
  | "PROFILE"
  | "TIMEZONE"
  | "BUILD"
  | "WISHLIST"
  | "FIRST_EVENT";

export type OnboardingStep = {
  id: string;
  key: string;
  titlePt: string;
  titleEn: string;
  descriptionPt: string;
  descriptionEn: string;
  href: string;
  isRequired: boolean;
  completionType: OnboardingCompletionType;
  displayOrder: number;
  completedAt?: string | null;
};

export type OnboardingTemplate = {
  id: string;
  name: string;
  version: number;
  dueDays: number;
  isActive: boolean;
  createdAt: string;
  steps: OnboardingStep[];
};

export type PlayerOnboardingWorkspace = {
  plan: null | {
    id: string;
    startedAt: string;
    dueAt: string;
    completedAt?: string | null;
    staffNote?: string | null;
    template: Pick<OnboardingTemplate, "id" | "name" | "version">;
    steps: OnboardingStep[];
  };
  nextStep: OnboardingStep | null;
  progress: {
    completed: number;
    total: number;
    requiredCompleted: number;
    requiredTotal: number;
  };
};

export type OnboardingStaffWorkspace = {
  activeTemplate: OnboardingTemplate | null;
  templates: OnboardingTemplate[];
  plans: Array<
    PlayerOnboardingWorkspace["plan"] & {
      player: { id: string; nickname: string; isActive: boolean };
    }
  >;
};

export type PlayerTrialStatus = "ACTIVE" | "EXTENDED" | "APPROVED" | "CLOSED";
export type PlayerTrialDecisionType = "APPROVE" | "EXTEND" | "CLOSE";
export type PlayerTrialCriterion = {
  id: string;
  key: string;
  titlePt: string;
  titleEn: string;
  descriptionPt: string;
  descriptionEn: string;
  isRequired: boolean;
  displayOrder: number;
};
export type PlayerTrialCheckIn = {
  id: string;
  day: number;
  scheduledAt: string;
  completedAt?: string | null;
  bodyPt?: string | null;
  bodyEn?: string | null;
  internalNote?: string | null;
  author?: GuildCaseIdentity | null;
};
export type PlayerTrial = {
  id: string;
  playerId: string;
  objectivePt: string;
  objectiveEn: string;
  plannedStartAt: string;
  plannedEndAt: string;
  status: PlayerTrialStatus;
  decisionType?: PlayerTrialDecisionType | null;
  decisionReasonPt?: string | null;
  decisionReasonEn?: string | null;
  decidedAt?: string | null;
  criteria: PlayerTrialCriterion[];
  checkIns: PlayerTrialCheckIn[];
  player?: { id: string; nickname: string; userId: string; isActive: boolean };
  createdBy?: GuildCaseIdentity;
  decidedBy?: GuildCaseIdentity | null;
};
export type PlayerTrialWorkspace = {
  trial: PlayerTrial | null;
  pause: null | {
    absenceId: string;
    startsAt: string;
    endsAt: string;
    reason?: string | null;
    reasonVisibility: string;
  };
  pausedDays?: number;
  adjustedEndAt: string | null;
  effectiveStatus?: PlayerTrialStatus | "PAUSED";
  automaticDecision: false;
  affectsLoot?: false;
};
export type PlayerTrialStaffWorkspace = {
  trials: PlayerTrialWorkspace[];
  players: Array<{ id: string; nickname: string }>;
  automaticDecision: false;
  affectsLoot: false;
};

export type MentorshipHelpTopic =
  | "BOSS"
  | "BUILD"
  | "ROLE"
  | "EVENTS"
  | "REQUESTS"
  | "INTERESTS"
  | "WAR_ROOM"
  | "OTHER";
export type MentorshipPlayer = {
  id: string;
  nickname: string;
  class: PlayerClass;
};
export type MentorshipAssignment = {
  id: string;
  menteeId: string;
  mentorId?: string | null;
  groupName?: string | null;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  startedAt: string;
  endedAt?: string | null;
  mentee?: MentorshipPlayer;
  mentor?: MentorshipPlayer | null;
};
export type MentorshipHelpRequest = {
  id: string;
  requesterId: string;
  topic: MentorshipHelpTopic;
  requestedRole?: PlayerCombatRole | null;
  body?: string | null;
  status: "OPEN" | "ASSIGNED" | "RESOLVED" | "CANCELLED";
  assignedMentorId?: string | null;
  createdAt: string;
  requester?: MentorshipPlayer;
  assignedMentor?: MentorshipPlayer | null;
};
export type MentorshipWorkspace = {
  mentorProfile?: {
    isAvailable: boolean;
    topics: MentorshipHelpTopic[];
    roles: PlayerCombatRole[];
    notePt?: string | null;
    noteEn?: string | null;
  } | null;
  asMentee: MentorshipAssignment[];
  asMentor: MentorshipAssignment[];
  ownHelp: MentorshipHelpRequest[];
  assignedHelp: MentorshipHelpRequest[];
  milestones: Array<{ key: string; achievedAt?: string | null }>;
  milestonePoints: null;
  mentorCanDiscipline: false;
  staffNotesExposed: false;
};
export type MentorshipStaffWorkspace = {
  assignments: MentorshipAssignment[];
  helpRequests: MentorshipHelpRequest[];
  volunteers: Array<{
    playerId: string;
    topics: MentorshipHelpTopic[];
    roles: PlayerCombatRole[];
    player: MentorshipPlayer;
  }>;
  players: MentorshipPlayer[];
  milestonePoints: null;
  mentorCanDiscipline: false;
  staffNotesExposed: false;
};

export type GuildPulseCycle = {
  id: string;
  titlePt: string;
  titleEn: string;
  opensAt: string;
  closesAt: string;
  status?: "DRAFT" | "OPEN" | "CLOSED";
  minGroupSize: number;
  openTextDays: number;
};
export type GuildPulseMine = {
  cycle: GuildPulseCycle | null;
  participation: { status: "SUBMITTED" | "SKIPPED"; updatedAt: string } | null;
  optional: true;
  anonymousResponse?: true;
  identityStoredSeparately?: true;
  consequencesForSkipping: false;
};
export type GuildPulseAggregate = {
  cycle: GuildPulseCycle;
  responseCount: number;
  minGroupSize: number;
  aggregationAvailable: boolean;
  missingForAggregate: number;
  participation: Array<{ status: string; count: number }>;
  averages: null | {
    belonging: number;
    clarity: number;
    workload: number;
    fun: number;
    helpSafety: number;
  };
  openTexts: Array<{
    id: string;
    openText: string;
    moderationStatus: "PENDING" | "APPROVED" | "HIDDEN";
    createdAt: string;
  }>;
};
export type GuildPulseStaffWorkspace = {
  cycles: GuildPulseAggregate[];
  individualScoresExposed: false;
  loyaltyScore: null;
  automaticConsequences: false;
};
export type GuildHealthSignal = {
  key: string;
  kind: string;
  subjectType: "PLAYER" | "COHORT";
  subjectId: string;
  subjectLabel: string;
  facts: Array<{ label: string; value: string | number }>;
  window: { startsAt: string; endsAt: string; label: string };
  explanation: string;
  href: string;
  recommendedAction: string;
  automaticAction: false;
  affectsLoot: false;
  loyaltyScore: null;
};
export type GuildHealthSignals = {
  generatedAt: string;
  signals: GuildHealthSignal[];
  signalCount: number;
  loyaltyScore: null;
  automaticRemoval: false;
  automaticLootEffect: false;
  automaticBlocking: false;
};
export type LeadershipArea =
  | "EVENTS"
  | "LOOT"
  | "RECRUITMENT"
  | "DISCORD"
  | "DEPLOY"
  | "TREASURY"
  | "PLAYER_CARE";
export type LeadershipHealthWorkspace = {
  window: { startsAt: string; endsAt: string; days: number };
  currentCheckIns: Array<{
    id: string;
    userId: string;
    area: LeadershipArea;
    workload: number;
    availableOnCall: boolean;
    note?: string | null;
    createdAt: string;
    user: {
      id: string;
      discordUsername: string;
      discordNickname?: string | null;
    };
  }>;
  areaCoverage: Array<{
    area: LeadershipArea;
    availableCount: number;
    available: Array<{
      id: string;
      discordUsername: string;
      discordNickname?: string | null;
    }>;
    withoutSubstitute: boolean;
  }>;
  concentration: Array<{
    area: LeadershipArea;
    totalActions: number;
    leaderUserId?: string | null;
    leaderActions: number;
    leaderShare: number;
    concentrated: boolean;
  }>;
  alerts: Array<{
    key: string;
    area: LeadershipArea;
    kind: string;
    facts: Record<string, string | number | boolean>;
    recommendation: string;
    automaticAction: false;
  }>;
  automaticEscalation: false;
  permissionsChanged: false;
};
export type StaffTaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type StaffTaskStatus =
  "OPEN" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELLED";
export type StaffIdentity = {
  id: string;
  discordUsername: string;
  discordNickname?: string | null;
};
export type StaffTask = {
  id: string;
  title: string;
  description: string;
  area: LeadershipArea;
  priority: StaffTaskPriority;
  status: StaffTaskStatus;
  ownerId?: string | null;
  substituteId?: string | null;
  dueAt?: string | null;
  href: string;
  sourceType?: string | null;
  sourceKey?: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: StaffIdentity | null;
  substitute?: StaffIdentity | null;
  handoffs: Array<{
    id: string;
    context: string;
    nextStep: string;
    toOwnerId?: string | null;
    createdAt: string;
    author: StaffIdentity;
  }>;
};
export type StaffTaskSuggestion = {
  sourceType: string;
  sourceKey: string;
  title: string;
  description: string;
  href: string;
  priority: StaffTaskPriority;
  area: LeadershipArea;
};
export type StaffTaskWorkspace = {
  tasks: StaffTask[];
  assignees: StaffIdentity[];
  suggestions: StaffTaskSuggestion[];
  counts: { open: number; unowned: number; overdue: number };
  suggestionsRequireConfirmation: true;
  automaticTaskCreation: false;
};
export type StaffAreaCoverageConfiguration = {
  id: string;
  area: LeadershipArea;
  primaryUserId?: string | null;
  backupUserId?: string | null;
  onCallStartsAt: string;
  onCallEndsAt: string;
  timezone: string;
  primaryUser?: StaffIdentity | null;
  backupUser?: StaffIdentity | null;
};
export type StaffAvailabilityPeriod = {
  id: string;
  userId: string;
  startsAt: string;
  endsAt: string;
  reason?: string | null;
  user: StaffIdentity;
  isMine: boolean;
};
export type StaffCoverageWorkspace = {
  generatedAt: string;
  coverage: Array<{
    area: LeadershipArea;
    configuration: StaffAreaCoverageConfiguration | null;
    primaryUnavailable: boolean;
    backupUnavailable: boolean;
    effectiveResponsible: StaffIdentity | null;
    escalationReason: "DECLARED_UNAVAILABILITY" | null;
    missingBackup: boolean;
    permissionChanged: false;
  }>;
  assignees: StaffIdentity[];
  declaredUnavailability: StaffAvailabilityPeriod[];
  escalationUsesDeclaredUnavailabilityOnly: true;
  silenceNeverTriggersEscalation: true;
  permissionsSeparateFromResponsibility: true;
  counts: { areasWithoutPrimary: number; areasWithoutBackup: number };
};
export type StaffAutomationProposal = {
  sourcePattern: string;
  observedCount: number;
  observedWindowDays: number;
  name: string;
  taskTitle: string;
  taskDescription: string;
  taskArea: LeadershipArea;
  taskHref: string;
  frequencyMinutes: number;
  maxRunsPerDay: number;
};
export type StaffAutomationRule = {
  id: string;
  name: string;
  action: "CREATE_STAFF_TASK";
  sourcePattern: string;
  taskTitle: string;
  taskDescription: string;
  taskArea: LeadershipArea;
  taskHref: string;
  frequencyMinutes: number;
  maxRunsPerDay: number;
  enabled: boolean;
  killSwitch: boolean;
  dryRunPreview: Record<string, unknown>;
  activatedAt?: string | null;
  lastRunAt?: string | null;
  createdAt: string;
  runs: Array<{
    id: string;
    status: string;
    taskId?: string | null;
    createdAt: string;
  }>;
};
export type StaffAutomationWorkspace = {
  rules: StaffAutomationRule[];
  proposals: StaffAutomationProposal[];
  safeAction: "CREATE_STAFF_TASK";
  requiresObservedPattern: true;
  dryRunAndConfirmationRequired: true;
  forbiddenActions: string[];
};
export type PlaybookRoleInstruction = {
  id?: string;
  roleKey: string;
  titlePt: string;
  titleEn: string;
  bodyPt: string;
  bodyEn: string;
};
export type GuildPlaybookVersion = {
  id: string;
  playbookId: string;
  version: number;
  objectivePt: string;
  objectiveEn: string;
  publicBriefPt: string;
  publicBriefEn: string;
  staffNotes?: string | null;
  compositionTarget: string[];
  positioning: string[];
  calls: string[];
  risks: string[];
  links: string[];
  checklist: string[];
  lessons: Array<Record<string, unknown>>;
  roleInstructions: PlaybookRoleInstruction[];
  createdAt: string;
};
export type GuildPlaybook = {
  id: string;
  key: string;
  title: string;
  contentType: string;
  versions: GuildPlaybookVersion[];
};
export type PlaybookStaffWorkspace = {
  playbooks: GuildPlaybook[];
  assignments: Array<{
    id: string;
    version: GuildPlaybookVersion & { playbook: GuildPlaybook };
    event?: { id: string; name: string; startsAt: string } | null;
    operation?: { id: string; name: string; startsAt: string } | null;
    receipts: Array<{ id: string }>;
  }>;
  lessons: Array<{
    id: string;
    operationId: string;
    sourceKey: string;
    title: string;
    lessonPt: string;
    lessonEn: string;
    disposition: "KEEP" | "TEST" | "DISCARD";
    reviewAt: string;
    promotedVersionId?: string | null;
  }>;
  operations: Array<{
    id: string;
    name: string;
    startsAt: string;
    status: string;
  }>;
  events: Array<{ id: string; name: string; startsAt: string; status: string }>;
  staff: StaffIdentity[];
  immutableVersions: true;
  playerStaffNotesExposed: false;
};
export type PlaybookMine = {
  assignments: Array<{
    assignmentId: string;
    playbookTitle: string;
    version: number;
    event?: { id: string; name: string; startsAt: string } | null;
    operation?: { id: string; name: string; startsAt: string } | null;
    objectivePt: string;
    objectiveEn: string;
    publicBriefPt: string;
    publicBriefEn: string;
    roleKey: string;
    instruction: PlaybookRoleInstruction | null;
    instructionConfirmedAt?: string | null;
  }>;
  staffNotesExposed: false;
};
export type CommunicationChannel = "WEB" | "DISCORD" | "BOTH" | "NONE";
export type DigestCadence = "DAILY" | "WEEKLY" | "NONE";
export type CommunicationPreference = {
  playerId: string;
  eventChannel: CommunicationChannel;
  ownLootChannel: CommunicationChannel;
  requestChannel: CommunicationChannel;
  progressChannel: CommunicationChannel;
  announcementChannel: CommunicationChannel;
  reminderChannel: CommunicationChannel;
  quietStartsAt?: string | null;
  quietEndsAt?: string | null;
  timezone: string;
  digestCadence: DigestCadence;
  criticalBypassesQuietHours: boolean;
};
export type PersonalDigest = {
  generatedAt: string;
  items: Array<{
    key: string;
    title: string;
    body: string;
    href: string;
    deadline?: string | null;
    count: number;
    latestAt: string;
  }>;
  groupedByCanonicalObject: true;
  thirdPartyDataIncluded: false;
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
  eligibilityStatus: "ELIGIBLE" | "INELIGIBLE" | "NEEDS_STAFF_REVIEW";
  eligibilityReason: string;
};

export type EligibilityResponse = {
  playerId: string;
  auctionId: string;
  canBid: boolean;
  eligibilityStatus: EligibilityRow["eligibilityStatus"];
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

export type StaffReviewAlert = {
  key: string;
  playerId?: string;
  severity: "info" | "warning" | "danger";
  title: string;
  explanation: string;
  evidenceHref: string;
};

export type StaffReviewDetails = Auction & {
  ranking: EligibilityRow[];
  assistedReview?: {
    alerts: StaffReviewAlert[];
    overriddenAlertKeys: string[];
  };
};

export type GuildProgressReport = {
  period: "week" | "month";
  start: string;
  end: string;
  generatedAt: string;
  counts: {
    finalizedEvents: number;
    attendances: number;
    dropsDelivered: number;
    auctionsFinished: number;
    requestsDelivered: number;
    progressApproved: number;
    warRoomOperations: number;
    activeWishlistItems: number;
    pendingRisks: number;
  };
  classDistribution: Array<{
    class: string;
    active: number;
    layer4Plus: number;
    lowAttendance: number;
  }>;
  risks: Array<{
    key: string;
    label: string;
    severity: "info" | "warning" | "danger";
    detail: string;
    href: string;
  }>;
  nextActions: Array<{
    label: string;
    href: string;
    reason: string;
    priority: OperationPriority;
  }>;
  markdown: string;
};

export type PlayerWeeklySafeSummary = {
  period: "week" | "month";
  start: string;
  end: string;
  generatedAt: string;
  titlePt: string;
  titleEn: string;
  summaryPt: string;
  summaryEn: string;
  collective: {
    finalizedEvents: number;
    dropsDelivered: number;
    auctionsFinished: number;
    requestsDelivered: number;
    warRoomOperations: number;
  };
  actionLinks: Array<{ labelPt: string; labelEn: string; href: string }>;
};

export type RecruitmentApplicationStatus =
  "PENDING" | "TRIAGE" | "ACCEPTED" | "REJECTED" | "CONVERTED" | "ARCHIVED";

export type RecruitmentApplication = {
  id: string;
  nickname: string;
  discordTag?: string | null;
  playerClass: PlayerClass;
  combatPower: number;
  dimensionalLayer: number;
  availability: string;
  focus: string;
  experience: string;
  proofImageUrl?: string | null;
  notes?: string | null;
  rulesAccepted: boolean;
  status: RecruitmentApplicationStatus;
  reviewedById?: string | null;
  convertedById?: string | null;
  convertedPlayerId?: string | null;
  reviewedAt?: string | null;
  convertedAt?: string | null;
  reviewNote?: string | null;
  convertedPlayer?: {
    id: string;
    nickname: string;
    class: PlayerClass;
    dimensionalLayer: number;
    combatPower: number;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type EventRecord = SharedEventRecord<string>;
export type EventChecklistItem = SharedEventChecklistItem<string>;
export type EventOperationalCategory = SharedEventOperationalCategory;
export type EventOperationalPriority = SharedEventOperationalPriority;
export type EventCompositionTarget = SharedEventCompositionTarget;
export type EventSeriesRecord = SharedEventSeriesRecord<string> & {
  _count?: { events: number };
};
export type EventReserveEntryRecord = SharedEventReserveEntryRecord<string>;
export type EventReserveStatus = SharedEventReserveStatus;
export type EventReminderChannel = SharedEventReminderChannel;
export type EventNoShowRecord = SharedEventNoShowRecord<string>;
export type EventRsvpStatus = SharedEventRsvpStatus;
export type EventRsvpNoteVisibility = SharedEventRsvpNoteVisibility;
export type EventRsvpRecord = SharedEventRsvpRecord<string>;
export type PlayerEventCommitment = SharedPlayerEventCommitment<string>;
export type EventRsvpStaffSummary = SharedEventRsvpStaffSummary<string>;
export type PlayerAbsenceReasonVisibility = SharedPlayerAbsenceReasonVisibility;
export type PlayerAbsenceRecord = SharedPlayerAbsenceRecord<string>;
export type FinalizeEventResult = SharedFinalizeEventResult<
  EventRecord,
  string
>;
export type EventFinalizationChecklist = SharedEventFinalizationChecklist<
  string,
  PlayerClass
>;
export type EventBatchPanel = SharedEventBatchPanel<string>;
export type EventReadinessReport = SharedEventReadinessReport<
  string,
  PlayerClass,
  ProgressReviewStatus
>;
export type EventDetails = SharedEventDetails<string, PlayerProfile>;
export type EventAttendanceRow = EventDetails["attendances"][number];
export type AttendanceStats = SharedAttendanceStats;
export type PlayerAttendanceHistoryRow =
  SharedPlayerAttendanceHistoryRow<string>;

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
  averageDkp: number;
  medianDkp: number;
  top10DkpSharePercent: number;
  recentActivePlayers: number;
  distribution: Array<{
    bucket: string;
    min: number;
    max: number | null;
    players: number;
    totalDkp: number;
  }>;
  topBalances: DkpLeaderboardRow[];
  topEarners: Array<{ playerId: string; nickname: string; amount: number }>;
  topSpenders: Array<{ playerId: string; nickname: string; amount: number }>;
  inactiveHighDkpPlayers: Array<{
    playerId: string;
    nickname: string;
    total: number;
    lastActivityAt?: string | null;
  }>;
  signals: Array<{
    key: string;
    label: string;
    detail: string;
    severity: "info" | "warning" | "danger";
  }>;
  markdown: string;
};

export type DkpDecaySimulationSummary = {
  generatedAt: string;
  persisted: boolean;
  simulationId?: string;
  name?: string;
  config: {
    percent: number;
    minimumDkp: number;
  };
  totals: {
    players: number;
    affectedPlayers: number;
    totalBefore: number;
    totalAfter: number;
    totalReduced: number;
  };
  distributionBefore: DkpEconomySummary["distribution"];
  distributionAfter: DkpEconomySummary["distribution"];
  topImpacted: Array<{
    playerId: string;
    nickname: string;
    before: number;
    after: number;
    reduced: number;
  }>;
  markdown: string;
};

export type DkpBidPolicySimulationSummary = {
  generatedAt: string;
  persisted: boolean;
  simulationId?: string;
  name?: string;
  config: {
    minimumCost: number;
    winTaxPercent: number;
    tierCaps: Record<string, number>;
    itemTypeCaps: Record<string, number>;
    layerCaps: Record<string, number>;
    fixedCostByTier: Record<string, number>;
    modeMultiplierPercent: Record<string, number>;
  };
  totals: {
    auctionsAnalyzed: number;
    changedAuctions: number;
    currentSpent: number;
    proposedSpent: number;
    delta: number;
    cappedAuctions: number;
    raisedByFloorAuctions: number;
  };
  rows: Array<{
    auctionId: string;
    itemName: string;
    itemTier: ItemTier;
    itemType: ItemType;
    auctionMode: AuctionMode;
    winnerPlayerId: string;
    winnerNickname: string;
    winnerLayer: number;
    currentCost: number;
    proposedCost: number;
    delta: number;
    capApplied?: number | null;
    floorApplied: boolean;
    taxAmount: number;
  }>;
  risks: Array<{
    key: string;
    label: string;
    detail: string;
    severity: "info" | "warning" | "danger";
  }>;
  markdown: string;
};

export type DkpPolicySimulation = {
  id: string;
  type: "DECAY" | "BID_POLICY";
  status: "DRAFT" | "PROMOTED" | "ARCHIVED";
  name: string;
  config: unknown;
  result: unknown;
  createdById: string;
  promotedById?: string | null;
  promotedAt?: string | null;
  promotionReason?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PromotedDkpPolicySimulation = {
  simulation: DkpPolicySimulation;
  businessRule: BusinessRule;
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
  source: "AUCTION" | "INTEREST" | "LEGACY_OR_REQUEST";
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
  auctions: Array<
    Auction & {
      itemCatalog?: ItemCatalog;
      bids?: AuctionBid[];
      dropHistory?: DropHistory & { player?: PlayerProfile };
    }
  >;
  interestPosts: Array<
    ItemInterestPost & {
      entries?: Array<{
        id: string;
        player?: PlayerProfile;
        imageUrl?: string;
        isTransmuteRequest?: boolean;
        status: string;
        createdAt: string;
      }>;
      votes?: Array<{
        id: string;
        voter?: { discordUsername: string; discordNickname?: string };
        targetPlayerId: string;
        createdAt: string;
      }>;
      dropHistory?: DropHistory[];
    }
  >;
  winners: Array<{
    auctionId: string;
    auctionTitle: string;
    player?: PlayerProfile;
    deliveredAt?: string;
  }>;
  logs: AuditLog[];
};

export type PlayerStaffNote = {
  id: string;
  playerId: string;
  authorId: string;
  severity: "INFO" | "WARNING" | "STRIKE";
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
  eventReminderChannel?: EventReminderChannel;
  attendancePercentage: number;
  combatProfile?: PlayerCombatProfile | null;
};

export type PlayerCombatProfile = SharedPlayerCombatProfileRecord<
  string,
  PlayerClass
>;

export type PlayerCombatProfileChangeRequest =
  SharedPlayerCombatProfileChangeRequestRecord<string, PlayerClass> & {
    player?: StaffPlayer & { combatProfile?: PlayerCombatProfile | null };
  };

export type RosterCompositionMatrix = SharedRosterCompositionMatrix<
  string,
  PlayerClass
>;

export type WarRoomOperationType = SharedWarRoomOperationType;
export type WarRoomOperationStatus = SharedWarRoomOperationStatus;
export type WarRoomOperationPriority = SharedWarRoomOperationPriority;
export type WarRoomInternalLink = SharedWarRoomInternalLink;
export type WarRoomOperation = SharedWarRoomOperationRecord<string>;
export type WarRoomRosterSlotStatus = SharedWarRoomRosterSlotStatus;
export type WarRoomRosterConflict = SharedWarRoomRosterConflict<string>;
export type WarRoomRosterSlot = SharedWarRoomRosterSlotRecord<
  string,
  PlayerClass
>;
export type WarRoomRosterDossier = SharedWarRoomRosterDossier<
  string,
  PlayerClass
>;
export type PlayerWarRoomAssignment = SharedPlayerWarRoomAssignment<
  string,
  PlayerClass
>;
export type WarRoomTimelineEventType = SharedWarRoomTimelineEventType;
export type WarRoomTimelineEvent = SharedWarRoomTimelineEventRecord<string>;
export type WarRoomLiveDossier = SharedWarRoomLiveDossier<string, PlayerClass>;
export type WarRoomAfterActionReport = SharedWarRoomAfterActionReport<
  string,
  PlayerClass
>;

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
  urgency?: "overdue" | "urgent" | "today";
  ageHours?: number;
  deliveryDueAt?: string;
  priorityReason?: string;
};

export type PublishedAuctionResult = {
  id: string;
  auctionId: string;
  itemNamePt: string;
  itemNameEn: string;
  itemTier?: ItemTier;
  itemType?: ItemType;
  auctionMode?: AuctionMode;
  winner: { id: string; nickname: string };
  proofImageUrl: string;
  itemImageUrl?: string | null;
  deliveredAt: string;
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
  tone?: "gold" | "green" | "red" | "blue" | "muted";
  href?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

export type PlayerHistory = {
  discordId?: string;
  player?: PlayerProfile & {
    user?: {
      discordId: string;
      discordUsername: string;
      preferredLocale?: string;
    };
  };
  drops: DropHistory[];
  progress: PlayerProgress[];
  itemRequests: ItemRequest[];
  transactions?: Transaction[];
  daoshiReceipts?: DaoshiCashReceipt[];
  codexRequests?: CodexRequest[];
  auctionBids?: AuctionBid[];
  attendances?: Array<{
    id: string;
    attended: boolean;
    createdAt: string;
    event: EventRecord;
  }>;
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
  deactivatedAt?: string;
  deactivationReason?: string;
  reactivationRequestedAt?: string;
  user: {
    discordId: string;
    discordUsername: string;
    discordNickname?: string;
    preferredLocale?: string;
  };
  roles: Array<{ role: { name: string } }>;
};

export type AnnouncementStatus = "ACTIVE" | "SENT" | "CANCELLED";

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
  kind: "item" | "auction" | "event" | "player";
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
    severity: "high" | "medium" | "low";
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
  reviewAuctions: Array<{
    id: string;
    itemName: string;
    status: string;
    updatedAt: string;
  }>;
  votingInterests: Array<{
    id: string;
    title: string;
    status: string;
    entries: number;
    updatedAt: string;
  }>;
  openEventRows: Array<{
    id: string;
    name: string;
    type: string;
    startsAt: string;
    status: string;
  }>;
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

export type GuildPolicyVersion = SharedGuildPolicyVersionRecord<string>;
export type GuildPolicyPublicWorkspace =
  SharedGuildPolicyPublicWorkspace<string>;
export type GuildPolicyStaffWorkspace = SharedGuildPolicyStaffWorkspace<string>;

export type LegacyAuditSummary = {
  generatedAt: string;
  unlinkedDrops: number;
  unlinkedRequests: number;
  itemsWithoutTier: number;
  itemsWithoutType: number;
  inactiveItems: number;
  recentUnlinkedDrops: Array<{
    id: string;
    discordId?: string;
    nicknameIngame?: string;
    itemName?: string;
    deliveredAt?: string;
  }>;
  recentUnlinkedRequests: Array<{
    id: string;
    discordId: string;
    playerName: string;
    itemName: string;
    updatedAt: string;
  }>;
};

export type DiscordTemplateSummary = {
  templates: Array<{
    key: string;
    channel: string;
    title: string;
    preview: string;
    playerFacing: boolean;
    previews: Array<{
      locale: "pt-BR" | "en";
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

export type DiscordWebhookDeliveryStatus =
  "PENDING" | "SENDING" | "SENT" | "FAILED" | "RETRYING";

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

export type AuctionFinalizationPreview =
  SharedAuctionFinalizationPreview<string>;

export type AuctionDossier = SharedAuctionDossier<string>;

export type UniversalDossierType =
  "player" | "auction" | "request" | "interest" | "drop" | "event";

export type UniversalDossier = {
  generatedAt: string;
  type: UniversalDossierType;
  id: string;
  title: string;
  summary: Array<{ label: string; value: string }>;
  riskFlags?: Array<{
    key: string;
    label: string;
    severity: "info" | "warning" | "danger";
    explanation: string;
    evidenceHref: string;
  }>;
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

export type ContextualEligibilityType =
  "auction" | "request" | "war-room" | "recruitment";

export type ContextualEligibilityDecision = "eligible" | "review" | "blocked";

export type ContextualEligibilityReason = {
  key: string;
  label: string;
  status: ContextualEligibilityDecision;
  explanation: string;
  metric?: string;
  rule?: string;
  evidenceHref?: string;
};

export type ContextualEligibilitySummary = {
  generatedAt: string;
  context: {
    type: ContextualEligibilityType;
    id?: string | null;
    label: string;
  };
  player: {
    id: string;
    nickname: string;
    class: PlayerClass | string;
    dimensionalLayer: number;
    attendancePercentage: number;
    availableDkp: number;
    combatPower: number;
    build?: string | null;
    preferredRole?: PlayerCombatRole | string | null;
  };
  decision: ContextualEligibilityDecision;
  headline: string;
  reasons: ContextualEligibilityReason[];
  appliedRules: string[];
  evidenceLinks: Array<{ label: string; href: string }>;
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

export type WeeklyGuildSummary = Omit<SeasonMonthlySummary, "month"> & {
  weekStart: string;
  weekEnd: string;
};

export type ProductValidationInterviewProfile =
  | "STAFF_LEADERSHIP"
  | "STAFF_EVENTS"
  | "STAFF_LOOT"
  | "PLAYER_VETERAN"
  | "PLAYER_NEW"
  | "PLAYER_ACTIVE"
  | "PLAYER_LOW_ACTIVITY";

export type ProductValidationAbsenceVisibility =
  | "PUBLIC"
  | "STAFF_ONLY"
  | "ANONYMOUS"
  | "DEPENDS_ON_REASON";

export type ProductValidationWorkspace = {
  campaignKey: string;
  timezone: "America/Sao_Paulo";
  status: "COLLECTING_EVIDENCE" | "READY_FOR_STAFF_DECISION";
  privacy: {
    staffOnly: true;
    storeParticipantIdentity: false;
    storePrivateVoiceOrDmContent: false;
  };
  gate: {
    interviewsReady: boolean;
    baselineReady: boolean;
    rsvpValidated: boolean;
    staffProfilesCovered: ProductValidationInterviewProfile[];
    requiredStaffProfiles: ProductValidationInterviewProfile[];
    playerInterviewCount: number;
    playerProfilesCovered: ProductValidationInterviewProfile[];
    requiredPlayerInterviewMin: number;
    recommendedPlayerInterviewMax: number;
    weeksCaptured: number;
    consecutiveWeeks: number;
    requiredWeeks: number;
  };
  interviews: Array<{
    id: string;
    profile: ProductValidationInterviewProfile;
    channels: string[];
    absenceVisibility: ProductValidationAbsenceVisibility;
    rsvpWouldReduceManualCharge: boolean;
    summary: string;
    interviewedAt: string;
    recordedBy: AuditIdentity;
  }>;
  weeks: Array<{
    id: string;
    weekStart: string;
    weekEnd: string;
    eventsCreated: number;
    expectedAttendance: number | null;
    actualAttendance: number;
    noShows: number;
    staffConfirmationMinutes: number;
    recruitsConverted: number;
    recruitsWithActivity: number;
    singlePersonTasks: number;
    note: string | null;
    capturedBy: AuditIdentity;
  }>;
};
