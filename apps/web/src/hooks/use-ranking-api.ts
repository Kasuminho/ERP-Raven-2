import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import type { PlayerClass } from '@/types/api';

export interface GuildRankingMember {
  rank: number;
  id: string;
  nickname: string;
  class: PlayerClass;
  combatPower: number;
  guildName: string;
  dimensionalLayer?: number;
  isActive?: boolean;
  deactivationReason?: string;
  attack?: number;
  defense?: number;
  accuracy?: number;
  buffCount?: number;
  lastProofUrl?: string;
  lastVerifiedAt: string;
  discordUser?: string;
}

export function useGuildRanking(guild?: string, includeInactive = false) {
  return useQuery({
    queryKey: ['guild-ranking', guild, includeInactive],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (guild && guild !== 'ALL') params.set('guild', guild);
      if (includeInactive) params.set('includeInactive', 'true');
      const query = params.toString() ? `?${params.toString()}` : '';
      const { data } = await api.get<GuildRankingMember[]>(`/players/ranking${query}`);
      return data;
    },
    refetchInterval: 30000,
  });
}
