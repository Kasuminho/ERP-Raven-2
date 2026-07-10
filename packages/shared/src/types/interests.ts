export type ItemInterestStatus = 'OPEN' | 'CLOSED' | 'VOTING' | 'READY_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

export type ItemInterestLootStats<TDate = string | Date> = {
  queueDays: number;
  totalDrops: number;
  sameItemDrops: number;
  sameTypeDrops: number;
  lastDropAt?: TDate | null;
};

export type ItemInterestStaffComparison<TDate = string | Date, TItemTier = string, TItemType = string> = {
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
    itemTier?: TItemTier | null;
    itemType?: TItemType | null;
  }>;
  latestStaffNote?: {
    severity: string;
    body: string;
    createdAt: TDate;
    authorName: string;
  } | null;
  recentLoot: ItemInterestLootStats<TDate>;
  decisionSignalsPt: string[];
  summaryPt: string;
};

export type ItemInterestVote<TVoter = unknown> = {
  id: string;
  entryId: string;
  voterId: string;
  round: number;
  voter?: TVoter;
};

export type ItemInterestEntryRelations<
  TDate = string | Date,
  TPlayer = unknown,
  TVote = ItemInterestVote,
  TStaffComparison = ItemInterestStaffComparison<TDate>,
> = {
  player: TPlayer;
  dropHistory?: {
    id: string;
    deliveredAt?: TDate | null;
  } | null;
  votes: TVote[];
  lootStats?: ItemInterestLootStats<TDate>;
  staffComparison?: TStaffComparison;
};

export type ItemInterestEntryRecord<
  TDate = string | Date,
  TPlayer = unknown,
  TStaffComparison = ItemInterestStaffComparison<TDate>,
  TVote = ItemInterestVote,
> = {
  id: string;
  postId: string;
  playerId: string;
  note?: string | null;
  imageUrl?: string | null;
  isTransmuteRequest: boolean;
  createdAt: TDate;
  dropHistory?: {
    id: string;
    deliveredAt?: TDate | null;
  } | null;
  lootStats?: ItemInterestLootStats<TDate>;
  staffComparison?: TStaffComparison;
  player?: TPlayer;
  votes?: TVote[];
};

export type ItemInterestPostRelations<
  TDate = string | Date,
  TItemCatalog = unknown,
  TEntry = ItemInterestEntryRecord<TDate>,
  TVote = ItemInterestVote,
  TView = { seenAt: TDate },
> = {
  itemCatalog: TItemCatalog;
  entries: TEntry[];
  votes: TVote[];
  views?: TView[];
  viewerHasDeclared?: boolean;
  viewerSeenAt?: TDate | null;
};

export type ItemInterestPostRecord<
  TDate = string | Date,
  TItemCatalog = unknown,
  TEntry = ItemInterestEntryRecord<TDate>,
  TVote = ItemInterestVote,
> = {
  id: string;
  itemCatalogId: string;
  mode: 'PvE' | 'PvP';
  title: string;
  criteriaPt: string;
  criteriaEn: string;
  status: ItemInterestStatus;
  votingRound: number;
  votingCandidateEntryIds?: string[];
  selectedEntryId?: string | null;
  deliveryEnabledAt?: TDate | null;
  closesAt: TDate;
  closedAt?: TDate | null;
  proofImageUrl?: string | null;
  createdAt: TDate;
  updatedAt: TDate;
  itemCatalog?: TItemCatalog;
  entries?: TEntry[];
  votes?: TVote[];
  viewerHasDeclared?: boolean;
  viewerSeenAt?: TDate | null;
};
