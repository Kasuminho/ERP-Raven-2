'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth-store';

export default function LoginCallbackPage() {
  const router = useRouter();
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    void initialize(true).then((authenticated) => {
      router.replace(authenticated ? '/dashboard' : '/login');
    });
  }, [initialize, router]);

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
