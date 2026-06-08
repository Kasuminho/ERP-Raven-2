'use client';

import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { useAuthStore, UserRole } from '@/store/auth-store';

export function AuthGuard({ children, roles }: { children: ReactNode; roles?: UserRole[] }) {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const hasRole = useAuthStore((state) => state.hasRole);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token) router.replace('/login');
    if (token && roles && !hasRole(roles)) router.replace('/dashboard');
  }, [hasHydrated, hasRole, roles, router, token]);

  if (!hasHydrated) return null;
  if (!token) return null;
  if (roles && !hasRole(roles)) return null;

  return children;
}
