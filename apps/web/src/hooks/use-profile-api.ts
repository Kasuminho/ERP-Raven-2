import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { Announcement, AttendanceStats, Auction, AuctionBid, AuctionBidCancellationRequest, AuctionDiagnosticOption, AuctionDiagnosticSummary, AuctionDossier, AuctionFinalizationPreview, AuctionTimelineEvent, AuditIdentity, AuditLog, BusinessRule, CodexRequest, DaoshiCashReceipt, DaoshiMonthlySummary, DaoshiPlayerSummary, DaoshiRaffle, DaoshiReceiptStatus, DeploymentPanelSummary, DiscordTemplateSummary, DiscordWebhookQueueSummary, DkpEconomySummary, DkpLeaderboardRow, DropHistory, EligibilityResponse, EligibilityRow, EventBatchPanel, EventDetails, EventFinalizationChecklist, EventReadinessReport, EventRecord, EventType, FinalizeEventResult, GuildRulesSummary, IntegritySummary, InternalNotification, ItemAuditDrop, ItemAuditFull, ItemAuditSummary, ItemCatalog, ItemInterestPost, ItemInterestStatus, ItemRequest, ItemTier, ItemType, LegacyAuditSummary, LootFairnessSummary, MaintenanceModeSummary, NoticeBoardItem, OperationalHealthSummary, PendingAuctionDelivery, PlayerActionPlan, PlayerAttendanceHistoryRow, PlayerClass, PlayerCombatAvailability, PlayerCombatProfileChangeRequest, PlayerCombatRole, PlayerComparisonSummary, PlayerHistory, PlayerOperationsSummary, PlayerProgress, PlayerStaffNote, ProgressCategory, RosterCompositionMatrix, SeasonMonthlySummary, StaffDayViewSummary, StaffDkpPlayerRow, StaffHealthSummary, StaffMeetingSummary, StaffMorningBriefing, StaffOperationsSummary, StaffPlayer, Transaction, UniversalDossier, UniversalDossierType, WeeklyGuildSummary } from '@/types/api';

export function usePlayerId() {
  return useAuthStore((state) => state.playerId) ?? '';
}

export function useUserId() {
  return useAuthStore((state) => state.userId) ?? '';
}

export function usePlayerOperations() {
  return useQuery({
    queryKey: ['operations', 'me'],
    queryFn: async () => (await api.get<PlayerOperationsSummary>('/operations/me')).data,
    refetchInterval: 30_000,
  });
}

export function useNoticeBoard() {
  return useQuery({
    queryKey: ['operations', 'me', 'notices'],
    queryFn: async () => (await api.get<NoticeBoardItem[]>('/operations/me/notices')).data,
    refetchInterval: 30_000,
  });
}

export function usePlayerActionPlan() {
  return useQuery({
    queryKey: ['operations', 'me', 'action-plan'],
    queryFn: async () => (await api.get<PlayerActionPlan>('/operations/me/action-plan')).data,
    refetchInterval: 30_000,
  });
}

export function useMyNotifications() {
  return useQuery({
    queryKey: ['notifications', 'me'],
    queryFn: async () => (await api.get<InternalNotification[]>('/notifications/me')).data,
    refetchInterval: 30_000,
  });
}

export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: ['notifications', 'me', 'unread-count'],
    queryFn: async () => (await api.get<{ count: number }>('/notifications/me/unread-count')).data,
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post<InternalNotification>(`/notifications/${id}/read`)).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['notifications', 'me'] }),
        queryClient.invalidateQueries({ queryKey: ['notifications', 'me', 'unread-count'] }),
      ]);
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post<{ count: number }>('/notifications/read-all')).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['notifications', 'me'] }),
        queryClient.invalidateQueries({ queryKey: ['notifications', 'me', 'unread-count'] }),
      ]);
    },
  });
}

export function useMyHistory() {
  return useQuery({
    queryKey: ['my-history'],
    queryFn: async () => (await api.get<PlayerHistory>('/players/me/history')).data,
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { timezone?: string; locale?: string }) => (await api.patch('/players/me/preferences', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-history'] }),
  });
}

export function useUpdatePlayerProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { nickname?: string; class?: PlayerClass; dimensionalLayer?: number; timezone?: string; locale?: string }) =>
      (await api.patch('/players/me/profile', data)).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-history'] }),
        queryClient.invalidateQueries({ queryKey: ['players'] }),
      ]);
    },
  });
}

export function useCreateProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      category: ProgressCategory;
      level?: number;
      note?: string;
      imageUrls: string[];
      combatPower?: number;
      dimensionalLayer?: number;
    }) => (await api.post('/players/me/progress', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-history'] }),
  });
}

export function useCommentProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { progressId: string; body: string }) =>
      (await api.post(`/players/progress/${data.progressId}/comments`, { body: data.body })).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-history'] }),
        queryClient.invalidateQueries({ queryKey: ['progress-reviews'] }),
        queryClient.invalidateQueries({ queryKey: ['player-history'] }),
      ]);
    },
  });
}

export function useMarkProgressCommentsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (progressId: string) => (await api.post(`/players/me/progress/${progressId}/read-comments`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-history'] }),
  });
}

export function usePendingProgressReviews() {
  return useQuery({
    queryKey: ['progress-reviews'],
    queryFn: async () => (await api.get<PlayerProgress[]>('/players/progress/pending')).data,
  });
}

export function useApproveProgressReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; combatPower?: number; dimensionalLayer?: number; reviewNote?: string }) => {
      const { id, ...payload } = data;
      return (await api.post<PlayerProgress>(`/players/progress/${id}/approve`, payload)).data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['progress-reviews'] }),
        queryClient.invalidateQueries({ queryKey: ['players'] }),
      ]);
    },
  });
}

export function useRejectProgressReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; reviewNote?: string }) =>
      (await api.post<PlayerProgress>(`/players/progress/${data.id}/reject`, { reviewNote: data.reviewNote })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['progress-reviews'] }),
  });
}

export function usePlayers() {
  return useQuery({
    queryKey: ['players'],
    queryFn: async () => (await api.get<StaffPlayer[]>('/players')).data,
  });
}

export function useUpdatePlayerMembership() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { playerId: string; action: 'DEACTIVATE' | 'ACTIVATE'; reason?: string }) => {
      const { playerId, ...payload } = data;
      return (await api.patch<StaffPlayer>(`/players/${playerId}/membership`, payload)).data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['players'] }),
        queryClient.invalidateQueries({ queryKey: ['combat-roster'] }),
      ]);
    },
  });
}

export function useMyCombatProfile() {
  return useQuery({
    queryKey: ['my-combat-profile'],
    queryFn: async () => (await api.get<StaffPlayer & { combatProfileRequests?: PlayerCombatProfileChangeRequest[] }>('/players/me/combat-profile')).data,
  });
}

export function useRequestCombatProfileChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      primaryClass?: PlayerClass;
      secondaryClass?: PlayerClass;
      declaredBuild?: string;
      preferredRole?: PlayerCombatRole;
      acceptedRoles?: PlayerCombatRole[];
      availability?: PlayerCombatAvailability;
      proofImageUrl?: string;
      note?: string;
    }) => (await api.post<PlayerCombatProfileChangeRequest>('/players/me/combat-profile/requests', data)).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-combat-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['my-history'] }),
      ]);
    },
  });
}

export function useCombatProfileRequests() {
  return useQuery({
    queryKey: ['combat-profile-requests'],
    queryFn: async () => (await api.get<PlayerCombatProfileChangeRequest[]>('/players/combat-profile/requests')).data,
  });
}

export function useCombatRosterMatrix() {
  return useQuery({
    queryKey: ['combat-roster'],
    queryFn: async () => (await api.get<RosterCompositionMatrix>('/players/combat-roster')).data,
  });
}

export function useUpdateCombatProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      playerId: string;
      primaryClass: PlayerClass;
      secondaryClass?: PlayerClass;
      declaredBuild?: string;
      preferredRole?: PlayerCombatRole;
      acceptedRoles?: PlayerCombatRole[];
      availability?: PlayerCombatAvailability;
      publicNote?: string;
      staffNote?: string;
      reason?: string;
    }) => {
      const { playerId, ...payload } = data;
      return (await api.patch(`/players/${playerId}/combat-profile`, payload)).data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['players'] }),
        queryClient.invalidateQueries({ queryKey: ['combat-roster'] }),
        queryClient.invalidateQueries({ queryKey: ['combat-profile-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['player-history'] }),
      ]);
    },
  });
}

export function useReviewCombatProfileRequest(action: 'approve' | 'reject') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { requestId: string; reviewNote?: string }) =>
      (await api.post<PlayerCombatProfileChangeRequest>(`/players/combat-profile/requests/${data.requestId}/${action}`, { reviewNote: data.reviewNote })).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['players'] }),
        queryClient.invalidateQueries({ queryKey: ['combat-roster'] }),
        queryClient.invalidateQueries({ queryKey: ['combat-profile-requests'] }),
      ]);
    },
  });
}

export function useAuditIdentities() {
  return useQuery({
    queryKey: ['audit-identities'],
    queryFn: async () => (await api.get<AuditIdentity[]>('/players/audit/identities')).data,
  });
}

export function useAuditTimeline(targetType: string, targetId: string) {
  return useQuery({
    queryKey: ['audit-timeline', targetType, targetId],
    queryFn: async () => (await api.get<AuditLog[]>(`/audit/${targetType}/${targetId}`, { params: { limit: 25 } })).data,
    enabled: Boolean(targetType && targetId),
  });
}

export function usePlayerHistory(playerId: string) {
  return useQuery({
    queryKey: ['player-history', playerId],
    queryFn: async () => (await api.get<PlayerHistory>(`/players/${playerId}/history`)).data,
    enabled: Boolean(playerId),
  });
}

export function useDiscordHistory(discordId: string) {
  return useQuery({
    queryKey: ['discord-history', discordId],
    queryFn: async () => (await api.get<PlayerHistory>(`/players/audit/discord/${discordId}/history`)).data,
    enabled: Boolean(discordId),
  });
}

export function usePlayerStaffNotes(playerId: string) {
  return useQuery({
    queryKey: ['player-staff-notes', playerId],
    queryFn: async () => (await api.get<PlayerStaffNote[]>(`/players/${playerId}/staff-notes`)).data,
    enabled: Boolean(playerId),
  });
}

export function useCreatePlayerStaffNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { playerId: string; severity: 'INFO' | 'WARNING' | 'STRIKE'; body: string }) =>
      (await api.post<PlayerStaffNote>(`/players/${data.playerId}/staff-notes`, { severity: data.severity, body: data.body })).data,
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['player-staff-notes', variables.playerId] }),
        queryClient.invalidateQueries({ queryKey: ['player-history', variables.playerId] }),
      ]);
    },
  });
}

export function useUploadImage() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return (await api.post<{ url: string; fileId?: string; mimetype: string; size: number }>('/uploads/image', formData)).data;
    },
  });
}

export function useAttendanceStats(playerId: string) {
  return useQuery({
    queryKey: ['attendance', playerId],
    queryFn: async () => (await api.get<AttendanceStats>(`/attendance/player/${playerId}`)).data,
    enabled: Boolean(playerId),
  });
}

export function usePlayerAttendanceHistory(playerId: string) {
  return useQuery({
    queryKey: ['attendance-history', playerId],
    queryFn: async () => (await api.get<PlayerAttendanceHistoryRow[]>(`/attendance/player/${playerId}/history`)).data,
    enabled: Boolean(playerId),
  });
}
