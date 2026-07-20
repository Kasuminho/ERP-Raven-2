import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DiamondSale, DiamondSaleSetup } from '@/types/api';

export type CreateDiamondSaleInput = {
  itemCatalogId: string;
  buyerType: 'GUILD_MEMBER' | 'EXTERNAL';
  buyerPlayerId?: string;
  buyerName?: string;
  diamondCustodian: string;
  diamondTotal: number;
  itemProofImageUrl: string;
  saleProofImageUrl: string;
  recipientMode: 'ALL_ACTIVE' | 'EXCLUDE_SELECTED';
  excludedPlayerIds?: string[];
};

export function useDiamondSaleSetup() {
  return useQuery({
    queryKey: ['diamond-sales', 'setup'],
    queryFn: async () => (await api.get<DiamondSaleSetup>('/diamond-sales/setup')).data,
  });
}

export function useDiamondSales() {
  return useQuery({
    queryKey: ['diamond-sales'],
    queryFn: async () => (await api.get<DiamondSale[]>('/diamond-sales')).data,
    refetchInterval: 30_000,
  });
}

export function useCreateDiamondSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateDiamondSaleInput) => (await api.post<DiamondSale>('/diamond-sales', input)).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['diamond-sales'] }),
        queryClient.invalidateQueries({ queryKey: ['diamond-sales', 'setup'] }),
      ]);
    },
  });
}

export function useDeliverDiamondShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { saleId: string; recipientId: string; proofImageUrl: string }) => (
      await api.post<DiamondSale>(`/diamond-sales/${input.saleId}/recipients/${input.recipientId}/deliver`, { proofImageUrl: input.proofImageUrl })
    ).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['diamond-sales'] }),
  });
}

export function usePublishDiamondSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (saleId: string) => (await api.post<DiamondSale>(`/diamond-sales/${saleId}/publish`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['diamond-sales'] }),
  });
}
