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
    <Card>
      <CardHeader>
        <CardTitle>{t(locale, 'dkpLedger')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-md border bg-background/45 p-3">
            <stat.icon className="mb-2 h-5 w-5 text-primary" />
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="text-xl font-bold">{stat.value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
