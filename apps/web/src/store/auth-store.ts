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
  membershipStatus: 'ACTIVE' | 'INACTIVE' | 'PENDING_REACTIVATION';
  initialize: (force?: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  hasRole: (roles: UserRole[]) => boolean;
};

export const useAuthStore = create<AuthState>()((set, get) => ({
  authenticated: false,
  roles: ['MEMBER'],
  initialized: false,
  membershipStatus: 'ACTIVE',
  initialize: async (force = false) => {
    if (get().initialized && !force) return get().authenticated;

    try {
      const { data } = await api.get<{
        userId: string;
        playerId?: string;
        roles?: UserRole[];
        membershipStatus?: AuthState['membershipStatus'];
        preferredLocale?: string;
      }>('/auth/me', {
        headers: { 'X-Suppress-Session-Toast': 'true' },
      });

      if (data.preferredLocale && (data.preferredLocale === 'pt' || data.preferredLocale === 'en' || data.preferredLocale === 'es')) {
        const { useLocaleStore } = await import('@/store/locale-store');
        useLocaleStore.getState().setLocale(data.preferredLocale);
      }

      set({
        authenticated: true,
        initialized: true,
        roles: data.roles?.length ? data.roles : ['MEMBER'],
        userId: data.userId,
        playerId: data.playerId,
        membershipStatus: data.membershipStatus ?? 'ACTIVE',
      });
      return true;
    } catch {
      set({ authenticated: false, initialized: true, roles: ['MEMBER'], userId: undefined, playerId: undefined, membershipStatus: 'ACTIVE' });
      return false;
    }
  },
  logout: async () => {
    try {
      await api.post('/auth/logout', undefined, { headers: { 'X-Suppress-Session-Toast': 'true' } });
    } finally {
      set({ authenticated: false, initialized: true, roles: ['MEMBER'], userId: undefined, playerId: undefined, membershipStatus: 'ACTIVE' });
    }
  },
  hasRole: (roles) => get().roles.some((role) => roles.includes(role)),
}));
