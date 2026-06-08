'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'MEMBER' | 'STAFF' | 'ADMIN';

type AuthState = {
  token?: string;
  roles: UserRole[];
  userId?: string;
  playerId?: string;
  hasHydrated: boolean;
  setSession: (token: string, roles?: UserRole[], userId?: string, playerId?: string) => void;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
  restoreCookie: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
};

const sessionMaxAgeSeconds = 12 * 60 * 60;

function writeSessionCookie(token: string) {
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `guild_token=${token}; path=/; max-age=${sessionMaxAgeSeconds}; SameSite=Lax${secure}`;
}

function clearSessionCookie() {
  document.cookie = 'guild_token=; path=/; max-age=0; SameSite=Lax';
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      roles: ['MEMBER'],
      hasHydrated: false,
      setSession: (token, roles = ['MEMBER'], userId, playerId) => {
        writeSessionCookie(token);
        set({ token, roles, userId, playerId });
      },
      logout: () => {
        clearSessionCookie();
        set({ token: undefined, roles: ['MEMBER'], userId: undefined, playerId: undefined });
      },
      hasRole: (roles) => get().roles.some((role) => roles.includes(role)),
      restoreCookie: () => {
        const token = get().token;
        if (token) {
          writeSessionCookie(token);
        }
      },
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'guild-auth',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        state?.restoreCookie();
      },
    },
  ),
);
