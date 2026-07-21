import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { GuildCase, GuildCaseCategory, GuildCaseSeverity, GuildCaseStaffWorkspace, GuildCaseStatus } from '@/types/api';

export function useMyGuildCases() {
  return useQuery({ queryKey: ['guild-cases', 'me'], queryFn: async () => (await api.get<GuildCase[]>('/guild-cases/me')).data });
}

export function useCreateGuildCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { category: GuildCaseCategory; severity: GuildCaseSeverity; subject: string; description: string }) => (await api.post<GuildCase>('/guild-cases/me', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guild-cases'] }),
  });
}

export function useAddGuildCaseMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { caseId: string; message: string }) => (await api.post<GuildCase>(`/guild-cases/me/${data.caseId}/messages`, { message: data.message })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guild-cases'] }),
  });
}

export function useGuildCaseStaffWorkspace(status?: GuildCaseStatus | 'ALL') {
  return useQuery({
    queryKey: ['guild-cases', 'staff', status ?? 'ALL'],
    queryFn: async () => (await api.get<GuildCaseStaffWorkspace>('/guild-cases/staff', { params: status && status !== 'ALL' ? { status } : undefined })).data,
  });
}

export function useTriageGuildCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { caseId: string; status?: GuildCaseStatus; severity?: GuildCaseSeverity; assignedToId?: string; dueAt?: string; internalNote?: string }) =>
      (await api.patch<GuildCase>(`/guild-cases/staff/${data.caseId}`, { status: data.status, severity: data.severity, assignedToId: data.assignedToId, dueAt: data.dueAt, internalNote: data.internalNote })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guild-cases'] }),
  });
}

export function useRespondGuildCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { caseId: string; bodyPt: string; bodyEn: string; resolve: boolean }) =>
      (await api.post<GuildCase>(`/guild-cases/staff/${data.caseId}/respond`, { bodyPt: data.bodyPt, bodyEn: data.bodyEn, resolve: data.resolve })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guild-cases'] }),
  });
}
