import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  MentorshipHelpTopic,
  MentorshipStaffWorkspace,
  MentorshipWorkspace,
  PlayerCombatRole,
} from "@/types/api";

export function useMentorship() {
  return useQuery({
    queryKey: ["mentorship", "me"],
    queryFn: async () =>
      (await api.get<MentorshipWorkspace>("/mentorship/me")).data,
  });
}
export function useMentorshipStaff() {
  return useQuery({
    queryKey: ["mentorship", "staff"],
    queryFn: async () =>
      (await api.get<MentorshipStaffWorkspace>("/mentorship/staff")).data,
  });
}
function mutation<T>(fn: (input: T) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mentorship"] }),
  });
}
export function useUpdateMentorProfile() {
  return mutation(
    (input: {
      isAvailable: boolean;
      topics: MentorshipHelpTopic[];
      roles: PlayerCombatRole[];
      notePt?: string;
      noteEn?: string;
    }) => api.patch("/mentorship/me/mentor-profile", input),
  );
}
export function useRequestMentorshipHelp() {
  return mutation(
    (input: {
      topic: MentorshipHelpTopic;
      requestedRole?: PlayerCombatRole;
      body?: string;
    }) => api.post("/mentorship/me/help", input),
  );
}
export function useAssignMentorship() {
  return mutation(
    (input: { menteeId: string; mentorId?: string; groupName?: string }) =>
      api.post("/mentorship/staff/assignments", input),
  );
}
export function useTriageMentorshipHelp() {
  return mutation(
    (input: { id: string; status: string; assignedMentorId?: string }) =>
      api.patch(`/mentorship/staff/help/${input.id}`, {
        status: input.status,
        assignedMentorId: input.assignedMentorId,
      }),
  );
}
