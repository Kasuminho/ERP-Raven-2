import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import type { PlayerClass } from '@/types/api';

export interface GuildRankingMember {
  rank: number;
  id: string;
  nickname: string;
  class: PlayerClass;
  combatPower: number;
  dimensionalLayer?: number;
  attack?: number;
  defense?: number;
  accuracy?: number;
  buffCount?: number;
  lastProofUrl?: string;
  lastVerifiedAt: string;
  discordUser?: string;
}

export function useGuildRanking() {
  return useQuery({
    queryKey: ['guild-ranking'],
    queryFn: async () => {
      const { data } = await api.get<GuildRankingMember[]>('/players/ranking');
      return data;
    },
    refetchInterval: 30000,
  });
}
