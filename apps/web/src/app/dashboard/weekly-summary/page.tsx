'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePlayerWeeklySafeSummary } from '@/hooks/use-staff-operations-api';
import { useLocaleStore } from '@/store/locale-store';

export default function WeeklySummaryPage() {
  const locale = useLocaleStore((state) => state.locale);
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const summary = usePlayerWeeklySafeSummary(period);
  const isEnglish = locale === 'en';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm uppercase text-primary">Guilda</p>
          <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{isEnglish ? summary.data?.titleEn ?? 'Safe weekly summary' : summary.data?.titlePt ?? 'Resumo seguro da semana'}</h1>
        </div>
        <div className="flex gap-2">
          {(['week', 'month'] as const).map((value) => <Button key={value} variant={period === value ? 'primary' : 'secondary'} onClick={() => setPeriod(value)}>{value}</Button>)}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>{period}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{isEnglish ? summary.data?.summaryEn : summary.data?.summaryPt}</p>
          <div className="grid gap-3 md:grid-cols-5">
            {summary.data ? Object.entries(summary.data.collective).map(([key, value]) => (
              <div key={key} className="rounded-md border bg-background/35 p-3">
                <p className="text-xs uppercase text-muted-foreground">{key}</p>
                <p className="text-2xl font-bold">{value}</p>
              </div>
            )) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {(summary.data?.actionLinks ?? []).map((link) => (
              <Link key={link.href} href={link.href} className="rounded-md border border-cyan-400/25 bg-secondary/80 px-3 py-2 text-sm font-semibold hover:border-cyan-300/45">
                {isEnglish ? link.labelEn : link.labelPt}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
