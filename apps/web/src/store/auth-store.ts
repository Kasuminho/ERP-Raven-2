'use client';

import { create } from 'zustand';
import { api } from '@/lib/api';

export type UserRole = 'MEMBER' | 'STAFF' | 'ADMIN';

type AuthState = {
  authenticated: boolean;
  roles: UserRole[];
  userId?: string;
  playerId?: string;
  initialized: boolean;
  initialize: (force?: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  hasRole: (roles: UserRole[]) => boolean;
};

export const useAuthStore = create<AuthState>()((set, get) => ({
  authenticated: false,
  roles: ['MEMBER'],
  initialized: false,
  initialize: async (force = false) => {
    if (get().initialized && !force) return get().authenticated;

    try {
      const { data } = await api.get<{ userId: string; playerId?: string; roles?: UserRole[] }>('/auth/me', {
        headers: { 'X-Suppress-Session-Toast': 'true' },
      });
      set({
        authenticated: true,
        initialized: true,
        roles: data.roles?.length ? data.roles : ['MEMBER'],
        userId: data.userId,
        playerId: data.playerId,
      });
      return true;
    } catch {
      set({ authenticated: false, initialized: true, roles: ['MEMBER'], userId: undefined, playerId: undefined });
      return false;
    }
  },
  logout: async () => {
    try {
      await api.post('/auth/logout', undefined, { headers: { 'X-Suppress-Session-Toast': 'true' } });
    } finally {
      set({ authenticated: false, initialized: true, roles: ['MEMBER'], userId: undefined, playerId: undefined });
    }
  },
  hasRole: (roles) => get().roles.some((role) => roles.includes(role)),
}));
