import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { Announcement, AttendanceStats, Auction, AuctionBid, AuctionBidCancellationRequest, AuctionDiagnosticOption, AuctionDiagnosticSummary, AuctionDossier, AuctionFinalizationPreview, AuctionTimelineEvent, AuditIdentity, AuditLog, BusinessRule, CodexRequest, DaoshiCashReceipt, DaoshiMonthlySummary, DaoshiPlayerSummary, DaoshiRaffle, DaoshiReceiptStatus, DeploymentPanelSummary, DiscordTemplateSummary, DiscordWebhookQueueSummary, DkpEconomySummary, DkpLeaderboardRow, DropHistory, EligibilityResponse, EligibilityRow, EventBatchPanel, EventDetails, EventFinalizationChecklist, EventReadinessReport, EventRecord, EventType, FinalizeEventResult, GuildRulesSummary, IntegritySummary, InternalNotification, ItemAuditDrop, ItemAuditFull, ItemAuditSummary, ItemCatalog, ItemInterestPost, ItemInterestStatus, ItemRequest, ItemTier, ItemType, LegacyAuditSummary, LootFairnessSummary, MaintenanceModeSummary, NoticeBoardItem, OperationalHealthSummary, PendingAuctionDelivery, PlayerActionPlan, PlayerAttendanceHistoryRow, PlayerClass, PlayerComparisonSummary, PlayerHistory, PlayerOperationsSummary, PlayerProgress, PlayerStaffNote, ProgressCategory, SeasonMonthlySummary, StaffDayViewSummary, StaffDkpPlayerRow, StaffHealthSummary, StaffMeetingSummary, StaffMorningBriefing, StaffOperationsSummary, StaffPlayer, Transaction, UniversalDossier, UniversalDossierType, WeeklyGuildSummary } from '@/types/api';

export function useMyDaoshiSummary(month?: string) {
  return useQuery({
    queryKey: ['daoshi', 'me', 'summary', month ?? 'current'],
    queryFn: async () => (await api.get<DaoshiPlayerSummary>('/daoshi/me/summary', { params: month ? { month } : undefined })).data,
    refetchInterval: 30_000,
  });
}

export function useMyDaoshiReceipts() {
  return useQuery({
    queryKey: ['daoshi', 'me', 'receipts'],
    queryFn: async () => (await api.get<DaoshiCashReceipt[]>('/daoshi/me')).data,
    refetchInterval: 30_000,
  });
}

export function useCreateDaoshiReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { proofImageUrl: string; purchaseAmount: number; purchaseDate: string; playerNote?: string }) =>
      (await api.post<DaoshiCashReceipt>('/daoshi/me/receipts', data)).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['daoshi'] }),
      ]);
    },
  });
}

export function useCreateManualDaoshiReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { playerId: string; purchaseAmount: number; purchaseDate: string; reviewNote?: string }) =>
      (await api.post<DaoshiCashReceipt>('/daoshi/staff/receipts/manual', data)).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['daoshi'] }),
        queryClient.invalidateQueries({ queryKey: ['operations'] }),
      ]);
    },
  });
}

export function useStaffDaoshiReceipts(status?: DaoshiReceiptStatus, month?: string) {
  return useQuery({
    queryKey: ['daoshi', 'staff', 'receipts', status ?? 'all', month ?? 'current'],
    queryFn: async () => (await api.get<DaoshiCashReceipt[]>('/daoshi/staff/receipts', { params: { ...(status ? { status } : {}), ...(month ? { month } : {}) } })).data,
    refetchInterval: 20_000,
  });
}

export function useStaffDaoshiSummary(month?: string) {
  return useQuery({
    queryKey: ['daoshi', 'staff', 'summary', month ?? 'current'],
    queryFn: async () => (await api.get<DaoshiMonthlySummary>('/daoshi/staff/summary', { params: month ? { month } : undefined })).data,
    refetchInterval: 20_000,
  });
}

export function useApproveDaoshiReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; approvedAmount?: number; reviewNote?: string }) =>
      (await api.post<DaoshiCashReceipt>(`/daoshi/staff/receipts/${data.id}/approve`, { approvedAmount: data.approvedAmount, reviewNote: data.reviewNote })).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['daoshi'] });
    },
  });
}

export function useRejectDaoshiReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; reviewNote: string }) =>
      (await api.post<DaoshiCashReceipt>(`/daoshi/staff/receipts/${data.id}/reject`, { reviewNote: data.reviewNote })).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['daoshi'] });
    },
  });
}

export function useRunDaoshiRaffle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (month: string) => (await api.post<DaoshiRaffle>(`/daoshi/staff/raffle/${month}/run`)).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['daoshi'] });
    },
  });
}
