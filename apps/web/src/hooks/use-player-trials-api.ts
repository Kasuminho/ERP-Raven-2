import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PlayerTrialStaffWorkspace, PlayerTrialWorkspace } from '@/types/api';

export type PlayerTrialDraft = { playerId: string; objectivePt: string; objectiveEn: string; plannedStartAt: string; plannedEndAt: string; criteria: Array<{ key: string; titlePt: string; titleEn: string; descriptionPt: string; descriptionEn: string; isRequired: boolean; displayOrder: number }> };

export function useMyPlayerTrial() { return useQuery({ queryKey: ['player-trials', 'me'], queryFn: async () => (await api.get<PlayerTrialWorkspace>('/player-trials/me')).data }); }
export function usePlayerTrialsStaff() { return useQuery({ queryKey: ['player-trials', 'staff'], queryFn: async () => (await api.get<PlayerTrialStaffWorkspace>('/player-trials/staff')).data }); }

function useRefreshTrials<TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['player-trials'] }) });
}
export function useCreatePlayerTrial() { return useRefreshTrials((draft: PlayerTrialDraft) => api.post('/player-trials/staff', draft).then((response) => response.data)); }
export function useCompleteTrialCheckIn() { return useRefreshTrials(({ trialId, day, bodyPt, bodyEn, internalNote }: { trialId: string; day: number; bodyPt: string; bodyEn: string; internalNote?: string }) => api.post(`/player-trials/staff/${trialId}/check-ins/${day}`, { bodyPt, bodyEn, internalNote }).then((response) => response.data)); }
export function useDecidePlayerTrial() { return useRefreshTrials(({ trialId, decision, reasonPt, reasonEn, extendedEndAt }: { trialId: string; decision: 'APPROVE' | 'EXTEND' | 'CLOSE'; reasonPt: string; reasonEn: string; extendedEndAt?: string }) => api.post(`/player-trials/staff/${trialId}/decision`, { decision, reasonPt, reasonEn, extendedEndAt }).then((response) => response.data)); }
