import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { GlobalSearchResult } from '@/types/api';

export function useGlobalSearch(query: string, isStaff: boolean) {
  const normalized = query.trim();
  return useQuery({
    queryKey: ['global-search', isStaff ? 'staff' : 'player', normalized],
    queryFn: async () => (await api.get<GlobalSearchResult[]>(isStaff ? '/search/staff' : '/search', { params: { q: normalized } })).data,
    enabled: normalized.length >= 2,
    staleTime: 30_000,
  });
}
