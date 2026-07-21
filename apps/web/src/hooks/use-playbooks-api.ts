import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PlaybookMine, PlaybookStaffWorkspace } from "@/types/api";
const refresh = (client: ReturnType<typeof useQueryClient>) => {
  client.invalidateQueries({ queryKey: ["playbooks-staff"] });
  client.invalidateQueries({ queryKey: ["playbooks-me"] });
};
export type PlaybookVersionDraft = {
  key?: string;
  title?: string;
  contentType?: string;
  objectivePt: string;
  objectiveEn: string;
  publicBriefPt: string;
  publicBriefEn: string;
  staffNotes?: string;
  compositionTarget: string[];
  positioning: string[];
  calls: string[];
  risks: string[];
  links: string[];
  checklist: string[];
  roleInstructions: Array<{
    roleKey: string;
    titlePt: string;
    titleEn: string;
    bodyPt: string;
    bodyEn: string;
  }>;
};
export function usePlaybookStaff() {
  return useQuery({
    queryKey: ["playbooks-staff"],
    queryFn: async () =>
      (await api.get<PlaybookStaffWorkspace>("/playbooks/staff")).data,
  });
}
export function usePlaybookLessonCandidates(operationId: string) {
  return useQuery({
    queryKey: ["playbook-candidates", operationId],
    enabled: Boolean(operationId),
    queryFn: async () =>
      (
        await api.get<{
          candidates: Array<{
            sourceKey: string;
            title: string;
            evidence: string;
          }>;
        }>(`/playbooks/staff/operations/${operationId}/lesson-candidates`)
      ).data,
  });
}
export function useSavePlaybook() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      playbookId,
      body,
    }: {
      playbookId?: string;
      body: PlaybookVersionDraft;
    }) =>
      playbookId
        ? api.post(`/playbooks/staff/${playbookId}/versions`, body)
        : api.post("/playbooks/staff", body),
    onSuccess: () => refresh(client),
  });
}
export function useAssignPlaybook() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      versionId: string;
      eventId?: string;
      operationId?: string;
    }) => api.post("/playbooks/staff/assignments", body),
    onSuccess: () => refresh(client),
  });
}
export function useDecidePlaybookLesson() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      operationId: string;
      sourceKey: string;
      playbookId?: string;
      title: string;
      lessonPt: string;
      lessonEn: string;
      disposition: "KEEP" | "TEST" | "DISCARD";
      ownerId: string;
      reviewAt: string;
    }) => api.post("/playbooks/staff/lessons", body),
    onSuccess: () => refresh(client),
  });
}
export function useMyPlaybooks() {
  return useQuery({
    queryKey: ["playbooks-me"],
    queryFn: async () => (await api.get<PlaybookMine>("/playbooks/me")).data,
  });
}
export function useConfirmPlaybookInstruction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) =>
      api.post(`/playbooks/me/assignments/${assignmentId}/confirm`, {
        confirm: true,
      }),
    onSuccess: () => refresh(client),
  });
}
