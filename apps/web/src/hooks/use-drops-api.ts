import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { Announcement, AttendanceStats, Auction, AuctionBid, AuctionBidCancellationRequest, AuctionDiagnosticOption, AuctionDiagnosticSummary, AuctionDossier, AuctionFinalizationPreview, AuctionTimelineEvent, AuditIdentity, AuditLog, BusinessRule, CodexRequest, DaoshiCashReceipt, DaoshiMonthlySummary, DaoshiPlayerSummary, DaoshiRaffle, DaoshiReceiptStatus, DeploymentPanelSummary, DiscordTemplateSummary, DiscordWebhookQueueSummary, DkpEconomySummary, DkpLeaderboardRow, DropHistory, EligibilityResponse, EligibilityRow, EventBatchPanel, EventDetails, EventFinalizationChecklist, EventReadinessReport, EventRecord, EventType, FinalizeEventResult, GuildRulesSummary, IntegritySummary, InternalNotification, ItemAuditDrop, ItemAuditFull, ItemAuditSummary, ItemCatalog, ItemInterestPost, ItemInterestStatus, ItemRequest, ItemTier, ItemType, LegacyAuditSummary, LootFairnessSummary, MaintenanceModeSummary, NoticeBoardItem, OperationalHealthSummary, PendingAuctionDelivery, PlayerActionPlan, PlayerAttendanceHistoryRow, PlayerClass, PlayerComparisonSummary, PlayerHistory, PlayerOperationsSummary, PlayerProgress, PlayerStaffNote, ProgressCategory, PublishedAuctionResult, SeasonMonthlySummary, StaffDayViewSummary, StaffDkpPlayerRow, StaffHealthSummary, StaffMeetingSummary, StaffMorningBriefing, StaffOperationsSummary, StaffPlayer, Transaction, UniversalDossier, UniversalDossierType, WeeklyGuildSummary } from '@/types/api';

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

export function usePublishedAuctionResults() {
  return useQuery({
    queryKey: ['published-auction-results'],
    queryFn: async () => (await api.get<PublishedAuctionResult[]>('/drops/auction-results', { params: { limit: 50 } })).data,
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
        queryClient.invalidateQueries({ queryKey: ['published-auction-results'] }),
      ]);
    },
  });
}


export type LiveDropItem = {
  messageId: string;
  channelId: string;
  authorUsername: string;
  content: string;
  restriction: 'ALL' | 'RANGED' | 'MELEE' | 'DIVINE_CASTER';
  restrictionLabel: string;
  postedAt: string;
  images: Array<{ url: string; filename: string }>;
  totalReactions: number;
  interestedPlayers: Array<{
    discordId: string;
    discordUsername: string;
    registered: boolean;
    playerId?: string;
    nickname?: string;
    charClass?: PlayerClass;
    guildName?: string;
    combatPower?: number;
    attack?: number;
    defense?: number;
    accuracy?: number;
    isClassEligible: boolean;
    rank: number;
  }>;
};

export function useDiscordLiveDrops(channelId = '1550143905742327878') {
  return useQuery({
    queryKey: ['discord-live-drops', channelId],
    queryFn: async () => (await api.get<LiveDropItem[]>('/discord/loot/drops', { params: { channelId } })).data,
    refetchInterval: 30000,
  });
}

export function useDeclareLootWinner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { channelId: string; messageId: string; playerId: string; note?: string }) =>
      (await api.post<{ success: boolean; winnerNickname: string; combatPower: number }>('/discord/loot/declare-winner', data)).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['discord-live-drops'] });
    },
  });
}

export function useExpressLootInterest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { channelId: string; messageId: string }) =>
      (await api.post<{ success: boolean }>('/discord/loot/interest', data)).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['discord-live-drops'] });
    },
  });
}

export function usePublishDrop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      channelId?: string;
      itemCatalogId?: string;
      title: string;
      restriction: 'ALL' | 'RANGED' | 'MELEE' | 'DIVINE_CASTER';
      imageUrl?: string;
    }) =>
      (await api.post<{ success: boolean; messageId: string }>('/discord/loot/publish', data)).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['discord-live-drops'] });
    },
  });
}
