export type ItemRequestUpdateStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type ItemRequestQueueUpdateStage = 'clear' | 'warned_3d' | 'warned_4d' | 'pending_review' | 'boss_manual';

export type ItemRequestMaterialPriorityReason = 'NONE' | 'T3_CRAFT_PRIORITY' | 'T3_CRAFT_OVER_QUINTESSENCE';

export type ItemRequestQueueForecast<TDate = string | Date> = {
  position: number;
  queueSize: number;
  requestsAhead: number;
  unitsAhead: number;
  estimatedDeliveriesBefore: number;
  isNext: boolean;
  needsUpdate: boolean;
  updateStage: ItemRequestQueueUpdateStage;
  lastUpdateAt: TDate;
  daysSinceUpdate: number;
  lastDeliveryAt?: TDate | null;
  lastDeliveryPlayerName?: string | null;
  summaryPt: string;
  summaryEn: string;
  staffSummaryPt: string;
};

export type ItemRequestSwapSuggestion<TItemTier = string, TItemType = string> = {
  itemCatalogId: string;
  itemName: string;
  itemNamePt: string;
  itemNameEn: string;
  category: string;
  itemTier?: TItemTier | null;
  itemType?: TItemType | null;
  queueSize: number;
  unitsInQueue: number;
  estimatedPosition: number;
  tradeoffPt: string;
  tradeoffEn: string;
};

export type ItemRequestMaterialPriority = {
  affected: boolean;
  reason: ItemRequestMaterialPriorityReason;
  materialKey?: string | null;
  blockingCraftRequests: number;
  blockingRequestIds: string[];
  blockingItemNames: string[];
  summaryPt: string;
  summaryEn: string;
  staffSummaryPt: string;
};

export type ItemRequestEnrichment<TDate = string | Date, TItemTier = string, TItemType = string> = {
  queueForecast?: ItemRequestQueueForecast<TDate>;
  swapSuggestions?: Array<ItemRequestSwapSuggestion<TItemTier, TItemType>>;
  materialPriority?: ItemRequestMaterialPriority;
};

export type ItemRequestRecord<
  TDate = string | Date,
  TItemCatalog = unknown,
  TPlayer = unknown,
  TItemTier = string,
  TItemType = string,
> = ItemRequestEnrichment<TDate, TItemTier, TItemType> & {
  id: string;
  legacyId?: number | null;
  itemCatalogId?: string | null;
  playerId?: string | null;
  discordId: string;
  playerName: string;
  itemName: string;
  imageUrl?: string | null;
  totalQuantity: number;
  remainingQuantity: number;
  rankPosition: number;
  threadId?: string | null;
  threadChannelId?: string | null;
  warned3d: boolean;
  warned4d: boolean;
  updateProofImageUrl?: string | null;
  updateProofNote?: string | null;
  updateProofStatus?: ItemRequestUpdateStatus | null;
  updateProofSubmittedAt?: TDate | null;
  updateProofReviewedAt?: TDate | null;
  updateProofReviewedById?: string | null;
  lastReminderStage?: string | null;
  lastReminderAt?: TDate | null;
  legacyCreatedAt?: TDate | null;
  legacyUpdatedAt?: TDate | null;
  createdAt: TDate;
  updatedAt: TDate;
  itemCatalog?: TItemCatalog | null;
  player?: TPlayer | null;
};
