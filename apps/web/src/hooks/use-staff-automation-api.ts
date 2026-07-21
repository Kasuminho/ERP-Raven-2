import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  StaffAutomationProposal,
  StaffAutomationWorkspace,
} from "@/types/api";
const refresh = (client: ReturnType<typeof useQueryClient>) =>
  client.invalidateQueries({ queryKey: ["staff-automations"] });
export function useStaffAutomations() {
  return useQuery({
    queryKey: ["staff-automations"],
    queryFn: async () =>
      (await api.get<StaffAutomationWorkspace>("/staff-automations")).data,
  });
}
export function useCreateStaffAutomationDryRun() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      observedCount: _count,
      observedWindowDays: _days,
      ...body
    }: StaffAutomationProposal) =>
      api.post("/staff-automations/dry-runs", body),
    onSuccess: () => refresh(client),
  });
}
export function useActivateStaffAutomation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`/staff-automations/${id}/activate`, { confirm: true }),
    onSuccess: () => refresh(client),
  });
}
export function useStaffAutomationKillSwitch() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, killSwitch }: { id: string; killSwitch: boolean }) =>
      api.patch(`/staff-automations/${id}/kill-switch`, { killSwitch }),
    onSuccess: () => refresh(client),
  });
}
