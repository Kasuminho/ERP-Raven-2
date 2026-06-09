import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { Announcement, AttendanceStats, Auction, AuctionBid, AuditIdentity, AuditLog, CodexRequest, DkpLeaderboardRow, DropHistory, EligibilityResponse, EligibilityRow, EventDetails, EventRecord, EventType, ItemCatalog, ItemInterestPost, ItemInterestStatus, ItemRequest, ItemTier, ItemType, PendingAuctionDelivery, PlayerAttendanceHistoryRow, PlayerClass, PlayerHistory, PlayerOperationsSummary, PlayerProgress, ProgressCategory, StaffDkpPlayerRow, StaffHealthSummary, StaffOperationsSummary, StaffPlayer, Transaction } from '@/types/api';

export function usePlayerId() {
  return useAuthStore((state) => state.playerId) ?? '';
}

export function useUserId() {
  return useAuthStore((state) => state.userId) ?? '';
}

export function useDkpSummary(playerId: string) {
  return useQuery({
    queryKey: ['dkp-summary', playerId],
    queryFn: async () => {
      const [total, locked, available] = await Promise.all([
        api.get<{ total: number }>(`/dkp/${playerId}/total`),
        api.get<{ locked: number }>(`/dkp/${playerId}/locked`),
        api.get<{ available: number }>(`/dkp/${playerId}/available`),
      ]);

      return { total: total.data.total, locked: locked.data.locked, available: available.data.available };
    },
    enabled: Boolean(playerId),
  });
}

export function useDkpLeaderboard() {
  return useQuery({
    queryKey: ['dkp-leaderboard'],
    queryFn: async () => (await api.get<DkpLeaderboardRow[]>('/dkp/leaderboard')).data,
    refetchInterval: 30_000,
  });
}

export function usePlayerOperations() {
  return useQuery({
    queryKey: ['operations', 'me'],
    queryFn: async () => (await api.get<PlayerOperationsSummary>('/operations/me')).data,
    refetchInterval: 30_000,
  });
}

export function useStaffOperations() {
  return useQuery({
    queryKey: ['operations', 'staff'],
    queryFn: async () => (await api.get<StaffOperationsSummary>('/operations/staff')).data,
    refetchInterval: 30_000,
  });
}

export function useStaffHealth() {
  return useQuery({
    queryKey: ['operations', 'staff-health'],
    queryFn: async () => (await api.get<StaffHealthSummary>('/operations/staff/health')).data,
    refetchInterval: 60_000,
  });
}

export function useRecentAudit(limit = 20) {
  return useQuery({
    queryKey: ['operations', 'audit', limit],
    queryFn: async () => (await api.get<AuditLog[]>('/operations/staff/audit', { params: { limit } })).data,
    refetchInterval: 30_000,
  });
}

export function useStaffDkpPlayers(search?: string) {
  return useQuery({
    queryKey: ['dkp-staff-players', search ?? ''],
    queryFn: async () => (await api.get<StaffDkpPlayerRow[]>('/dkp/staff/players', { params: search ? { search } : undefined })).data,
    refetchInterval: 30_000,
  });
}

export function useCreateDkpTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { playerId: string; amount: number; type: 'ADMIN_ADJUSTMENT'; referenceId?: string }) =>
      (await api.post<Transaction>('/dkp/transaction', data)).data,
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dkp-staff-players'] }),
        queryClient.invalidateQueries({ queryKey: ['dkp-leaderboard'] }),
        queryClient.invalidateQueries({ queryKey: ['my-history'] }),
        queryClient.invalidateQueries({ queryKey: ['player-history', variables.playerId] }),
      ]);
    },
  });
}

export function useAuctions() {
  return useQuery({
    queryKey: ['auctions'],
    queryFn: async () => (await api.get<Auction[]>('/auctions')).data,
    refetchInterval: 20_000,
  });
}

export function useItems() {
  return useQuery({
    queryKey: ['items'],
    queryFn: async () => (await api.get<ItemCatalog[]>('/items', { params: { limit: 500 } })).data,
  });
}

export function useRequestableItems() {
  return useQuery({
    queryKey: ['items', 'requestable'],
    queryFn: async () => (await api.get<ItemCatalog[]>('/items/requestable')).data,
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      kind: string;
      category: string;
      itemTier: ItemTier;
      itemType: ItemType;
      namePt: string;
      nameEn: string;
      nameEs?: string;
      typePt: string;
      typeEn: string;
      typeEs?: string;
      image1Url?: string;
      image2Url?: string;
      createdById?: string;
    }) => (await api.post<ItemCatalog>('/items', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['items'] }),
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: string;
      kind?: string;
      category?: string;
      itemTier?: ItemTier;
      itemType?: ItemType;
      namePt?: string;
      nameEn?: string;
      nameEs?: string;
      typePt?: string;
      typeEn?: string;
      typeEs?: string;
      image1Url?: string;
      image2Url?: string;
      isActive?: boolean;
    }) => {
      const { id, ...payload } = data;
      return (await api.patch<ItemCatalog>(`/items/${id}`, payload)).data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['items'] }),
        queryClient.invalidateQueries({ queryKey: ['auctions'] }),
      ]);
    },
  });
}

export function useCreateItemAuctions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { itemId: string; quantity: number; createdById: string }) =>
      (await api.post<Auction[]>(`/items/${data.itemId}/auctions`, { quantity: data.quantity })).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['items'] }),
        queryClient.invalidateQueries({ queryKey: ['auctions'] }),
      ]);
    },
  });
}

export function useItemRequests() {
  return useQuery({
    queryKey: ['item-requests'],
    queryFn: async () => (await api.get<ItemRequest[]>('/item-requests')).data,
  });
}

export function useStaffItemRequests() {
  return useQuery({
    queryKey: ['item-requests', 'staff'],
    queryFn: async () => (await api.get<ItemRequest[]>('/item-requests/staff')).data,
    refetchInterval: 30_000,
  });
}

export function useItemRequestRankings() {
  return useQuery({
    queryKey: ['item-requests', 'rankings'],
    queryFn: async () => (await api.get<ItemRequest[]>('/item-requests/rankings')).data,
    refetchInterval: 30_000,
  });
}

export function useCreateItemRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { itemCatalogId: string; playerId: string; quantity: number; imageUrl?: string; threadId?: string; threadChannelId?: string }) =>
      (await api.post<ItemRequest>('/item-requests', data)).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['item-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['item-requests', 'staff'] }),
        queryClient.invalidateQueries({ queryKey: ['item-requests', 'rankings'] }),
      ]);
    },
  });
}

export function useUpdateItemRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post<ItemRequest>(`/item-requests/${id}/update`)).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['item-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['item-requests', 'staff'] }),
        queryClient.invalidateQueries({ queryKey: ['item-requests', 'rankings'] }),
      ]);
    },
  });
}

export function usePlayerUpdateItemRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; imageUrl: string; note?: string }) =>
      (await api.post<ItemRequest>(`/item-requests/${data.id}/player-update`, { imageUrl: data.imageUrl, note: data.note })).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['item-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['item-requests', 'staff'] }),
        queryClient.invalidateQueries({ queryKey: ['my-history'] }),
        queryClient.invalidateQueries({ queryKey: ['item-requests', 'rankings'] }),
      ]);
    },
  });
}

export function useApproveItemRequestUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; remainingQuantity: number; note?: string }) =>
      (await api.post<ItemRequest>(`/item-requests/${data.id}/approve-update`, { remainingQuantity: data.remainingQuantity, note: data.note })).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['item-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['item-requests', 'staff'] }),
        queryClient.invalidateQueries({ queryKey: ['item-requests', 'rankings'] }),
      ]);
    },
  });
}

export function useDeliverItemRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; quantity: number; reason?: string }) =>
      (await api.post<{ delivered: number; completed: boolean }>(`/item-requests/${data.id}/deliver`, { quantity: data.quantity, reason: data.reason })).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['item-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['item-requests', 'staff'] }),
        queryClient.invalidateQueries({ queryKey: ['item-requests', 'rankings'] }),
        queryClient.invalidateQueries({ queryKey: ['drops'] }),
      ]);
    },
  });
}

export function useDropItemRequestRank() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/item-requests/${id}/drop-rank`)).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['item-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['item-requests', 'staff'] }),
        queryClient.invalidateQueries({ queryKey: ['item-requests', 'rankings'] }),
      ]);
    },
  });
}

export function useDeleteItemRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/item-requests/${id}`)).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['item-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['item-requests', 'staff'] }),
        queryClient.invalidateQueries({ queryKey: ['item-requests', 'rankings'] }),
      ]);
    },
  });
}

export function useItemInterests(status?: ItemInterestStatus) {
  return useQuery({
    queryKey: ['item-interests', status ?? 'all'],
    queryFn: async () => (await api.get<ItemInterestPost[]>('/item-interests', { params: status ? { status } : undefined })).data,
  });
}

export function useCreateItemInterest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { itemCatalogId: string; mode?: 'PvE' | 'PvP'; title?: string; closesAt: string }) =>
      (await api.post<ItemInterestPost>('/item-interests', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['item-interests'] }),
  });
}

export function useCreateBulkItemInterests() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { itemCatalogIds: string[]; mode: 'PvE' | 'PvP'; closesAt: string }) =>
      (await api.post<ItemInterestPost[]>('/item-interests/bulk', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['item-interests'] }),
  });
}

export function useDeclareItemInterest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { postId: string; note?: string; imageUrl?: string }) =>
      (await api.post(`/item-interests/${data.postId}/declare`, { note: data.note, imageUrl: data.imageUrl })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['item-interests'] }),
  });
}

export function useVoteItemInterest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { postId: string; entryId: string }) =>
      (await api.post<ItemInterestPost>(`/item-interests/${data.postId}/vote`, { entryId: data.entryId })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['item-interests'] }),
  });
}

export function useStartItemInterestTieBreak() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => (await api.post<ItemInterestPost>(`/item-interests/${postId}/tie-break`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['item-interests'] }),
  });
}

export function useCloseItemInterest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post<ItemInterestPost>(`/item-interests/${id}/close`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['item-interests'] }),
  });
}

export function useDeliverItemInterest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; entryIds: string[]; proofImageUrl?: string }) =>
      (await api.post<ItemInterestPost>(`/item-interests/${data.id}/deliver`, { entryIds: data.entryIds, proofImageUrl: data.proofImageUrl })).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['item-interests'] }),
        queryClient.invalidateQueries({ queryKey: ['drops'] }),
        queryClient.invalidateQueries({ queryKey: ['my-drops'] }),
        queryClient.invalidateQueries({ queryKey: ['my-history'] }),
      ]);
    },
  });
}

export function useMyCodexRequests() {
  return useQuery({
    queryKey: ['codex-me'],
    queryFn: async () => (await api.get<CodexRequest[]>('/codex/me')).data,
    refetchInterval: 30_000,
  });
}

export function useCreateCodexRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { imageUrl: string; note?: string }) => (await api.post<CodexRequest>('/codex/me', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['codex-me'] }),
  });
}

export function useConfirmCodexRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post<CodexRequest>(`/codex/${id}/confirm`)).data,
    onSuccess: async (_data, id) => {
      queryClient.setQueryData<CodexRequest[]>(['codex-me'], (current) => current?.filter((request) => request.id !== id) ?? current);
      queryClient.setQueryData<CodexRequest[]>(['codex-staff'], (current) => current?.filter((request) => request.id !== id) ?? current);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['codex-me'] }),
        queryClient.invalidateQueries({ queryKey: ['codex-staff'] }),
      ]);
    },
  });
}

export function useRetryCodexRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post<CodexRequest>(`/codex/${id}/retry`)).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['codex-me'] }),
        queryClient.invalidateQueries({ queryKey: ['codex-staff'] }),
      ]);
    },
  });
}

export function useStaffCodexRequests() {
  return useQuery({
    queryKey: ['codex-staff'],
    queryFn: async () => (await api.get<CodexRequest[]>('/codex')).data,
    refetchInterval: 30_000,
  });
}

export function useSendCodexRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; proofImageUrl?: string }) =>
      (await api.post<CodexRequest>(`/codex/${data.id}/send`, { proofImageUrl: data.proofImageUrl })).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['codex-staff'] }),
        queryClient.invalidateQueries({ queryKey: ['codex-me'] }),
      ]);
    },
  });
}

export function useCreateMyItemRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { itemCatalogId: string; quantity: number; imageUrl?: string }) => (await api.post<ItemRequest>('/item-requests/me', data)).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-history'] }),
        queryClient.invalidateQueries({ queryKey: ['item-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['item-requests', 'rankings'] }),
      ]);
    },
  });
}

export function useMyHistory() {
  return useQuery({
    queryKey: ['my-history'],
    queryFn: async () => (await api.get<PlayerHistory>('/players/me/history')).data,
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { timezone?: string; locale?: string }) => (await api.patch('/players/me/preferences', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-history'] }),
  });
}

export function useUpdatePlayerProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { nickname?: string; class?: PlayerClass; dimensionalLayer?: number; timezone?: string; locale?: string }) =>
      (await api.patch('/players/me/profile', data)).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-history'] }),
        queryClient.invalidateQueries({ queryKey: ['players'] }),
      ]);
    },
  });
}

export function useCreateProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      category: ProgressCategory;
      level?: number;
      note?: string;
      imageUrls: string[];
      combatPower?: number;
      dimensionalLayer?: number;
    }) => (await api.post('/players/me/progress', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-history'] }),
  });
}

export function useCommentProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { progressId: string; body: string }) =>
      (await api.post(`/players/progress/${data.progressId}/comments`, { body: data.body })).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-history'] }),
        queryClient.invalidateQueries({ queryKey: ['progress-reviews'] }),
        queryClient.invalidateQueries({ queryKey: ['player-history'] }),
      ]);
    },
  });
}

export function useMarkProgressCommentsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (progressId: string) => (await api.post(`/players/me/progress/${progressId}/read-comments`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-history'] }),
  });
}

export function usePendingProgressReviews() {
  return useQuery({
    queryKey: ['progress-reviews'],
    queryFn: async () => (await api.get<PlayerProgress[]>('/players/progress/pending')).data,
  });
}

export function useApproveProgressReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; combatPower?: number; dimensionalLayer?: number; reviewNote?: string }) => {
      const { id, ...payload } = data;
      return (await api.post<PlayerProgress>(`/players/progress/${id}/approve`, payload)).data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['progress-reviews'] }),
        queryClient.invalidateQueries({ queryKey: ['players'] }),
      ]);
    },
  });
}

export function useRejectProgressReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; reviewNote?: string }) =>
      (await api.post<PlayerProgress>(`/players/progress/${data.id}/reject`, { reviewNote: data.reviewNote })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['progress-reviews'] }),
  });
}

export function useDeliveredDrops() {
  return useQuery({
    queryKey: ['drops'],
    queryFn: async () => (await api.get<DropHistory[]>('/drops', { params: { limit: 100 } })).data,
  });
}

export function useMyDrops() {
  return useQuery({
    queryKey: ['my-drops'],
    queryFn: async () => (await api.get<DropHistory[]>('/drops/me')).data,
  });
}

export function usePendingAuctionDeliveries() {
  return useQuery({
    queryKey: ['pending-auction-deliveries'],
    queryFn: async () => (await api.get<PendingAuctionDelivery[]>('/drops/pending-auction-deliveries', { params: { limit: 100 } })).data,
  });
}

export function useDeliverAuctionDrop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { auctionId: string; proofImageUrl?: string }) =>
      (await api.post<DropHistory>(`/drops/auction/${data.auctionId}/deliver`, { proofImageUrl: data.proofImageUrl })).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pending-auction-deliveries'] }),
        queryClient.invalidateQueries({ queryKey: ['drops'] }),
        queryClient.invalidateQueries({ queryKey: ['my-drops'] }),
      ]);
    },
  });
}

export function usePlayers() {
  return useQuery({
    queryKey: ['players'],
    queryFn: async () => (await api.get<StaffPlayer[]>('/players')).data,
  });
}

export function useAuditIdentities() {
  return useQuery({
    queryKey: ['audit-identities'],
    queryFn: async () => (await api.get<AuditIdentity[]>('/players/audit/identities')).data,
  });
}

export function useAuditTimeline(targetType: string, targetId: string) {
  return useQuery({
    queryKey: ['audit-timeline', targetType, targetId],
    queryFn: async () => (await api.get<AuditLog[]>(`/audit/${targetType}/${targetId}`, { params: { limit: 25 } })).data,
    enabled: Boolean(targetType && targetId),
  });
}

export function usePlayerHistory(playerId: string) {
  return useQuery({
    queryKey: ['player-history', playerId],
    queryFn: async () => (await api.get<PlayerHistory>(`/players/${playerId}/history`)).data,
    enabled: Boolean(playerId),
  });
}

export function useDiscordHistory(discordId: string) {
  return useQuery({
    queryKey: ['discord-history', discordId],
    queryFn: async () => (await api.get<PlayerHistory>(`/players/audit/discord/${discordId}/history`)).data,
    enabled: Boolean(discordId),
  });
}

export function useUploadImage() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return (await api.post<{ url: string; fileId?: string; mimetype: string; size: number }>('/uploads/image', formData)).data;
    },
  });
}

export function useAuction(id: string) {
  return useQuery({
    queryKey: ['auction', id],
    queryFn: async () => (await api.get<Auction & { bids?: AuctionBid[] }>(`/auctions/${id}`)).data,
    enabled: Boolean(id),
  });
}

export function useAuctionBids(id: string) {
  return useQuery({
    queryKey: ['auction-bids', id],
    queryFn: async () => (await api.get<AuctionBid[]>(`/auctions/${id}/bids`)).data,
    enabled: Boolean(id),
  });
}

export function useEligibility(playerId: string, auctionId: string) {
  return useQuery({
    queryKey: ['eligibility', playerId, auctionId],
    queryFn: async () => (await api.get<EligibilityResponse>(`/eligibility/player/${playerId}/auction/${auctionId}`)).data,
    enabled: Boolean(playerId && auctionId),
  });
}

export function useAuctionRanking(auctionId: string) {
  return useQuery({
    queryKey: ['auction-ranking', auctionId],
    queryFn: async () => (await api.get<EligibilityRow[]>(`/eligibility/auction/${auctionId}/ranking`)).data,
    enabled: Boolean(auctionId),
  });
}

export function usePlaceBid(auctionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { amount?: number }) => (await api.post(`/auctions/${auctionId}/bid`, data)).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['auction', auctionId] }),
        queryClient.invalidateQueries({ queryKey: ['auction-bids', auctionId] }),
        queryClient.invalidateQueries({ queryKey: ['auctions'] }),
        queryClient.invalidateQueries({ queryKey: ['dkp-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['dkp-leaderboard'] }),
      ]);
    },
  });
}

export function useFinalizeAuction(auctionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post(`/auctions/${auctionId}/finalize`)).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['auction', auctionId] }),
        queryClient.invalidateQueries({ queryKey: ['auction-bids', auctionId] }),
        queryClient.invalidateQueries({ queryKey: ['auction-ranking', auctionId] }),
        queryClient.invalidateQueries({ queryKey: ['auctions'] }),
        queryClient.invalidateQueries({ queryKey: ['staff-reviews'] }),
        queryClient.invalidateQueries({ queryKey: ['pending-auction-deliveries'] }),
        queryClient.invalidateQueries({ queryKey: ['dkp-leaderboard'] }),
      ]);
    },
  });
}

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: async () => (await api.get<EventRecord[]>('/events')).data,
  });
}

export function useAnnouncements() {
  return useQuery({
    queryKey: ['announcements'],
    queryFn: async () => (await api.get<Announcement[]>('/announcements')).data,
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      type: string;
      title: string;
      description?: string;
      eventTime: string;
      timezone?: string;
      channelId?: string;
      mentionRoleId?: string;
    }) => (await api.post<Announcement>('/announcements', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] }),
  });
}

export function useCancelAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (announcementId: string) => (await api.post<Announcement>(`/announcements/${announcementId}/cancel`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] }),
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; type: EventType; startsAt: string }) => (await api.post('/events', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });
}

export function useRegisterAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { eventId: string; playerId: string }) => (await api.post(`/events/${data.eventId}/attendance`, { playerId: data.playerId })).data,
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['events'] }),
        queryClient.invalidateQueries({ queryKey: ['event-attendance', variables.eventId] }),
      ]);
    },
  });
}

export function useRemoveAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { eventId: string; playerId: string }) => (await api.delete(`/events/${data.eventId}/attendance/${data.playerId}`)).data,
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['events'] }),
        queryClient.invalidateQueries({ queryKey: ['event-attendance', variables.eventId] }),
      ]);
    },
  });
}

export function useFinalizeEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => (await api.post(`/events/${eventId}/finalize`)).data,
    onSuccess: async (_data, eventId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['events'] }),
        queryClient.invalidateQueries({ queryKey: ['event-attendance', eventId] }),
      ]);
    },
  });
}

export function useCancelEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { eventId: string; reason?: string }) => (await api.post(`/events/${data.eventId}/cancel`, { reason: data.reason })).data,
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['events'] }),
        queryClient.invalidateQueries({ queryKey: ['event-attendance', variables.eventId] }),
        queryClient.invalidateQueries({ queryKey: ['dkp-leaderboard'] }),
      ]);
    },
  });
}

export function useEventAttendance(eventId: string) {
  return useQuery({
    queryKey: ['event-attendance', eventId],
    queryFn: async () => (await api.get<EventDetails>(`/events/${eventId}/attendance`)).data,
    enabled: Boolean(eventId),
  });
}

export function useAttendanceStats(playerId: string) {
  return useQuery({
    queryKey: ['attendance', playerId],
    queryFn: async () => (await api.get<AttendanceStats>(`/attendance/player/${playerId}`)).data,
    enabled: Boolean(playerId),
  });
}

export function usePlayerAttendanceHistory(playerId: string) {
  return useQuery({
    queryKey: ['attendance-history', playerId],
    queryFn: async () => (await api.get<PlayerAttendanceHistoryRow[]>(`/attendance/player/${playerId}/history`)).data,
    enabled: Boolean(playerId),
  });
}

export function usePendingReviews() {
  return useQuery({
    queryKey: ['staff-reviews'],
    queryFn: async () => (await api.get<Auction[]>('/staff/reviews')).data,
  });
}

export function useStaffReviewDetails(auctionId: string) {
  return useQuery({
    queryKey: ['staff-review', auctionId],
    queryFn: async () => (await api.get<{ ranking: EligibilityRow[] } & Auction>(`/staff/reviews/${auctionId}`)).data,
    enabled: Boolean(auctionId),
  });
}

export function useApproveWinner(auctionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (playerId: string) => (await api.post(`/staff/reviews/${auctionId}/approve`, { playerId })).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['staff-reviews'] }),
        queryClient.invalidateQueries({ queryKey: ['staff-review', auctionId] }),
        queryClient.invalidateQueries({ queryKey: ['auctions'] }),
        queryClient.invalidateQueries({ queryKey: ['auction', auctionId] }),
        queryClient.invalidateQueries({ queryKey: ['pending-auction-deliveries'] }),
        queryClient.invalidateQueries({ queryKey: ['dkp-leaderboard'] }),
      ]);
    },
  });
}

export function useRejectReview(auctionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reason: string) => (await api.post(`/staff/reviews/${auctionId}/reject`, { reason })).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['staff-reviews'] }),
        queryClient.invalidateQueries({ queryKey: ['staff-review', auctionId] }),
        queryClient.invalidateQueries({ queryKey: ['auctions'] }),
        queryClient.invalidateQueries({ queryKey: ['auction', auctionId] }),
        queryClient.invalidateQueries({ queryKey: ['pending-auction-deliveries'] }),
      ]);
    },
  });
}

export function useRemoveAuctionBid(auctionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { bidId: string; reason: string }) =>
      (await api.post(`/staff/reviews/${auctionId}/remove-bid`, data)).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['staff-reviews'] }),
        queryClient.invalidateQueries({ queryKey: ['staff-review', auctionId] }),
        queryClient.invalidateQueries({ queryKey: ['auction', auctionId] }),
        queryClient.invalidateQueries({ queryKey: ['auctions'] }),
        queryClient.invalidateQueries({ queryKey: ['dkp-leaderboard'] }),
      ]);
    },
  });
}
