import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CommunicationPreference, PersonalDigest } from "@/types/api";
const refresh = (c: ReturnType<typeof useQueryClient>) =>
  c.invalidateQueries({ queryKey: ["communications-me"] });
export function useCommunications() {
  return useQuery({
    queryKey: ["communications-me"],
    queryFn: async () =>
      (
        await api.get<{ preference: CommunicationPreference }>(
          "/communications/me",
        )
      ).data,
  });
}
export function useUpdateCommunications() {
  const c = useQueryClient();
  return useMutation({
    mutationFn: ({ playerId: _playerId, ...body }: CommunicationPreference) =>
      api.put("/communications/me", body),
    onSuccess: () => refresh(c),
  });
}
export function usePersonalDigest() {
  return useQuery({
    queryKey: ["communications-digest"],
    queryFn: async () =>
      (await api.get<PersonalDigest>("/communications/me/digest")).data,
  });
}
export function useCommunicationTest() {
  return useMutation({ mutationFn: () => api.post("/communications/me/test") });
}
