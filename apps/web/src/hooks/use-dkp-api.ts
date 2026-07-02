import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { Announcement, AttendanceStats, Auction, AuctionBid, AuctionBidCancellationRequest, AuctionDiagnosticOption, AuctionDiagnosticSummary, AuctionDossier, AuctionFinalizationPreview, AuctionTimelineEvent, AuditIdentity, AuditLog, BusinessRule, CodexRequest, DaoshiCashReceipt, DaoshiMonthlySummary, DaoshiPlayerSummary, DaoshiRaffle, DaoshiReceiptStatus, DeploymentPanelSummary, DiscordTemplateSummary, DiscordWebhookQueueSummary, DkpEconomySummary, DkpLeaderboardRow, DropHistory, EligibilityResponse, EligibilityRow, EventBatchPanel, EventDetails, EventFinalizationChecklist, EventReadinessReport, EventRecord, EventType, FinalizeEventResult, GuildRulesSummary, IntegritySummary, InternalNotification, ItemAuditDrop, ItemAuditFull, ItemAuditSummary, ItemCatalog, ItemInterestPost, ItemInterestStatus, ItemRequest, ItemTier, ItemType, LegacyAuditSummary, LootFairnessSummary, MaintenanceModeSummary, NoticeBoardItem, OperationalHealthSummary, PendingAuctionDelivery, PlayerActionPlan, PlayerAttendanceHistoryRow, PlayerClass, PlayerComparisonSummary, PlayerHistory, PlayerOperationsSummary, PlayerProgress, PlayerStaffNote, ProgressCategory, SeasonMonthlySummary, StaffDayViewSummary, StaffDkpPlayerRow, StaffHealthSummary, StaffMeetingSummary, StaffMorningBriefing, StaffOperationsSummary, StaffPlayer, Transaction, UniversalDossier, UniversalDossierType, WeeklyGuildSummary } from '@/types/api';

export function useDkpSummary(playerId: string) {
  return useQuery({
    queryKey: ['dkp-summary', playerId],
    queryFn: async () => {
      const [total, locked, available] = await Promise.all([
        api.get<{ total: number }>(`/dkp/${playerId}/total`),
        api.get<{ locked: number }>(`/dkp/${playerId}/locked`),
        api.get<{ available: number }>(`/dkp/${playerId}/available`),
      ]);

      return { total: total.data.total, locked: locked.data.locked, available: available.data.available };
    },
    enabled: Boolean(playerId),
  });
}

export function useDkpLeaderboard() {
  return useQuery({
    queryKey: ['dkp-leaderboard'],
    queryFn: async () => (await api.get<DkpLeaderboardRow[]>('/dkp/leaderboard')).data,
    refetchInterval: 30_000,
  });
}

export function useStaffDkpPlayers(search?: string) {
  return useQuery({
    queryKey: ['dkp-staff-players', search ?? ''],
    queryFn: async () => (await api.get<StaffDkpPlayerRow[]>('/dkp/staff/players', { params: search ? { search } : undefined })).data,
    refetchInterval: 30_000,
  });
}

export function useDkpEconomy() {
  return useQuery({
    queryKey: ['dkp-economy'],
    queryFn: async () => (await api.get<DkpEconomySummary>('/dkp/staff/economy')).data,
    refetchInterval: 60_000,
  });
}

export function useCreateDkpTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { playerId: string; amount: number; type: 'ADMIN_ADJUSTMENT'; referenceId?: string }) =>
      (await api.post<Transaction>('/dkp/transaction', data)).data,
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dkp-staff-players'] }),
        queryClient.invalidateQueries({ queryKey: ['dkp-leaderboard'] }),
        queryClient.invalidateQueries({ queryKey: ['my-history'] }),
        queryClient.invalidateQueries({ queryKey: ['player-history', variables.playerId] }),
      ]);
    },
  });
}
