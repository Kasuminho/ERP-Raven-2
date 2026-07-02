import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { Announcement, AttendanceStats, Auction, AuctionBid, AuctionBidCancellationRequest, AuctionDiagnosticOption, AuctionDiagnosticSummary, AuctionDossier, AuctionFinalizationPreview, AuctionTimelineEvent, AuditIdentity, AuditLog, BusinessRule, CodexRequest, DaoshiCashReceipt, DaoshiMonthlySummary, DaoshiPlayerSummary, DaoshiRaffle, DaoshiReceiptStatus, DeploymentPanelSummary, DiscordTemplateSummary, DiscordWebhookQueueSummary, DkpEconomySummary, DkpLeaderboardRow, DropHistory, EligibilityResponse, EligibilityRow, EventBatchPanel, EventDetails, EventFinalizationChecklist, EventReadinessReport, EventRecord, EventType, FinalizeEventResult, GuildRulesSummary, IntegritySummary, InternalNotification, ItemAuditDrop, ItemAuditFull, ItemAuditSummary, ItemCatalog, ItemInterestPost, ItemInterestStatus, ItemRequest, ItemTier, ItemType, LegacyAuditSummary, LootFairnessSummary, MaintenanceModeSummary, NoticeBoardItem, OperationalHealthSummary, PendingAuctionDelivery, PlayerActionPlan, PlayerAttendanceHistoryRow, PlayerClass, PlayerComparisonSummary, PlayerHistory, PlayerOperationsSummary, PlayerProgress, PlayerStaffNote, ProgressCategory, SeasonMonthlySummary, StaffDayViewSummary, StaffDkpPlayerRow, StaffHealthSummary, StaffMeetingSummary, StaffMorningBriefing, StaffOperationsSummary, StaffPlayer, Transaction, UniversalDossier, UniversalDossierType, WeeklyGuildSummary } from '@/types/api';

export function useDeliveredDrops() {
  return useQuery({
    queryKey: ['drops'],
    queryFn: async () => (await api.get<DropHistory[]>('/drops', { params: { limit: 100 } })).data,
  });
}

export function useMyDrops() {
  return useQuery({
    queryKey: ['my-drops'],
    queryFn: async () => (await api.get<DropHistory[]>('/drops/me')).data,
  });
}

export function usePendingAuctionDeliveries() {
  return useQuery({
    queryKey: ['pending-auction-deliveries'],
    queryFn: async () => (await api.get<PendingAuctionDelivery[]>('/drops/pending-auction-deliveries', { params: { limit: 100 } })).data,
  });
}

export function useDeliverAuctionDrop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { auctionId: string; proofImageUrl?: string }) =>
      (await api.post<DropHistory>(`/drops/auction/${data.auctionId}/deliver`, { proofImageUrl: data.proofImageUrl })).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pending-auction-deliveries'] }),
        queryClient.invalidateQueries({ queryKey: ['drops'] }),
        queryClient.invalidateQueries({ queryKey: ['my-drops'] }),
      ]);
    },
  });
}
