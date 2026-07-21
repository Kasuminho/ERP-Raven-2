import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { OnboardingCompletionType, OnboardingStaffWorkspace, OnboardingTemplate, PlayerOnboardingWorkspace } from '@/types/api';

export type OnboardingTemplateDraft = {
  name: string;
  dueDays: number;
  steps: Array<{ key: string; titlePt: string; titleEn: string; descriptionPt: string; descriptionEn: string; href: string; isRequired: boolean; completionType: OnboardingCompletionType; displayOrder: number }>;
};

export function useMyOnboarding() {
  return useQuery({ queryKey: ['onboarding', 'me'], queryFn: async () => (await api.get<PlayerOnboardingWorkspace>('/onboarding/me')).data });
}

export function useCompleteOnboardingStep() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async (stepId: string) => (await api.patch<PlayerOnboardingWorkspace>(`/onboarding/me/steps/${stepId}/complete`)).data, onSuccess: (data) => queryClient.setQueryData(['onboarding', 'me'], data) });
}

export function useOnboardingStaffWorkspace() {
  return useQuery({ queryKey: ['onboarding', 'staff'], queryFn: async () => (await api.get<OnboardingStaffWorkspace>('/onboarding/staff')).data });
}

export function useCreateOnboardingTemplate() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async (draft: OnboardingTemplateDraft) => (await api.post<OnboardingTemplate>('/onboarding/staff/templates', draft)).data, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['onboarding'] }) });
}
