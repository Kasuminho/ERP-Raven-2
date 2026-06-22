'use client';

import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { useAuthStore, UserRole } from '@/store/auth-store';

export function AuthGuard({ children, roles }: { children: ReactNode; roles?: UserRole[] }) {
  const router = useRouter();
  const authenticated = useAuthStore((state) => state.authenticated);
  const initialized = useAuthStore((state) => state.initialized);
  const initialize = useAuthStore((state) => state.initialize);
  const hasRole = useAuthStore((state) => state.hasRole);

  useEffect(() => {
    if (!initialized) {
      void initialize();
      return;
    }
    if (!authenticated) router.replace('/login');
    if (authenticated && roles && !hasRole(roles)) router.replace('/dashboard');
  }, [authenticated, hasRole, initialize, initialized, roles, router]);

  if (!initialized || !authenticated) return null;
  if (roles && !hasRole(roles)) return null;

  return children;
}
