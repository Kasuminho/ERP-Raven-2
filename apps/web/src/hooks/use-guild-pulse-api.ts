import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { GuildPulseMine, GuildPulseStaffWorkspace } from "@/types/api";
const refresh = (qc: ReturnType<typeof useQueryClient>) =>
  qc.invalidateQueries({ queryKey: ["guild-pulse"] });
export function useGuildPulseMine() {
  return useQuery({
    queryKey: ["guild-pulse", "me"],
    queryFn: async () =>
      (await api.get<GuildPulseMine>("/guild-pulse/me")).data,
  });
}
export function useGuildPulseStaff() {
  return useQuery({
    queryKey: ["guild-pulse", "staff"],
    queryFn: async () =>
      (await api.get<GuildPulseStaffWorkspace>("/guild-pulse/staff")).data,
  });
}
export function useSubmitGuildPulse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      belonging: number;
      clarity: number;
      workload: number;
      fun: number;
      helpSafety: number;
      openText?: string;
    }) => api.post(`/guild-pulse/me/${id}/submit`, body),
    onSuccess: () => refresh(qc),
  });
}
export function useSkipGuildPulse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/guild-pulse/me/${id}/skip`),
    onSuccess: () => refresh(qc),
  });
}
export function useCreateGuildPulse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      titlePt: string;
      titleEn: string;
      opensAt: string;
      closesAt: string;
      minGroupSize: number;
      openTextDays: number;
    }) => api.post("/guild-pulse/staff", body),
    onSuccess: () => refresh(qc),
  });
}
export function useSetGuildPulseStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/guild-pulse/staff/${id}/status`, { status }),
    onSuccess: () => refresh(qc),
  });
}
export function useModerateGuildPulse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "APPROVED" | "HIDDEN";
    }) =>
      api.patch(`/guild-pulse/staff/responses/${id}/moderation`, { status }),
    onSuccess: () => refresh(qc),
  });
}
