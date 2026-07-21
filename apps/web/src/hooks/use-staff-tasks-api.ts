import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  LeadershipArea,
  StaffTaskPriority,
  StaffTaskStatus,
  StaffTaskWorkspace,
} from "@/types/api";
const refresh = (qc: ReturnType<typeof useQueryClient>) =>
  qc.invalidateQueries({ queryKey: ["staff-tasks"] });
export function useStaffTasks() {
  return useQuery({
    queryKey: ["staff-tasks"],
    queryFn: async () =>
      (await api.get<StaffTaskWorkspace>("/staff-tasks")).data,
  });
}
export type StaffTaskDraft = {
  title: string;
  description: string;
  area: LeadershipArea;
  priority: StaffTaskPriority;
  ownerId?: string;
  substituteId?: string;
  dueAt?: string;
  href: string;
  sourceType?: string;
  sourceKey?: string;
};
export function useCreateStaffTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: StaffTaskDraft) => api.post("/staff-tasks", body),
    onSuccess: () => refresh(qc),
  });
}
export function useUpdateStaffTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      status?: StaffTaskStatus;
      priority?: StaffTaskPriority;
      ownerId?: string;
      substituteId?: string;
      dueAt?: string;
    }) => api.patch(`/staff-tasks/${id}`, body),
    onSuccess: () => refresh(qc),
  });
}
export function useStaffTaskHandoff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      context: string;
      nextStep: string;
      toOwnerId?: string;
    }) => api.post(`/staff-tasks/${id}/handoffs`, body),
    onSuccess: () => refresh(qc),
  });
}
