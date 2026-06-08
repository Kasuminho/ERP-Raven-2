'use client';

import { AuthGuard } from '@/components/guards/auth-guard';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard roles={['STAFF', 'ADMIN']}>{children}</AuthGuard>;
}
