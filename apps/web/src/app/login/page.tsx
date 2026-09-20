'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, Disc3, Shield } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getPublicApiUrl } from '@/lib/public-api-url';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';

function LoginForm() {
  const apiUrl = getPublicApiUrl();
  const locale = useLocaleStore((state) => state.locale);
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleLogin = () => {
    setIsRedirecting(true);
    window.location.href = `${apiUrl}/auth/discord`;
  };

  return (
    <CardContent className="space-y-5 p-6">
      <div>
        <p className="mb-2 flex items-center gap-2 text-sm uppercase text-primary">
          <Shield className="h-4 w-4" /> {t(locale, 'loginEyebrow')}
        </p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'loginTitle')}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t(locale, 'loginHelp')}</p>
      </div>

      {errorParam && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
          <div className="flex items-center gap-2 font-semibold text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Sessão expirada ou página recarregada</span>
          </div>
          <p className="mt-1 text-amber-300/90">
            A autorização do Discord é temporária e de uso único. Clique no botão abaixo para conectar novamente.
          </p>
        </div>
      )}

      <Button
        className="w-full"
        disabled={isRedirecting}
        onClick={handleLogin}
      >
        <Disc3 className={`h-4 w-4 ${isRedirecting ? 'animate-spin' : ''}`} />
        {isRedirecting ? 'Conectando ao Discord...' : t(locale, 'continueWithDiscord')}
      </Button>

      <p className="text-xs text-muted-foreground">{t(locale, 'loginFootnote')}</p>
      <p className="text-center text-xs text-muted-foreground">
        Ao continuar, você concorda com a{' '}
        <Link href="/privacy" className="font-semibold text-primary underline-offset-4 hover:underline">
          política de privacidade
        </Link>
        .
      </p>
    </CardContent>
  );
}

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <Card className="w-full max-w-md overflow-hidden">
        <div className="h-36 bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=900&q=80')] bg-cover bg-center" />
        <Suspense fallback={<div className="p-6 text-center text-xs text-muted-foreground">Carregando...</div>}>
          <LoginForm />
        </Suspense>
      </Card>
    </main>
  );
}
