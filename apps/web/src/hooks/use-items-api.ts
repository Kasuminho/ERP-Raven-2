import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { Announcement, AttendanceStats, Auction, AuctionBid, AuctionBidCancellationRequest, AuctionDiagnosticOption, AuctionDiagnosticSummary, AuctionDossier, AuctionFinalizationPreview, AuctionTimelineEvent, AuditIdentity, AuditLog, BusinessRule, CodexRequest, DaoshiCashReceipt, DaoshiMonthlySummary, DaoshiPlayerSummary, DaoshiRaffle, DaoshiReceiptStatus, DeploymentPanelSummary, DiscordTemplateSummary, DiscordWebhookQueueSummary, DkpEconomySummary, DkpLeaderboardRow, DropHistory, EligibilityResponse, EligibilityRow, EventBatchPanel, EventDetails, EventFinalizationChecklist, EventReadinessReport, EventRecord, EventType, FinalizeEventResult, GuildRulesSummary, IntegritySummary, InternalNotification, ItemAuditDrop, ItemAuditFull, ItemAuditSummary, ItemCatalog, ItemInterestPost, ItemInterestStatus, ItemRequest, ItemTier, ItemType, LegacyAuditSummary, LootFairnessSummary, MaintenanceModeSummary, NoticeBoardItem, OperationalHealthSummary, PendingAuctionDelivery, PlayerActionPlan, PlayerAttendanceHistoryRow, PlayerClass, PlayerComparisonSummary, PlayerHistory, PlayerOperationsSummary, PlayerProgress, PlayerStaffNote, ProgressCategory, SeasonMonthlySummary, StaffDayViewSummary, StaffDkpPlayerRow, StaffHealthSummary, StaffMeetingSummary, StaffMorningBriefing, StaffOperationsSummary, StaffPlayer, Transaction, UniversalDossier, UniversalDossierType, WeeklyGuildSummary } from '@/types/api';

export function useItems() {
  return useQuery({
    queryKey: ['items'],
    queryFn: async () => (await api.get<ItemCatalog[]>('/items', { params: { limit: 500 } })).data,
  });
}

export function useRequestableItems() {
  return useQuery({
    queryKey: ['items', 'requestable'],
    queryFn: async () => (await api.get<ItemCatalog[]>('/items/requestable')).data,
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      kind: string;
      category: string;
      itemTier: ItemTier;
      itemType: ItemType;
      namePt: string;
      nameEn: string;
      nameEs?: string;
      typePt: string;
      typeEn: string;
      typeEs?: string;
      preferredClasses?: PlayerClass[];
      image1Url?: string;
      image2Url?: string;
      createdById?: string;
    }) => (await api.post<ItemCatalog>('/items', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['items'] }),
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: string;
      kind?: string;
      category?: string;
      itemTier?: ItemTier;
      itemType?: ItemType;
      namePt?: string;
      nameEn?: string;
      nameEs?: string;
      typePt?: string;
      typeEn?: string;
      typeEs?: string;
      preferredClasses?: PlayerClass[];
      image1Url?: string;
      image2Url?: string;
      isActive?: boolean;
    }) => {
      const { id, ...payload } = data;
      return (await api.patch<ItemCatalog>(`/items/${id}`, payload)).data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['items'] }),
        queryClient.invalidateQueries({ queryKey: ['auctions'] }),
      ]);
    },
  });
}

export function useCreateItemAuctions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { itemId: string; quantity: number; createdById: string }) =>
      (await api.post<Auction[]>(`/items/${data.itemId}/auctions`, { quantity: data.quantity })).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['items'] }),
        queryClient.invalidateQueries({ queryKey: ['auctions'] }),
      ]);
    },
  });
}

export function useItemInterests(status?: ItemInterestStatus) {
  return useQuery({
    queryKey: ['item-interests', status ?? 'all'],
    queryFn: async () => (await api.get<ItemInterestPost[]>('/item-interests', { params: status ? { status } : undefined })).data,
  });
}

export function useStaffItemInterests(status?: ItemInterestStatus) {
  return useQuery({
    queryKey: ['item-interests', 'staff', status ?? 'all'],
    queryFn: async () => (await api.get<ItemInterestPost[]>('/item-interests/staff/list', { params: status ? { status } : undefined })).data,
  });
}

export function useCreateItemInterest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { itemCatalogId: string; mode?: 'PvE' | 'PvP'; title?: string; closesAt: string }) =>
      (await api.post<ItemInterestPost>('/item-interests', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['item-interests'] }),
  });
}

export function useCreateBulkItemInterests() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { itemCatalogIds: string[]; mode: 'PvE' | 'PvP'; closesAt: string }) =>
      (await api.post<ItemInterestPost[]>('/item-interests/bulk', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['item-interests'] }),
  });
}

export function useDeclareItemInterest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { postId: string; note?: string; imageUrl?: string; isTransmuteRequest?: boolean }) =>
      (await api.post(`/item-interests/${data.postId}/declare`, {
        note: data.note,
        imageUrl: data.imageUrl,
        isTransmuteRequest: data.isTransmuteRequest,
      })).data,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['item-interests'] }),
  });
}

export function useDeclareBulkItemInterests() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rows: Array<{ postId: string; note?: string; imageUrl?: string; isTransmuteRequest?: boolean }>) => {
      const declared = [];
      for (const row of rows) {
        declared.push((await api.post(`/item-interests/${row.postId}/declare`, {
          note: row.note,
          imageUrl: row.imageUrl,
          isTransmuteRequest: row.isTransmuteRequest,
        })).data);
      }
      return declared;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['item-interests'] }),
  });
}

export function useMarkItemInterestSeen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => (await api.post<{ seenAt: string }>(`/item-interests/${postId}/seen`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['item-interests'] }),
  });
}

export function useVoteItemInterest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { postId: string; entryId: string }) =>
      (await api.post<ItemInterestPost>(`/item-interests/${data.postId}/vote`, { entryId: data.entryId })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['item-interests'] }),
  });
}

export function useStartItemInterestTieBreak() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => (await api.post<ItemInterestPost>(`/item-interests/${postId}/tie-break`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['item-interests'] }),
  });
}

export function useCloseItemInterest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post<ItemInterestPost>(`/item-interests/${id}/close`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['item-interests'] }),
  });
}

export function useCancelItemInterest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; reason: string }) =>
      (await api.post<ItemInterestPost>(`/item-interests/${data.id}/cancel`, { reason: data.reason })).data,
    onSuccess: (_data, variables) => {
      queryClient.setQueriesData<ItemInterestPost[]>({ queryKey: ['item-interests'] }, (current) =>
        current?.filter((post) => post.id !== variables.id) ?? current,
      );
      return queryClient.invalidateQueries({ queryKey: ['item-interests'] });
    },
  });
}

export function useDeliverItemInterest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; entryIds: string[]; proofImageUrl?: string }) =>
      (await api.post<ItemInterestPost>(`/item-interests/${data.id}/deliver`, { entryIds: data.entryIds, proofImageUrl: data.proofImageUrl })).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['item-interests'] }),
        queryClient.invalidateQueries({ queryKey: ['drops'] }),
        queryClient.invalidateQueries({ queryKey: ['my-drops'] }),
        queryClient.invalidateQueries({ queryKey: ['my-history'] }),
      ]);
    },
  });
}

export function useItemAuditSummaries(search?: string) {
  return useQuery({
    queryKey: ['drops', 'audit-items', search ?? ''],
    queryFn: async () => (await api.get<ItemAuditSummary[]>('/drops/audit/items', { params: search ? { search } : undefined })).data,
    refetchInterval: 30_000,
  });
}

export function useItemAuditDetails(params: { itemCatalogId?: string; itemName?: string }) {
  return useQuery({
    queryKey: ['drops', 'audit-item', params.itemCatalogId ?? '', params.itemName ?? ''],
    queryFn: async () => (await api.get<ItemAuditDrop[]>('/drops/audit/item', { params })).data,
    enabled: Boolean(params.itemCatalogId || params.itemName),
  });
}

export function useItemAuditFull(params: { itemCatalogId?: string; itemName?: string }) {
  return useQuery({
    queryKey: ['drops', 'audit-item-full', params.itemCatalogId ?? '', params.itemName ?? ''],
    queryFn: async () => (await api.get<ItemAuditFull>('/drops/audit/item/full', { params })).data,
    enabled: Boolean(params.itemCatalogId || params.itemName),
  });
}
