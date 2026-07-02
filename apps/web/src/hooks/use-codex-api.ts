import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { Announcement, AttendanceStats, Auction, AuctionBid, AuctionBidCancellationRequest, AuctionDiagnosticOption, AuctionDiagnosticSummary, AuctionDossier, AuctionFinalizationPreview, AuctionTimelineEvent, AuditIdentity, AuditLog, BusinessRule, CodexRequest, DaoshiCashReceipt, DaoshiMonthlySummary, DaoshiPlayerSummary, DaoshiRaffle, DaoshiReceiptStatus, DeploymentPanelSummary, DiscordTemplateSummary, DiscordWebhookQueueSummary, DkpEconomySummary, DkpLeaderboardRow, DropHistory, EligibilityResponse, EligibilityRow, EventBatchPanel, EventDetails, EventFinalizationChecklist, EventReadinessReport, EventRecord, EventType, FinalizeEventResult, GuildRulesSummary, IntegritySummary, InternalNotification, ItemAuditDrop, ItemAuditFull, ItemAuditSummary, ItemCatalog, ItemInterestPost, ItemInterestStatus, ItemRequest, ItemTier, ItemType, LegacyAuditSummary, LootFairnessSummary, MaintenanceModeSummary, NoticeBoardItem, OperationalHealthSummary, PendingAuctionDelivery, PlayerActionPlan, PlayerAttendanceHistoryRow, PlayerClass, PlayerComparisonSummary, PlayerHistory, PlayerOperationsSummary, PlayerProgress, PlayerStaffNote, ProgressCategory, SeasonMonthlySummary, StaffDayViewSummary, StaffDkpPlayerRow, StaffHealthSummary, StaffMeetingSummary, StaffMorningBriefing, StaffOperationsSummary, StaffPlayer, Transaction, UniversalDossier, UniversalDossierType, WeeklyGuildSummary } from '@/types/api';

export function useMyCodexRequests() {
  return useQuery({
    queryKey: ['codex-me'],
    queryFn: async () => (await api.get<CodexRequest[]>('/codex/me')).data,
    refetchInterval: 30_000,
  });
}

export function useCreateCodexRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { imageUrl: string; note?: string }) => (await api.post<CodexRequest>('/codex/me', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['codex-me'] }),
  });
}

export function useConfirmCodexRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post<CodexRequest>(`/codex/${id}/confirm`)).data,
    onSuccess: async (_data, id) => {
      queryClient.setQueryData<CodexRequest[]>(['codex-me'], (current) => current?.filter((request) => request.id !== id) ?? current);
      queryClient.setQueryData<CodexRequest[]>(['codex-staff'], (current) => current?.filter((request) => request.id !== id) ?? current);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['codex-me'] }),
        queryClient.invalidateQueries({ queryKey: ['codex-staff'] }),
      ]);
    },
  });
}

export function useRetryCodexRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post<CodexRequest>(`/codex/${id}/retry`)).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['codex-me'] }),
        queryClient.invalidateQueries({ queryKey: ['codex-staff'] }),
      ]);
    },
  });
}

export function useStaffCodexRequests() {
  return useQuery({
    queryKey: ['codex-staff'],
    queryFn: async () => (await api.get<CodexRequest[]>('/codex')).data,
    refetchInterval: 30_000,
  });
}

export function useSendCodexRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; proofImageUrl?: string }) =>
      (await api.post<CodexRequest>(`/codex/${data.id}/send`, { proofImageUrl: data.proofImageUrl })).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['codex-staff'] }),
        queryClient.invalidateQueries({ queryKey: ['codex-me'] }),
      ]);
    },
  });
}

export function useRejectCodexRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; reason: string }) =>
      (await api.post<CodexRequest>(`/codex/${data.id}/cancel`, { reason: data.reason })).data,
    onSuccess: async (_data, variables) => {
      queryClient.setQueryData<CodexRequest[]>(['codex-staff'], (current) =>
        current?.filter((request) => request.id !== variables.id) ?? current,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['codex-staff'] }),
        queryClient.invalidateQueries({ queryKey: ['codex-me'] }),
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      ]);
    },
  });
}
