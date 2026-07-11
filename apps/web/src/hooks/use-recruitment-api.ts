import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PlayerClass, RecruitmentApplication, RecruitmentApplicationStatus } from '@/types/api';

export function useCreateRecruitmentApplication() {
  return useMutation({
    mutationFn: async (data: {
      nickname: string;
      discordTag?: string;
      playerClass: PlayerClass;
      combatPower: number;
      dimensionalLayer: number;
      availability: string;
      focus: string;
      experience: string;
      proofImageUrl?: string;
      notes?: string;
      rulesAccepted: boolean;
    }) => (await api.post<RecruitmentApplication>('/recruitment/applications', data)).data,
  });
}

export function useStaffRecruitmentApplications(status: RecruitmentApplicationStatus | 'ALL' = 'PENDING') {
  return useQuery({
    queryKey: ['recruitment', 'staff', status],
    queryFn: async () => (await api.get<RecruitmentApplication[]>('/recruitment/staff/applications', { params: status === 'ALL' ? undefined : { status } })).data,
    refetchInterval: 60_000,
  });
}

export function useReviewRecruitmentApplication(status: RecruitmentApplicationStatus | 'ALL' = 'PENDING') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { applicationId: string; status: Exclude<RecruitmentApplicationStatus, 'PENDING' | 'CONVERTED'>; reviewNote: string }) =>
      (await api.post<RecruitmentApplication>(`/recruitment/staff/applications/${data.applicationId}/review`, {
        status: data.status,
        reviewNote: data.reviewNote,
      })).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['recruitment', 'staff'] }),
        queryClient.invalidateQueries({ queryKey: ['recruitment', 'staff', status] }),
      ]);
    },
  });
}

export function useConvertRecruitmentApplication(status: RecruitmentApplicationStatus | 'ALL' = 'PENDING') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { applicationId: string; userId: string; nickname?: string; onboardingNote: string }) =>
      (await api.post<RecruitmentApplication>(`/recruitment/staff/applications/${data.applicationId}/convert`, {
        userId: data.userId,
        nickname: data.nickname,
        onboardingNote: data.onboardingNote,
      })).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['recruitment', 'staff'] }),
        queryClient.invalidateQueries({ queryKey: ['recruitment', 'staff', status] }),
      ]);
    },
  });
}
