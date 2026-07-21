import { useQuery } from '@tanstack/react-query'; import { api } from '@/lib/api'; import type { GuildHealthSignals } from '@/types/api';
export function useGuildHealthSignals(){return useQuery({queryKey:['guild-health','signals'],queryFn:async()=>(await api.get<GuildHealthSignals>('/guild-health/signals')).data});}
