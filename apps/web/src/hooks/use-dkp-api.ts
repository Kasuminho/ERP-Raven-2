import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { Announcement, AttendanceStats, Auction, AuctionBid, AuctionBidCancellationRequest, AuctionDiagnosticOption, AuctionDiagnosticSummary, AuctionDossier, AuctionFinalizationPreview, AuctionTimelineEvent, AuditIdentity, AuditLog, BusinessRule, CodexRequest, DaoshiCashReceipt, DaoshiMonthlySummary, DaoshiPlayerSummary, DaoshiRaffle, DaoshiReceiptStatus, DeploymentPanelSummary, DiscordTemplateSummary, DiscordWebhookQueueSummary, DkpBidPolicySimulationSummary, DkpDecaySimulationSummary, DkpEconomySummary, DkpLeaderboardRow, DkpPolicySimulation, DropHistory, EligibilityResponse, EligibilityRow, EventBatchPanel, EventDetails, EventFinalizationChecklist, EventReadinessReport, EventRecord, EventType, FinalizeEventResult, GuildRulesSummary, IntegritySummary, InternalNotification, ItemAuditDrop, ItemAuditFull, ItemAuditSummary, ItemCatalog, ItemInterestPost, ItemInterestStatus, ItemRequest, ItemTier, ItemType, LegacyAuditSummary, LootFairnessSummary, MaintenanceModeSummary, NoticeBoardItem, OperationalHealthSummary, PendingAuctionDelivery, PlayerActionPlan, PlayerAttendanceHistoryRow, PlayerClass, PlayerComparisonSummary, PlayerHistory, PlayerOperationsSummary, PlayerProgress, PlayerStaffNote, ProgressCategory, PromotedDkpPolicySimulation, SeasonMonthlySummary, StaffDayViewSummary, StaffDkpPlayerRow, StaffHealthSummary, StaffMeetingSummary, StaffMorningBriefing, StaffOperationsSummary, StaffPlayer, Transaction, UniversalDossier, UniversalDossierType, WeeklyGuildSummary } from '@/types/api';

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

export function useDkpPolicySimulations() {
  return useQuery({
    queryKey: ['dkp-policy-simulations'],
    queryFn: async () => (await api.get<DkpPolicySimulation[]>('/dkp/staff/simulations')).data,
  });
}

export function usePreviewDkpDecaySimulation() {
  return useMutation({
    mutationFn: async (data: { percent: number; minimumDkp?: number }) =>
      (await api.post<DkpDecaySimulationSummary>('/dkp/staff/simulations/decay/preview', data)).data,
  });
}

export function useSaveDkpDecaySimulation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; percent: number; minimumDkp?: number }) =>
      (await api.post<DkpDecaySimulationSummary>('/dkp/staff/simulations/decay', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dkp-policy-simulations'] }),
  });
}

export type DkpBidPolicySimulationInput = {
  name?: string;
  minimumCost?: number;
  winTaxPercent?: number;
  tierCaps?: Record<string, number>;
  itemTypeCaps?: Record<string, number>;
  layerCaps?: Record<string, number>;
  fixedCostByTier?: Record<string, number>;
  modeMultiplierPercent?: Record<string, number>;
};

export function usePreviewDkpBidPolicySimulation() {
  return useMutation({
    mutationFn: async (data: DkpBidPolicySimulationInput) =>
      (await api.post<DkpBidPolicySimulationSummary>('/dkp/staff/simulations/bid-policy/preview', data)).data,
  });
}

export function useSaveDkpBidPolicySimulation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: DkpBidPolicySimulationInput & { name: string }) =>
      (await api.post<DkpBidPolicySimulationSummary>('/dkp/staff/simulations/bid-policy', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dkp-policy-simulations'] }),
  });
}

export function usePromoteDkpPolicySimulation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { simulationId: string; reason: string }) =>
      (await api.post<PromotedDkpPolicySimulation>(`/dkp/staff/simulations/${data.simulationId}/promote`, {
        confirm: true,
        reason: data.reason,
      })).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dkp-policy-simulations'] }),
        queryClient.invalidateQueries({ queryKey: ['business-rules'] }),
      ]);
    },
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
