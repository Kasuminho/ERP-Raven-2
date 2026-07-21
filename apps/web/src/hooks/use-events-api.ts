import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { Announcement, AttendanceStats, Auction, AuctionBid, AuctionBidCancellationRequest, AuctionDiagnosticOption, AuctionDiagnosticSummary, AuctionDossier, AuctionFinalizationPreview, AuctionTimelineEvent, AuditIdentity, AuditLog, BusinessRule, CodexRequest, DaoshiCashReceipt, DaoshiMonthlySummary, DaoshiPlayerSummary, DaoshiRaffle, DaoshiReceiptStatus, DeploymentPanelSummary, DiscordTemplateSummary, DiscordWebhookQueueSummary, DkpEconomySummary, DkpLeaderboardRow, DropHistory, EligibilityResponse, EligibilityRow, EventBatchPanel, EventCompositionTarget, EventDetails, EventFinalizationChecklist, EventNoShowRecord, EventOperationalCategory, EventOperationalPriority, EventReadinessReport, EventRecord, EventReserveEntryRecord, EventRsvpNoteVisibility, EventRsvpRecord, EventRsvpStaffSummary, EventRsvpStatus, EventSeriesRecord, EventType, FinalizeEventResult, GuildRulesSummary, IntegritySummary, InternalNotification, ItemAuditDrop, ItemAuditFull, ItemAuditSummary, ItemCatalog, ItemInterestPost, ItemInterestStatus, ItemRequest, ItemTier, ItemType, LegacyAuditSummary, LootFairnessSummary, MaintenanceModeSummary, NoticeBoardItem, OperationalHealthSummary, PendingAuctionDelivery, PlayerAbsenceReasonVisibility, PlayerAbsenceRecord, PlayerActionPlan, PlayerAttendanceHistoryRow, PlayerClass, PlayerComparisonSummary, PlayerEventCommitment, PlayerHistory, PlayerOperationsSummary, PlayerProgress, PlayerStaffNote, ProgressCategory, SeasonMonthlySummary, StaffDayViewSummary, StaffDkpPlayerRow, StaffHealthSummary, StaffMeetingSummary, StaffMorningBriefing, StaffOperationsSummary, StaffPlayer, Transaction, UniversalDossier, UniversalDossierType, WeeklyGuildSummary } from '@/types/api';

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: async () => (await api.get<EventRecord[]>('/events')).data,
  });
}

export function useAnnouncements() {
  return useQuery({
    queryKey: ['announcements'],
    queryFn: async () => (await api.get<Announcement[]>('/announcements')).data,
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      type: string;
      title: string;
      description?: string;
      eventTime: string;
      timezone?: string;
      channelId?: string;
      mentionRoleId?: string;
      attendanceEventTypes?: EventType[];
    }) => (await api.post<Announcement>('/announcements', data)).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['announcements'] }),
        queryClient.invalidateQueries({ queryKey: ['events'] }),
      ]);
    },
  });
}

export function useCancelAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (announcementId: string) => (await api.post<Announcement>(`/announcements/${announcementId}/cancel`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] }),
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      type: EventType;
      startsAt: string;
      endsAt?: string;
      operationalCategory?: EventOperationalCategory;
      priority?: EventOperationalPriority;
      responsibleUserId?: string;
      operationalNotes?: string;
    }) => (await api.post<EventRecord>('/events', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });
}

export function useEventSeries() {
  return useQuery({
    queryKey: ['event-series'],
    queryFn: async () => (await api.get<EventSeriesRecord[]>('/events/series')).data,
  });
}

export function useCreateEventSeries() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      type: EventType;
      firstStartsAt: string;
      durationMinutes: number;
      intervalWeeks?: number;
      horizonDays?: number;
      timezone?: string;
      operationalCategory?: EventOperationalCategory;
      priority?: EventOperationalPriority;
      exceptionDates?: string[];
      compositionTargets?: EventCompositionTarget[];
    }) => (await api.post<EventSeriesRecord>('/events/series', data)).data,
    onSuccess: async () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ['event-series'] }),
      queryClient.invalidateQueries({ queryKey: ['events'] }),
    ]),
  });
}

export function useSetEventSeriesPaused() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { seriesId: string; paused: boolean }) =>
      (await api.post<EventSeriesRecord>(`/events/series/${data.seriesId}/${data.paused ? 'pause' : 'resume'}`)).data,
    onSuccess: async () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ['event-series'] }),
      queryClient.invalidateQueries({ queryKey: ['events'] }),
    ]),
  });
}

export function useUpdateEventSeriesExceptions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { seriesId: string; exceptionDates: string[] }) =>
      (await api.put<EventSeriesRecord>(`/events/series/${data.seriesId}/exceptions`, { exceptionDates: data.exceptionDates })).data,
    onSuccess: async () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ['event-series'] }),
      queryClient.invalidateQueries({ queryKey: ['events'] }),
    ]),
  });
}

export function useUpdateEventCompositionTargets() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { eventId: string; targets: EventCompositionTarget[] }) =>
      (await api.put<EventRecord>(`/events/${data.eventId}/composition-targets`, { targets: data.targets })).data,
    onSuccess: async (_data, variables) => Promise.all([
      queryClient.invalidateQueries({ queryKey: ['events'] }),
      queryClient.invalidateQueries({ queryKey: ['event-rsvp-staff', variables.eventId] }),
    ]),
  });
}

export function useUpsertEventReserve() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { eventId: string; playerId: string; position: number; reason: string }) =>
      (await api.put<EventReserveEntryRecord>(`/events/${data.eventId}/reserves/${data.playerId}`, { position: data.position, reason: data.reason })).data,
    onSuccess: (_data, variables) => queryClient.invalidateQueries({ queryKey: ['event-rsvp-staff', variables.eventId] }),
  });
}

export function useRemoveEventReserve() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { eventId: string; playerId: string }) => (await api.delete(`/events/${data.eventId}/reserves/${data.playerId}`)).data,
    onSuccess: (_data, variables) => queryClient.invalidateQueries({ queryKey: ['event-rsvp-staff', variables.eventId] }),
  });
}

export function usePromoteEventReserve() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { eventId: string; playerId: string }) => (await api.post(`/events/${data.eventId}/reserves/${data.playerId}/promote`)).data,
    onSuccess: async (_data, variables) => Promise.all([
      queryClient.invalidateQueries({ queryKey: ['event-rsvp-staff', variables.eventId] }),
      queryClient.invalidateQueries({ queryKey: ['event-commitments-me'] }),
    ]),
  });
}

export function useRespondEventReservePromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { eventId: string; accept: boolean; note?: string }) =>
      (await api.put<EventReserveEntryRecord>(`/events/${data.eventId}/reserve-response`, { accept: data.accept, note: data.note })).data,
    onSuccess: async (_data, variables) => Promise.all([
      queryClient.invalidateQueries({ queryKey: ['event-commitments-me'] }),
      queryClient.invalidateQueries({ queryKey: ['event-rsvp-staff', variables.eventId] }),
    ]),
  });
}

export function useMyEventCommitments() {
  return useQuery({
    queryKey: ['event-commitments-me'],
    queryFn: async () => (await api.get<PlayerEventCommitment[]>('/events/commitments/me')).data,
  });
}

export function useMyEventNoShows() {
  return useQuery({
    queryKey: ['event-no-shows-me'],
    queryFn: async () => (await api.get<EventNoShowRecord[]>('/events/no-shows/me')).data,
  });
}

export function useJustifyEventNoShow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { eventId: string; justification: string }) =>
      (await api.put<EventRsvpRecord>(`/events/${data.eventId}/no-show-justification`, { justification: data.justification })).data,
    onSuccess: async (_data, variables) => Promise.all([
      queryClient.invalidateQueries({ queryKey: ['event-no-shows-me'] }),
      queryClient.invalidateQueries({ queryKey: ['event-rsvp-staff', variables.eventId] }),
    ]),
  });
}

export function useMyAbsences() {
  return useQuery({
    queryKey: ['event-absences-me'],
    queryFn: async () => (await api.get<PlayerAbsenceRecord[]>('/events/absences/me')).data,
  });
}

export function useCreateAbsence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { startsAt: string; endsAt: string; reason?: string; reasonVisibility?: PlayerAbsenceReasonVisibility }) =>
      (await api.post<PlayerAbsenceRecord>('/events/absences/me', data)).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['event-absences-me'] }),
        queryClient.invalidateQueries({ queryKey: ['event-commitments-me'] }),
        queryClient.invalidateQueries({ queryKey: ['event-rsvp-staff'] }),
      ]);
    },
  });
}

export function useRemoveAbsence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (absenceId: string) => (await api.delete(`/events/absences/me/${absenceId}`)).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['event-absences-me'] }),
        queryClient.invalidateQueries({ queryKey: ['event-commitments-me'] }),
        queryClient.invalidateQueries({ queryKey: ['event-rsvp-staff'] }),
      ]);
    },
  });
}

export function useRespondEventRsvp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { eventId: string; status: EventRsvpStatus; note?: string; noteVisibility?: EventRsvpNoteVisibility }) =>
      (await api.put<EventRsvpRecord>(`/events/${data.eventId}/rsvp`, {
        status: data.status,
        note: data.note,
        noteVisibility: data.noteVisibility,
      })).data,
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['event-commitments-me'] }),
        queryClient.invalidateQueries({ queryKey: ['event-rsvp-staff', variables.eventId] }),
      ]);
    },
  });
}

export function useEventRsvpStaffSummary(eventId: string) {
  return useQuery({
    queryKey: ['event-rsvp-staff', eventId],
    queryFn: async () => (await api.get<EventRsvpStaffSummary>(`/events/${eventId}/rsvp/staff`)).data,
    enabled: Boolean(eventId),
  });
}

export function useMarkEventChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { eventId: string; key: string; checked: boolean; note?: string }) =>
      (await api.post<EventRecord>(`/events/${data.eventId}/checklist/${encodeURIComponent(data.key)}`, {
        checked: data.checked,
        note: data.note,
      })).data,
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['events'] }),
        queryClient.invalidateQueries({ queryKey: ['event-attendance', variables.eventId] }),
        queryClient.invalidateQueries({ queryKey: ['event-readiness', variables.eventId] }),
      ]);
    },
  });
}

export function useRegisterAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { eventId: string; playerId: string }) => (await api.post(`/events/${data.eventId}/attendance`, { playerId: data.playerId })).data,
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['events'] }),
        queryClient.invalidateQueries({ queryKey: ['event-attendance', variables.eventId] }),
        queryClient.invalidateQueries({ queryKey: ['event-finalization-checklist', variables.eventId] }),
        queryClient.invalidateQueries({ queryKey: ['event-readiness', variables.eventId] }),
        queryClient.invalidateQueries({ queryKey: ['event-batch-panel'] }),
      ]);
    },
  });
}

export function useRemoveAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { eventId: string; playerId: string }) => (await api.delete(`/events/${data.eventId}/attendance/${data.playerId}`)).data,
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['events'] }),
        queryClient.invalidateQueries({ queryKey: ['event-attendance', variables.eventId] }),
        queryClient.invalidateQueries({ queryKey: ['event-finalization-checklist', variables.eventId] }),
        queryClient.invalidateQueries({ queryKey: ['event-readiness', variables.eventId] }),
        queryClient.invalidateQueries({ queryKey: ['event-batch-panel'] }),
      ]);
    },
  });
}

export function useFinalizeEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => (await api.post<FinalizeEventResult>(`/events/${eventId}/finalize`)).data,
    onSuccess: async (data, eventId) => {
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: ['events'] }),
        queryClient.invalidateQueries({ queryKey: ['event-attendance', eventId] }),
        queryClient.invalidateQueries({ queryKey: ['event-finalization-checklist', eventId] }),
        queryClient.invalidateQueries({ queryKey: ['event-readiness', eventId] }),
        queryClient.invalidateQueries({ queryKey: ['event-batch-panel'] }),
      ];

      if (data.nextEvent) {
        invalidations.push(queryClient.invalidateQueries({ queryKey: ['event-attendance', data.nextEvent.id] }));
        invalidations.push(queryClient.invalidateQueries({ queryKey: ['event-finalization-checklist', data.nextEvent.id] }));
      }

      await Promise.all(invalidations);
    },
  });
}

export function useCancelEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { eventId: string; reason?: string }) => (await api.post(`/events/${data.eventId}/cancel`, { reason: data.reason })).data,
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['events'] }),
        queryClient.invalidateQueries({ queryKey: ['event-attendance', variables.eventId] }),
        queryClient.invalidateQueries({ queryKey: ['event-finalization-checklist', variables.eventId] }),
        queryClient.invalidateQueries({ queryKey: ['event-readiness', variables.eventId] }),
        queryClient.invalidateQueries({ queryKey: ['event-batch-panel'] }),
        queryClient.invalidateQueries({ queryKey: ['dkp-leaderboard'] }),
      ]);
    },
  });
}

export function useEventAttendance(eventId: string) {
  return useQuery({
    queryKey: ['event-attendance', eventId],
    queryFn: async () => (await api.get<EventDetails>(`/events/${eventId}/attendance`)).data,
    enabled: Boolean(eventId),
  });
}

export function useEventFinalizationChecklist(eventId: string) {
  return useQuery({
    queryKey: ['event-finalization-checklist', eventId],
    queryFn: async () => (await api.get<EventFinalizationChecklist>(`/events/${eventId}/finalization-checklist`)).data,
    enabled: Boolean(eventId),
  });
}

export function useEventBatchPanel(batchId: string) {
  return useQuery({
    queryKey: ['event-batch-panel', batchId],
    queryFn: async () => (await api.get<EventBatchPanel>(`/events/batches/${batchId}`)).data,
    enabled: Boolean(batchId),
  });
}

export function useEventReadiness(eventId: string) {
  return useQuery({
    queryKey: ['event-readiness', eventId],
    queryFn: async () => (await api.get<EventReadinessReport>(`/events/${eventId}/readiness`)).data,
    enabled: Boolean(eventId),
  });
}
