'use client';

import { Coins, LockKeyhole, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';

export function DKPCard({ total = 0, locked = 0, available = 0 }: { total?: number; locked?: number; available?: number }) {
  const locale = useLocaleStore((state) => state.locale);
  const stats = [
    { label: t(locale, 'totalDkp'), value: total, icon: Coins },
    { label: t(locale, 'locked'), value: locked, icon: LockKeyhole },
    { label: t(locale, 'available'), value: available, icon: Sparkles },
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{t(locale, 'dkpLedger')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-md border border-white/10 bg-background/48 p-3 shadow-inner transition hover:border-primary/25">
            <div className="mb-3 grid h-9 w-9 place-items-center rounded-md border border-primary/20 bg-primary/10">
              <stat.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-bold leading-tight">{stat.value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
