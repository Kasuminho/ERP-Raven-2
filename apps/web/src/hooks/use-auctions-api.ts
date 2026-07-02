import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { Announcement, AttendanceStats, Auction, AuctionBid, AuctionBidCancellationRequest, AuctionDiagnosticOption, AuctionDiagnosticSummary, AuctionDossier, AuctionFinalizationPreview, AuctionTimelineEvent, AuditIdentity, AuditLog, BusinessRule, CodexRequest, DaoshiCashReceipt, DaoshiMonthlySummary, DaoshiPlayerSummary, DaoshiRaffle, DaoshiReceiptStatus, DeploymentPanelSummary, DiscordTemplateSummary, DiscordWebhookQueueSummary, DkpEconomySummary, DkpLeaderboardRow, DropHistory, EligibilityResponse, EligibilityRow, EventBatchPanel, EventDetails, EventFinalizationChecklist, EventReadinessReport, EventRecord, EventType, FinalizeEventResult, GuildRulesSummary, IntegritySummary, InternalNotification, ItemAuditDrop, ItemAuditFull, ItemAuditSummary, ItemCatalog, ItemInterestPost, ItemInterestStatus, ItemRequest, ItemTier, ItemType, LegacyAuditSummary, LootFairnessSummary, MaintenanceModeSummary, NoticeBoardItem, OperationalHealthSummary, PendingAuctionDelivery, PlayerActionPlan, PlayerAttendanceHistoryRow, PlayerClass, PlayerComparisonSummary, PlayerHistory, PlayerOperationsSummary, PlayerProgress, PlayerStaffNote, ProgressCategory, SeasonMonthlySummary, StaffDayViewSummary, StaffDkpPlayerRow, StaffHealthSummary, StaffMeetingSummary, StaffMorningBriefing, StaffOperationsSummary, StaffPlayer, Transaction, UniversalDossier, UniversalDossierType, WeeklyGuildSummary } from '@/types/api';

export function useAuctionDiagnostics(auctionId: string) {
  return useQuery({
    queryKey: ['operations', 'staff', 'auction-diagnostics', auctionId],
    queryFn: async () => (await api.get<AuctionDiagnosticSummary>(`/operations/staff/auction-diagnostics/${auctionId}`)).data,
    enabled: Boolean(auctionId),
    refetchInterval: 30_000,
  });
}

export function useAuctionDiagnosticOptions() {
  return useQuery({
    queryKey: ['operations', 'staff', 'auction-diagnostics', 'options'],
    queryFn: async () => (await api.get<AuctionDiagnosticOption[]>('/operations/staff/auction-diagnostics/options')).data,
    refetchInterval: 60_000,
  });
}

export function useAuctionTimeline(auctionId: string) {
  return useQuery({
    queryKey: ['operations', 'staff', 'auction-diagnostics', auctionId, 'timeline'],
    queryFn: async () => (await api.get<AuctionTimelineEvent[]>(`/operations/staff/auction-diagnostics/${auctionId}/timeline`)).data,
    enabled: Boolean(auctionId),
    refetchInterval: 30_000,
  });
}

export function useAuctionFinalizationPreview(auctionId: string) {
  return useQuery({
    queryKey: ['operations', 'staff', 'auction-diagnostics', auctionId, 'finalization-preview'],
    queryFn: async () => (await api.get<AuctionFinalizationPreview>(`/operations/staff/auction-diagnostics/${auctionId}/finalization-preview`)).data,
    enabled: Boolean(auctionId),
    refetchInterval: 30_000,
  });
}

export function useAuctionDossier(auctionId: string) {
  return useQuery({
    queryKey: ['operations', 'staff', 'auction-diagnostics', auctionId, 'dossier'],
    queryFn: async () => (await api.get<AuctionDossier>(`/operations/staff/auction-diagnostics/${auctionId}/dossier`)).data,
    enabled: Boolean(auctionId),
    refetchInterval: 30_000,
  });
}

export function useAuctions() {
  return useQuery({
    queryKey: ['auctions'],
    queryFn: async () => (await api.get<Auction[]>('/auctions')).data,
    refetchInterval: 20_000,
  });
}

export function useAuction(id: string) {
  return useQuery({
    queryKey: ['auction', id],
    queryFn: async () => (await api.get<Auction>(`/auctions/${id}`)).data,
    enabled: Boolean(id),
  });
}

export function useAuctionBids(id: string, enabled = true) {
  return useQuery({
    queryKey: ['auction-bids', id],
    queryFn: async () => (await api.get<AuctionBid[]>(`/auctions/${id}/bids`)).data,
    enabled: Boolean(id) && enabled,
  });
}

export function useMyAuctionBid(id: string) {
  return useQuery({
    queryKey: ['my-auction-bid', id],
    queryFn: async () => (await api.get<AuctionBid | null>(`/auctions/${id}/bid/me`)).data,
    enabled: Boolean(id),
  });
}

export function useEligibility(playerId: string, auctionId: string) {
  return useQuery({
    queryKey: ['eligibility', playerId, auctionId],
    queryFn: async () => (await api.get<EligibilityResponse>(`/eligibility/player/${playerId}/auction/${auctionId}`)).data,
    enabled: Boolean(playerId && auctionId),
  });
}

export function useAuctionRanking(auctionId: string, enabled = true) {
  return useQuery({
    queryKey: ['auction-ranking', auctionId],
    queryFn: async () => (await api.get<EligibilityRow[]>(`/eligibility/auction/${auctionId}/ranking`)).data,
    enabled: Boolean(auctionId) && enabled,
  });
}

export function usePlaceBid(auctionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { amount?: number }) => (await api.post(`/auctions/${auctionId}/bid`, data)).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['auction', auctionId] }),
        queryClient.invalidateQueries({ queryKey: ['auction-bids', auctionId] }),
        queryClient.invalidateQueries({ queryKey: ['my-auction-bid', auctionId] }),
        queryClient.invalidateQueries({ queryKey: ['auctions'] }),
        queryClient.invalidateQueries({ queryKey: ['dkp-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['dkp-leaderboard'] }),
      ]);
    },
  });
}

export function useRequestBidCancellation(auctionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reason: string) =>
      (await api.post<{ request: AuctionBidCancellationRequest; autoApproved: boolean }>(`/auctions/${auctionId}/bid-cancellation`, { reason })).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['auction', auctionId] }),
        queryClient.invalidateQueries({ queryKey: ['auction-bids', auctionId] }),
        queryClient.invalidateQueries({ queryKey: ['my-auction-bid', auctionId] }),
        queryClient.invalidateQueries({ queryKey: ['auction-ranking', auctionId] }),
        queryClient.invalidateQueries({ queryKey: ['auctions'] }),
        queryClient.invalidateQueries({ queryKey: ['dkp-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['dkp-leaderboard'] }),
        queryClient.invalidateQueries({ queryKey: ['staff-bid-cancellations'] }),
        queryClient.invalidateQueries({ queryKey: ['staff-bid-cancellations-history'] }),
        queryClient.invalidateQueries({ queryKey: ['my-bid-cancellation', auctionId] }),
      ]);
    },
  });
}

export function useMyBidCancellation(auctionId: string) {
  return useQuery({
    queryKey: ['my-bid-cancellation', auctionId],
    queryFn: async () => (await api.get<AuctionBidCancellationRequest | null>(`/auctions/${auctionId}/bid-cancellation/me`)).data,
    enabled: Boolean(auctionId),
    refetchInterval: 30_000,
  });
}

export function useFinalizeAuction(auctionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post(`/auctions/${auctionId}/finalize`)).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['auction', auctionId] }),
        queryClient.invalidateQueries({ queryKey: ['auction-bids', auctionId] }),
        queryClient.invalidateQueries({ queryKey: ['auction-ranking', auctionId] }),
        queryClient.invalidateQueries({ queryKey: ['auctions'] }),
        queryClient.invalidateQueries({ queryKey: ['staff-reviews'] }),
        queryClient.invalidateQueries({ queryKey: ['pending-auction-deliveries'] }),
        queryClient.invalidateQueries({ queryKey: ['dkp-leaderboard'] }),
      ]);
    },
  });
}

export function usePendingReviews() {
  return useQuery({
    queryKey: ['staff-reviews'],
    queryFn: async () => (await api.get<Auction[]>('/staff/reviews')).data,
  });
}

export function usePendingBidCancellations() {
  return useQuery({
    queryKey: ['staff-bid-cancellations'],
    queryFn: async () => (await api.get<AuctionBidCancellationRequest[]>('/staff/reviews/bid-cancellations')).data,
    refetchInterval: 30_000,
  });
}

export function useBidCancellationHistory() {
  return useQuery({
    queryKey: ['staff-bid-cancellations-history'],
    queryFn: async () => (await api.get<AuctionBidCancellationRequest[]>('/staff/reviews/bid-cancellations/history')).data,
    refetchInterval: 30_000,
  });
}

export function useStaffReviewDetails(auctionId: string) {
  return useQuery({
    queryKey: ['staff-review', auctionId],
    queryFn: async () => (await api.get<{ ranking: EligibilityRow[] } & Auction>(`/staff/reviews/${auctionId}`)).data,
    enabled: Boolean(auctionId),
  });
}

export function useApproveWinner(auctionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (playerId: string) => (await api.post(`/staff/reviews/${auctionId}/approve`, { playerId })).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['staff-reviews'] }),
        queryClient.invalidateQueries({ queryKey: ['staff-review', auctionId] }),
        queryClient.invalidateQueries({ queryKey: ['auctions'] }),
        queryClient.invalidateQueries({ queryKey: ['auction', auctionId] }),
        queryClient.invalidateQueries({ queryKey: ['pending-auction-deliveries'] }),
        queryClient.invalidateQueries({ queryKey: ['dkp-leaderboard'] }),
      ]);
    },
  });
}

export function useRejectReview(auctionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reason: string) => (await api.post(`/staff/reviews/${auctionId}/reject`, { reason })).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['staff-reviews'] }),
        queryClient.invalidateQueries({ queryKey: ['staff-review', auctionId] }),
        queryClient.invalidateQueries({ queryKey: ['auctions'] }),
        queryClient.invalidateQueries({ queryKey: ['auction', auctionId] }),
        queryClient.invalidateQueries({ queryKey: ['pending-auction-deliveries'] }),
      ]);
    },
  });
}

export function useRemoveAuctionBid(auctionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { bidId: string; reason: string }) =>
      (await api.post(`/staff/reviews/${auctionId}/remove-bid`, data)).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['staff-reviews'] }),
        queryClient.invalidateQueries({ queryKey: ['staff-review', auctionId] }),
        queryClient.invalidateQueries({ queryKey: ['auction', auctionId] }),
        queryClient.invalidateQueries({ queryKey: ['auctions'] }),
        queryClient.invalidateQueries({ queryKey: ['dkp-leaderboard'] }),
      ]);
    },
  });
}

export function useApproveBidCancellation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { requestId: string; note?: string }) =>
      (await api.post<AuctionBidCancellationRequest>(`/staff/reviews/bid-cancellations/${data.requestId}/approve`, { note: data.note })).data,
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['staff-bid-cancellations'] }),
        queryClient.invalidateQueries({ queryKey: ['staff-bid-cancellations-history'] }),
        queryClient.invalidateQueries({ queryKey: ['staff-reviews'] }),
        queryClient.invalidateQueries({ queryKey: ['staff-review', data.auctionId] }),
        queryClient.invalidateQueries({ queryKey: ['auction', data.auctionId] }),
        queryClient.invalidateQueries({ queryKey: ['auction-bids', data.auctionId] }),
        queryClient.invalidateQueries({ queryKey: ['auction-ranking', data.auctionId] }),
        queryClient.invalidateQueries({ queryKey: ['auctions'] }),
        queryClient.invalidateQueries({ queryKey: ['dkp-leaderboard'] }),
      ]);
    },
  });
}

export function useRejectBidCancellation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { requestId: string; note?: string }) =>
      (await api.post<AuctionBidCancellationRequest>(`/staff/reviews/bid-cancellations/${data.requestId}/reject`, { note: data.note })).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['staff-bid-cancellations'] });
      await queryClient.invalidateQueries({ queryKey: ['staff-bid-cancellations-history'] });
    },
  });
}
