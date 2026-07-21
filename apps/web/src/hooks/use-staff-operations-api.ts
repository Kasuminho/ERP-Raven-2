import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { Announcement, AttendanceStats, Auction, AuctionBid, AuctionBidCancellationRequest, AuctionDiagnosticOption, AuctionDiagnosticSummary, AuctionDossier, AuctionFinalizationPreview, AuctionTimelineEvent, AuditIdentity, AuditLog, BusinessRule, CodexRequest, ContextualEligibilitySummary, ContextualEligibilityType, DaoshiCashReceipt, DaoshiMonthlySummary, DaoshiPlayerSummary, DaoshiRaffle, DaoshiReceiptStatus, DeploymentPanelSummary, DiscordTemplateSummary, DiscordWebhookQueueSummary, DkpEconomySummary, DkpLeaderboardRow, DropHistory, EligibilityResponse, EligibilityRow, EventBatchPanel, EventDetails, EventFinalizationChecklist, EventReadinessReport, EventRecord, EventType, FinalizeEventResult, GuildPolicyPublicWorkspace, GuildPolicyStaffWorkspace, GuildPolicyVersion, GuildProgressReport, GuildRulesSummary, IntegritySummary, InternalNotification, ItemAuditDrop, ItemAuditFull, ItemAuditSummary, ItemCatalog, ItemInterestPost, ItemInterestStatus, ItemRequest, ItemTier, ItemType, LegacyAuditSummary, LootFairnessSummary, MaintenanceModeSummary, NoticeBoardItem, OperationalHealthSummary, PendingAuctionDelivery, PlayerActionPlan, PlayerAttendanceHistoryRow, PlayerClass, PlayerComparisonSummary, PlayerHistory, PlayerOperationsSummary, PlayerProgress, PlayerStaffNote, PlayerWeeklySafeSummary, ProductValidationAbsenceVisibility, ProductValidationInterviewProfile, ProductValidationWorkspace, ProgressCategory, SeasonMonthlySummary, StaffDayViewSummary, StaffDkpPlayerRow, StaffHealthSummary, StaffMeetingSummary, StaffMorningBriefing, StaffOperationsSummary, StaffPlayer, Transaction, UniversalDossier, UniversalDossierType, WeeklyGuildSummary } from '@/types/api';

export function useGuildRules() {
  return useQuery({
    queryKey: ['operations', 'rules'],
    queryFn: async () => (await api.get<GuildRulesSummary>('/operations/rules')).data,
    staleTime: 10 * 60_000,
  });
}

export function useMaintenanceMode() {
  return useQuery({
    queryKey: ['operations', 'maintenance'],
    queryFn: async () => (await api.get<MaintenanceModeSummary>('/operations/maintenance')).data,
    refetchInterval: 30_000,
  });
}

export function useStaffOperations() {
  return useQuery({
    queryKey: ['operations', 'staff'],
    queryFn: async () => (await api.get<StaffOperationsSummary>('/operations/staff')).data,
    refetchInterval: 30_000,
  });
}

export function useStaffDayView() {
  return useQuery({
    queryKey: ['operations', 'staff', 'day-view'],
    queryFn: async () => (await api.get<StaffDayViewSummary>('/operations/staff/day-view')).data,
    refetchInterval: 20_000,
  });
}

export function useStaffMorningBriefing() {
  return useQuery({
    queryKey: ['operations', 'staff', 'morning-briefing'],
    queryFn: async () => (await api.get<StaffMorningBriefing>('/operations/staff/morning-briefing')).data,
    refetchInterval: 30_000,
  });
}

export function useSeasonSummary(month?: string) {
  return useQuery({
    queryKey: ['operations', 'staff', 'season', month ?? 'current'],
    queryFn: async () => (await api.get<SeasonMonthlySummary>('/operations/staff/season', { params: month ? { month } : undefined })).data,
    refetchInterval: 60_000,
  });
}

export function useWeeklySummary() {
  return useQuery({
    queryKey: ['operations', 'staff', 'weekly'],
    queryFn: async () => (await api.get<WeeklyGuildSummary>('/operations/staff/weekly')).data,
    refetchInterval: 60_000,
  });
}

export function useProductValidation() {
  return useQuery({
    queryKey: ['product-validation'],
    queryFn: async () => (await api.get<ProductValidationWorkspace>('/product-validation')).data,
  });
}

export function useCreateProductValidationInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      profile: ProductValidationInterviewProfile;
      channels: string[];
      absenceVisibility: ProductValidationAbsenceVisibility;
      rsvpWouldReduceManualCharge: boolean;
      summary: string;
      interviewedAt: string;
    }) => (await api.post('/product-validation/interviews', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['product-validation'] }),
  });
}

export function useCaptureProductValidationWeek() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      weekStart: string;
      expectedAttendance?: number;
      staffConfirmationMinutes: number;
      note?: string;
    }) => (await api.post('/product-validation/weeks', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['product-validation'] }),
  });
}

export function useGuildPolicies() {
  return useQuery({
    queryKey: ['guild-policies'],
    queryFn: async () => (await api.get<GuildPolicyPublicWorkspace>('/guild-policies')).data,
    staleTime: 60_000,
  });
}

export function useGuildPolicyStaffWorkspace() {
  return useQuery({
    queryKey: ['guild-policies', 'staff'],
    queryFn: async () => (await api.get<GuildPolicyStaffWorkspace>('/guild-policies/staff')).data,
  });
}

export function useCreateGuildPolicyDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { titlePt: string; titleEn: string; summaryPt: string; summaryEn: string; effectiveAt: string; isEmergency?: boolean; emergencyReason?: string }) =>
      (await api.post<GuildPolicyVersion>('/guild-policies/drafts', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guild-policies'] }),
  });
}

export function useMarkGuildPolicyOpened() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (policyId: string) => (await api.post(`/guild-policies/${policyId}/open`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guild-policies'] }),
  });
}

export function useAcknowledgeGuildPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (policyId: string) => (await api.post(`/guild-policies/${policyId}/acknowledge`)).data,
    onSuccess: async () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ['guild-policies'] }),
      queryClient.invalidateQueries({ queryKey: ['operations', 'me', 'action-plan'] }),
      queryClient.invalidateQueries({ queryKey: ['guild-policies', 'staff'] }),
    ]),
  });
}

export function useRefreshGuildPolicyDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (policyId: string) => (await api.post<GuildPolicyVersion>(`/guild-policies/drafts/${policyId}/refresh-snapshot`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guild-policies'] }),
  });
}

export function usePublishGuildPolicyDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (policyId: string) => (await api.post<GuildPolicyVersion>(`/guild-policies/drafts/${policyId}/publish`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guild-policies'] }),
  });
}

export function useGuildProgressReport(period: 'week' | 'month' = 'week') {
  return useQuery({
    queryKey: ['operations', 'staff', 'guild-progress', period],
    queryFn: async () => (await api.get<GuildProgressReport>('/operations/staff/guild-progress', { params: { period } })).data,
    refetchInterval: 60_000,
  });
}

export function usePlayerWeeklySafeSummary(period: 'week' | 'month' = 'week') {
  return useQuery({
    queryKey: ['operations', 'me', 'weekly-summary', period],
    queryFn: async () => (await api.get<PlayerWeeklySafeSummary>('/operations/me/weekly-summary', { params: { period } })).data,
    staleTime: 60_000,
  });
}

export function usePostWeeklySummary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post<{ posted: boolean; summary: WeeklyGuildSummary }>('/operations/staff/weekly/post')).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['operations', 'staff', 'weekly'] });
    },
  });
}

export function useIntegritySummary() {
  return useQuery({
    queryKey: ['operations', 'staff', 'integrity'],
    queryFn: async () => (await api.get<IntegritySummary>('/operations/staff/integrity')).data,
    refetchInterval: 60_000,
  });
}

export function useUniversalDossier(type: UniversalDossierType, id: string) {
  return useQuery({
    queryKey: ['operations', 'staff', 'dossiers', type, id],
    queryFn: async () => (await api.get<UniversalDossier>(`/operations/staff/dossiers/${type}/${id}`)).data,
    enabled: Boolean(type && id),
  });
}

export function useContextualEligibility(
  playerId: string,
  params: { type: ContextualEligibilityType; contextId?: string; role?: string },
) {
  const needsContextId = params.type !== 'recruitment';

  return useQuery({
    queryKey: ['operations', 'staff', 'player-eligibility', playerId, params.type, params.contextId ?? '', params.role ?? ''],
    queryFn: async () => (
      await api.get<ContextualEligibilitySummary>(`/operations/staff/player-eligibility/${playerId}/context`, {
        params: {
          type: params.type,
          contextId: params.contextId || undefined,
          role: params.role || undefined,
        },
      })
    ).data,
    enabled: Boolean(playerId && params.type && (!needsContextId || params.contextId)),
  });
}

export function useBusinessRules() {
  return useQuery({
    queryKey: ['business-rules'],
    queryFn: async () => (await api.get<BusinessRule[]>('/business-rules')).data,
    staleTime: 30_000,
  });
}

export function useUpdateBusinessRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { key: string; value: unknown }) =>
      (await api.patch<BusinessRule>(`/business-rules/${data.key}`, { value: data.value })).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['business-rules'] }),
        queryClient.invalidateQueries({ queryKey: ['operations'] }),
        queryClient.invalidateQueries({ queryKey: ['events'] }),
        queryClient.invalidateQueries({ queryKey: ['auctions'] }),
      ]);
    },
  });
}

export function useResetBusinessRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (key: string) => (await api.post<BusinessRule>(`/business-rules/${key}/reset`)).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['business-rules'] }),
        queryClient.invalidateQueries({ queryKey: ['operations'] }),
        queryClient.invalidateQueries({ queryKey: ['events'] }),
        queryClient.invalidateQueries({ queryKey: ['auctions'] }),
      ]);
    },
  });
}

export function useLootFairness(days = 30) {
  return useQuery({
    queryKey: ['operations', 'staff', 'fairness', days],
    queryFn: async () => (await api.get<LootFairnessSummary>('/operations/staff/fairness', { params: { days } })).data,
    refetchInterval: 60_000,
  });
}

export function usePlayerComparison(playerIds: string[]) {
  return useQuery({
    queryKey: ['operations', 'staff', 'compare', playerIds.join(',')],
    queryFn: async () => (await api.get<PlayerComparisonSummary>('/operations/staff/compare', { params: { playerIds: playerIds.join(',') } })).data,
    enabled: playerIds.length > 0,
  });
}

export function useStaffMeeting() {
  return useQuery({
    queryKey: ['operations', 'staff', 'meeting'],
    queryFn: async () => (await api.get<StaffMeetingSummary>('/operations/staff/meeting')).data,
    refetchInterval: 30_000,
  });
}

export function useResolveStaffMeetingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: { meetingItemKey: string; title: string; type: string; href: string }) =>
      (await api.post<StaffMeetingSummary>(`/operations/staff/meeting/items/${encodeURIComponent(item.meetingItemKey)}/resolve`, {
        title: item.title,
        type: item.type,
        href: item.href,
      })).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['operations', 'staff', 'meeting'] });
      await queryClient.invalidateQueries({ queryKey: ['operations', 'staff'] });
    },
  });
}

export function useLegacyAudit() {
  return useQuery({
    queryKey: ['operations', 'staff', 'legacy-audit'],
    queryFn: async () => (await api.get<LegacyAuditSummary>('/operations/staff/legacy-audit')).data,
    refetchInterval: 60_000,
  });
}

export function useDiscordTemplates() {
  return useQuery({
    queryKey: ['operations', 'staff', 'discord-templates'],
    queryFn: async () => (await api.get<DiscordTemplateSummary>('/operations/staff/discord-templates')).data,
    staleTime: 10 * 60_000,
  });
}

export function useDiscordWebhookQueue(limit = 50) {
  return useQuery({
    queryKey: ['operations', 'staff', 'discord-webhooks', limit],
    queryFn: async () => (await api.get<DiscordWebhookQueueSummary>('/operations/staff/discord-webhooks', { params: { limit } })).data,
    refetchInterval: 15_000,
  });
}

export function useRetryDiscordWebhookDelivery(limit = 50) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (deliveryId: string) => (await api.post<DiscordWebhookQueueSummary>(`/operations/staff/discord-webhooks/${deliveryId}/retry`)).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['operations', 'staff', 'discord-webhooks', limit] });
    },
  });
}

export function useStaffHealth() {
  return useQuery({
    queryKey: ['operations', 'staff-health'],
    queryFn: async () => (await api.get<StaffHealthSummary>('/operations/staff/health')).data,
    refetchInterval: 60_000,
  });
}

export function useOperationalHealth() {
  return useQuery({
    queryKey: ['operations', 'staff', 'operational-health'],
    queryFn: async () => (await api.get<OperationalHealthSummary>('/operations/staff/operational-health')).data,
    refetchInterval: 30_000,
  });
}

export function useDeploymentPanel() {
  return useQuery({
    queryKey: ['operations', 'staff', 'deploy'],
    queryFn: async () => (await api.get<DeploymentPanelSummary>('/operations/staff/deploy')).data,
    refetchInterval: 30_000,
  });
}

export function useRecentAudit(limit = 20) {
  return useQuery({
    queryKey: ['operations', 'audit', limit],
    queryFn: async () => (await api.get<AuditLog[]>('/operations/staff/audit', { params: { limit } })).data,
    refetchInterval: 30_000,
  });
}
