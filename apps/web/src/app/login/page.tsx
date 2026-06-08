'use client';

import { Disc3, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getPublicApiUrl } from '@/lib/public-api-url';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';

export default function LoginPage() {
  const apiUrl = getPublicApiUrl();
  const locale = useLocaleStore((state) => state.locale);

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <Card className="w-full max-w-md overflow-hidden">
        <div className="h-36 bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=900&q=80')] bg-cover bg-center" />
        <CardContent className="space-y-5 p-6">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm uppercase text-primary"><Shield className="h-4 w-4" /> {t(locale, 'loginEyebrow')}</p>
            <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'loginTitle')}</h1>
            <p className="mt-3 text-sm text-muted-foreground">{t(locale, 'loginHelp')}</p>
          </div>
          <Button className="w-full" onClick={() => { window.location.href = `${apiUrl}/auth/discord`; }}>
            <Disc3 className="h-4 w-4" /> {t(locale, 'continueWithDiscord')}
          </Button>
          <p className="text-xs text-muted-foreground">{t(locale, 'loginFootnote')}</p>
        </CardContent>
      </Card>
    </main>
  );
}
