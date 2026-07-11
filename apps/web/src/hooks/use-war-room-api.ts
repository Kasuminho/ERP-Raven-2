import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  PlayerClass,
  PlayerCombatRole,
  PlayerWarRoomAssignment,
  WarRoomAfterActionReport,
  WarRoomInternalLink,
  WarRoomLiveDossier,
  WarRoomOperation,
  WarRoomOperationPriority,
  WarRoomOperationStatus,
  WarRoomOperationType,
  WarRoomRosterDossier,
  WarRoomRosterSlot,
  WarRoomRosterSlotStatus,
  WarRoomTimelineEvent,
  WarRoomTimelineEventType,
} from '@/types/api';

type WarRoomOperationPayload = {
  name: string;
  type: WarRoomOperationType;
  startsAt: string;
  endsAt: string;
  priority?: WarRoomOperationPriority;
  status?: WarRoomOperationStatus;
  mapRegion?: string;
  objective?: string;
  staffNotes?: string;
  result?: string;
  score?: string;
  improvementNotes?: string;
  internalLinks?: WarRoomInternalLink[];
  eventId?: string;
};

type WarRoomRosterSlotPayload = {
  operationId: string;
  playerId: string;
  role: PlayerCombatRole;
  requiredClass?: PlayerClass;
  requiredLayer?: number;
  publicInstructionsPt?: string;
  publicInstructionsEn?: string;
  staffNote?: string;
};

type WarRoomRosterSlotUpdatePayload = Partial<Omit<WarRoomRosterSlotPayload, 'operationId' | 'playerId'>> & {
  operationId: string;
  slotId: string;
  status?: WarRoomRosterSlotStatus;
};

type WarRoomTimelineEventPayload = {
  operationId: string;
  type: WarRoomTimelineEventType;
  title: string;
  note?: string;
  occurredAt?: string;
  metadata?: Record<string, unknown>;
};

export function useWarRoomOperations() {
  return useQuery({
    queryKey: ['war-room-operations'],
    queryFn: async () => (await api.get<WarRoomOperation[]>('/war-room/operations')).data,
  });
}

export function useCreateWarRoomOperation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: WarRoomOperationPayload) => (await api.post<WarRoomOperation>('/war-room/operations', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['war-room-operations'] }),
  });
}

export function useUpdateWarRoomOperation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<WarRoomOperationPayload> & { operationId: string }) => {
      const { operationId, ...payload } = data;
      return (await api.patch<WarRoomOperation>(`/war-room/operations/${operationId}`, payload)).data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['war-room-operations'] }),
  });
}

export function useOpenWarRoomOperation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (operationId: string) => (await api.post<WarRoomOperation>(`/war-room/operations/${operationId}/open`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['war-room-operations'] }),
  });
}

export function useCloseWarRoomOperation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { operationId: string; result?: string; score?: string; improvementNotes?: string }) =>
      (await api.post<WarRoomOperation>(`/war-room/operations/${data.operationId}/close`, {
        result: data.result,
        score: data.score,
        improvementNotes: data.improvementNotes,
      })).data,
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['war-room-operations'] });
      queryClient.invalidateQueries({ queryKey: ['war-room-live', variables.operationId] });
      queryClient.invalidateQueries({ queryKey: ['war-room-after-action', variables.operationId] });
    },
  });
}

export function useCancelWarRoomOperation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (operationId: string) => (await api.post<WarRoomOperation>(`/war-room/operations/${operationId}/cancel`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['war-room-operations'] }),
  });
}

export function useWarRoomRoster(operationId?: string) {
  return useQuery({
    queryKey: ['war-room-roster', operationId],
    enabled: Boolean(operationId),
    queryFn: async () => (await api.get<WarRoomRosterDossier>(`/war-room/operations/${operationId}/roster`)).data,
  });
}

export function useWarRoomLiveDossier(operationId?: string) {
  return useQuery({
    queryKey: ['war-room-live', operationId],
    enabled: Boolean(operationId),
    refetchInterval: 15_000,
    queryFn: async () => (await api.get<WarRoomLiveDossier>(`/war-room/operations/${operationId}/live`)).data,
  });
}

export function useWarRoomAfterActionReport(operationId?: string) {
  return useQuery({
    queryKey: ['war-room-after-action', operationId],
    enabled: Boolean(operationId),
    queryFn: async () => (await api.get<WarRoomAfterActionReport>(`/war-room/operations/${operationId}/after-action`)).data,
  });
}

export function useCreateWarRoomTimelineEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: WarRoomTimelineEventPayload) => {
      const { operationId, ...payload } = data;
      return (await api.post<WarRoomTimelineEvent>(`/war-room/operations/${operationId}/timeline`, payload)).data;
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['war-room-live', variables.operationId] });
    },
  });
}

export function useCreateWarRoomRosterSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: WarRoomRosterSlotPayload) => {
      const { operationId, ...payload } = data;
      return (await api.post<WarRoomRosterSlot>(`/war-room/operations/${operationId}/roster`, payload)).data;
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['war-room-roster', variables.operationId] });
    },
  });
}

export function useUpdateWarRoomRosterSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: WarRoomRosterSlotUpdatePayload) => {
      const { operationId, slotId, ...payload } = data;
      return (await api.patch<WarRoomRosterSlot>(`/war-room/operations/${operationId}/roster/${slotId}`, payload)).data;
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['war-room-roster', variables.operationId] });
      queryClient.invalidateQueries({ queryKey: ['my-war-room'] });
    },
  });
}

export function useMarkWarRoomAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { operationId: string; slotId: string; status: WarRoomRosterSlotStatus; staffNote?: string }) =>
      (await api.post<WarRoomRosterSlot>(`/war-room/operations/${data.operationId}/roster/${data.slotId}/attendance`, {
        status: data.status,
        staffNote: data.staffNote,
      })).data,
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['war-room-roster', variables.operationId] });
      queryClient.invalidateQueries({ queryKey: ['my-war-room'] });
    },
  });
}

export function useMyWarRoomAssignments() {
  return useQuery({
    queryKey: ['my-war-room'],
    queryFn: async () => (await api.get<PlayerWarRoomAssignment[]>('/war-room/me')).data,
  });
}

export function useConfirmWarRoomSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { slotId: string; playerNote?: string }) =>
      (await api.post<PlayerWarRoomAssignment>(`/war-room/me/slots/${data.slotId}/confirm`, { playerNote: data.playerNote })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-war-room'] }),
  });
}

export function useDeclineWarRoomSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { slotId: string; playerNote?: string }) =>
      (await api.post<PlayerWarRoomAssignment>(`/war-room/me/slots/${data.slotId}/decline`, { playerNote: data.playerNote })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-war-room'] }),
  });
}
