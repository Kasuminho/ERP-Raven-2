'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth-store';

export default function LoginCallbackPage() {
  const params = useSearchParams();
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);

  useEffect(() => {
    const token = params.get('token') ?? params.get('accessToken');
    const roles = params.get('roles')?.split(',').filter(Boolean) as Parameters<typeof setSession>[1];
    const userId = params.get('userId') ?? undefined;
    const playerId = params.get('playerId') ?? undefined;

    if (token) {
      setSession(token, roles?.length ? roles : ['MEMBER'], userId, playerId);
      router.replace('/dashboard');
    }
  }, [params, router, setSession]);

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <Card className="max-w-md">
        <CardContent className="p-6 text-center">
          <h1 className="font-[var(--font-cinzel)] text-2xl">Binding Discord session</h1>
          <p className="mt-2 text-sm text-muted-foreground">Finalizing your command access.</p>
        </CardContent>
      </Card>
    </main>
  );
}
