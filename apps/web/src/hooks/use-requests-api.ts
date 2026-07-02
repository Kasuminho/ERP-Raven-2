import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { Announcement, AttendanceStats, Auction, AuctionBid, AuctionBidCancellationRequest, AuctionDiagnosticOption, AuctionDiagnosticSummary, AuctionDossier, AuctionFinalizationPreview, AuctionTimelineEvent, AuditIdentity, AuditLog, BusinessRule, CodexRequest, DaoshiCashReceipt, DaoshiMonthlySummary, DaoshiPlayerSummary, DaoshiRaffle, DaoshiReceiptStatus, DeploymentPanelSummary, DiscordTemplateSummary, DiscordWebhookQueueSummary, DkpEconomySummary, DkpLeaderboardRow, DropHistory, EligibilityResponse, EligibilityRow, EventBatchPanel, EventDetails, EventFinalizationChecklist, EventReadinessReport, EventRecord, EventType, FinalizeEventResult, GuildRulesSummary, IntegritySummary, InternalNotification, ItemAuditDrop, ItemAuditFull, ItemAuditSummary, ItemCatalog, ItemInterestPost, ItemInterestStatus, ItemRequest, ItemTier, ItemType, LegacyAuditSummary, LootFairnessSummary, MaintenanceModeSummary, NoticeBoardItem, OperationalHealthSummary, PendingAuctionDelivery, PlayerActionPlan, PlayerAttendanceHistoryRow, PlayerClass, PlayerComparisonSummary, PlayerHistory, PlayerOperationsSummary, PlayerProgress, PlayerStaffNote, ProgressCategory, SeasonMonthlySummary, StaffDayViewSummary, StaffDkpPlayerRow, StaffHealthSummary, StaffMeetingSummary, StaffMorningBriefing, StaffOperationsSummary, StaffPlayer, Transaction, UniversalDossier, UniversalDossierType, WeeklyGuildSummary } from '@/types/api';

export function useItemRequests() {
  return useQuery({
    queryKey: ['item-requests'],
    queryFn: async () => (await api.get<ItemRequest[]>('/item-requests')).data,
  });
}

export function useStaffItemRequests() {
  return useQuery({
    queryKey: ['item-requests', 'staff'],
    queryFn: async () => (await api.get<ItemRequest[]>('/item-requests/staff')).data,
    refetchInterval: 30_000,
  });
}

export function useItemRequestRankings() {
  return useQuery({
    queryKey: ['item-requests', 'rankings'],
    queryFn: async () => (await api.get<ItemRequest[]>('/item-requests/rankings')).data,
    refetchInterval: 30_000,
  });
}

export function useCreateItemRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { itemCatalogId: string; playerId: string; quantity: number; imageUrl?: string; threadId?: string; threadChannelId?: string }) =>
      (await api.post<ItemRequest>('/item-requests', data)).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['item-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['item-requests', 'staff'] }),
        queryClient.invalidateQueries({ queryKey: ['item-requests', 'rankings'] }),
      ]);
    },
  });
}

export function useUpdateItemRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post<ItemRequest>(`/item-requests/${id}/update`)).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['item-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['item-requests', 'staff'] }),
        queryClient.invalidateQueries({ queryKey: ['item-requests', 'rankings'] }),
      ]);
    },
  });
}

export function usePlayerUpdateItemRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; imageUrl: string; note?: string }) =>
      (await api.post<ItemRequest>(`/item-requests/${data.id}/player-update`, { imageUrl: data.imageUrl, note: data.note })).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['item-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['item-requests', 'staff'] }),
        queryClient.invalidateQueries({ queryKey: ['my-history'] }),
        queryClient.invalidateQueries({ queryKey: ['item-requests', 'rankings'] }),
      ]);
    },
  });
}

export function useApproveItemRequestUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; remainingQuantity: number; note?: string }) =>
      (await api.post<ItemRequest>(`/item-requests/${data.id}/approve-update`, { remainingQuantity: data.remainingQuantity, note: data.note })).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['item-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['item-requests', 'staff'] }),
        queryClient.invalidateQueries({ queryKey: ['item-requests', 'rankings'] }),
      ]);
    },
  });
}

export function useDeliverItemRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; quantity: number; reason?: string }) =>
      (await api.post<{ delivered: number; completed: boolean }>(`/item-requests/${data.id}/deliver`, { quantity: data.quantity, reason: data.reason })).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['item-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['item-requests', 'staff'] }),
        queryClient.invalidateQueries({ queryKey: ['item-requests', 'rankings'] }),
        queryClient.invalidateQueries({ queryKey: ['drops'] }),
      ]);
    },
  });
}

export function useDropItemRequestRank() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/item-requests/${id}/drop-rank`)).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['item-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['item-requests', 'staff'] }),
        queryClient.invalidateQueries({ queryKey: ['item-requests', 'rankings'] }),
      ]);
    },
  });
}

export function useDeleteItemRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/item-requests/${id}`)).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['item-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['item-requests', 'staff'] }),
        queryClient.invalidateQueries({ queryKey: ['item-requests', 'rankings'] }),
      ]);
    },
  });
}

export function useCreateMyItemRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { itemCatalogId: string; quantity: number; imageUrl?: string }) => (await api.post<ItemRequest>('/item-requests/me', data)).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-history'] }),
        queryClient.invalidateQueries({ queryKey: ['item-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['item-requests', 'rankings'] }),
      ]);
    },
  });
}
