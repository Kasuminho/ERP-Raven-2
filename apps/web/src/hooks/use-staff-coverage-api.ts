import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { LeadershipArea, StaffCoverageWorkspace } from "@/types/api";

const refresh = (client: ReturnType<typeof useQueryClient>) =>
  client.invalidateQueries({ queryKey: ["staff-coverage"] });
export function useStaffCoverage() {
  return useQuery({
    queryKey: ["staff-coverage"],
    queryFn: async () =>
      (await api.get<StaffCoverageWorkspace>("/staff-coverage")).data,
  });
}
export function useUpsertStaffCoverage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      area: LeadershipArea;
      primaryUserId?: string;
      backupUserId?: string;
      onCallStartsAt: string;
      onCallEndsAt: string;
      timezone: string;
    }) => api.put("/staff-coverage/areas", body),
    onSuccess: () => refresh(client),
  });
}
export function useDeclareStaffUnavailable() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { startsAt: string; endsAt: string; reason?: string }) =>
      api.post("/staff-coverage/unavailability", body),
    onSuccess: () => refresh(client),
  });
}
export function useRemoveStaffUnavailable() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/staff-coverage/unavailability/${id}`),
    onSuccess: () => refresh(client),
  });
}
