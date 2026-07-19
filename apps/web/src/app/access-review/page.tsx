'use client';

import { Clock3, LogOut } from 'lucide-react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth-store';

export default function AccessReviewPage() {
  const router = useRouter();
  const initialize = useAuthStore((state) => state.initialize);
  const initialized = useAuthStore((state) => state.initialized);
  const authenticated = useAuthStore((state) => state.authenticated);
  const membershipStatus = useAuthStore((state) => state.membershipStatus);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    if (!initialized) void initialize();
    else if (!authenticated) router.replace('/login');
    else if (membershipStatus === 'ACTIVE') router.replace('/dashboard');
  }, [authenticated, initialize, initialized, membershipStatus, router]);

  useEffect(() => {
    if (!authenticated || membershipStatus === 'ACTIVE') return;
    const interval = window.setInterval(() => void initialize(true), 30_000);
    return () => window.clearInterval(interval);
  }, [authenticated, initialize, membershipStatus]);

  if (!initialized || !authenticated || membershipStatus === 'ACTIVE') return null;

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <Card className="w-full max-w-lg">
        <CardContent className="space-y-5 p-7 text-center">
          <Clock3 className="mx-auto h-10 w-10 text-primary" />
          <div>
            <h1 className="font-[var(--font-cinzel)] text-2xl font-bold">Retorno aguardando liberacao</h1>
            <p className="mt-3 text-sm text-muted-foreground">Seu acesso anterior foi desativado. A Staff ja recebeu o sinal de que voce conectou novamente e precisa liberar seu retorno.</p>
          </div>
          <div className="rounded-md border bg-background/35 p-4 text-left text-sm">
            <p className="font-semibold">Access awaiting approval</p>
            <p className="mt-1 text-muted-foreground">Your previous access was disabled. Staff can now see that you signed in again and must approve your return.</p>
          </div>
          <Button variant="secondary" onClick={() => void logout().then(() => router.replace('/login'))}>
            <LogOut className="h-4 w-4" /> Sair / Sign out
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
