import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { StaffWishlistDemand, WishlistItem, WishlistPriority } from '@/types/api';

export function useMyWishlist() {
  return useQuery({
    queryKey: ['wishlist', 'me'],
    queryFn: async () => (await api.get<WishlistItem[]>('/wishlist/me')).data,
  });
}

export function useCreateWishlistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { itemCatalogId: string; priority: WishlistPriority; reason: string; build?: string; note?: string; proofImageUrl?: string }) =>
      (await api.post<WishlistItem>('/wishlist/me', data)).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
        queryClient.invalidateQueries({ queryKey: ['staff-wishlist'] }),
      ]);
    },
  });
}

export function useSetWishlistItemStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { wishlistItemId: string; action: 'pause' | 'resume' | 'remove' }) =>
      (await api.patch<WishlistItem>(`/wishlist/me/${data.wishlistItemId}/${data.action}`)).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
        queryClient.invalidateQueries({ queryKey: ['staff-wishlist'] }),
      ]);
    },
  });
}

export function useStaffWishlistDemand() {
  return useQuery({
    queryKey: ['staff-wishlist', 'items'],
    queryFn: async () => (await api.get<StaffWishlistDemand[]>('/wishlist/staff/items')).data,
    refetchInterval: 60_000,
  });
}

export function useFulfillWishlistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { wishlistItemId: string; note?: string }) =>
      (await api.post<WishlistItem>(`/wishlist/staff/${data.wishlistItemId}/fulfill`, { note: data.note })).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
        queryClient.invalidateQueries({ queryKey: ['staff-wishlist'] }),
      ]);
    },
  });
}
