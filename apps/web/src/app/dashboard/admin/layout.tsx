'use client';

import { AuthGuard } from '@/components/guards/auth-guard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard roles={['STAFF', 'ADMIN']}>{children}</AuthGuard>;
}
