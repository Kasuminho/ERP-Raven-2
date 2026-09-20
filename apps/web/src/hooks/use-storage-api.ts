import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  GuildStorageItem,
  ScannedStorageItemResult,
  ScanStorageOcrResponse,
  StorageListResponse,
} from '@/types/api';

export function useStorageItems(params?: { search?: string; category?: string; kind?: string }) {
  return useQuery({
    queryKey: ['guild-storage', params],
    queryFn: async () => {
      const response = await api.get<StorageListResponse>('/storage', { params });
      return response.data;
    },
  });
}

export function useScanStorageOcr() {
  return useMutation({
    mutationFn: async (data: {
      images: Array<{ data: string; mimeType?: string }>;
      apiKey?: string;
    }) => {
      const response = await api.post<ScanStorageOcrResponse>('/storage/scan-ocr', data);
      return response.data;
    },
  });
}

export function useImportStorageItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      items: Array<{
        itemName: string;
        quantity: number;
        category?: string;
        itemTier?: string | null;
        itemType?: string | null;
        kind?: string;
        source?: string;
      }>;
    }) => {
      const response = await api.post<{
        importedCount: number;
        createdCount: number;
        updatedCount: number;
      }>('/storage/import', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guild-storage'] });
    },
  });
}

export function useDispatchStorageItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      storageItemId: string;
      requestId: string;
      quantity: number;
      reason?: string;
      proofImageUrl?: string;
    }) => {
      const response = await api.post<{
        deliveredQuantity: number;
        remainingStock: number;
        requestCompleted: boolean;
      }>('/storage/dispatch', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guild-storage'] });
      queryClient.invalidateQueries({ queryKey: ['item-requests'] });
    },
  });
}

export function useUpdateStorageItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { quantity?: number; source?: string };
    }) => {
      const response = await api.patch<GuildStorageItem>(`/storage/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guild-storage'] });
    },
  });
}

export function useDeleteStorageItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<{ success: boolean }>(`/storage/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guild-storage'] });
    },
  });
}

export function useStorageConfig() {
  return useQuery({
    queryKey: ['guild-storage', 'config'],
    queryFn: async () => {
      const response = await api.get<{ hasConfiguredKey: boolean }>('/storage/config');
      return response.data;
    },
  });
}

export function useSetStorageConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { apiKey: string }) => {
      const response = await api.post<{ success: boolean }>('/storage/config', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guild-storage', 'config'] });
    },
  });
}
