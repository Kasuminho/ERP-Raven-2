'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { notifyToast } from '@/components/ui/toaster';
import { useGuildProgressReport } from '@/hooks/use-staff-operations-api';

export default function StaffGuildProgressPage() {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const report = useGuildProgressReport(period);

  async function copyMarkdown() {
    if (!report.data) return;
    await navigator.clipboard.writeText(report.data.markdown);
    notifyToast({ title: 'Relatorio copiado.', tone: 'success' });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm uppercase text-primary">Progresso</p>
          <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">Relatorio da guilda</h1>
        </div>
        <div className="flex gap-2">
          {(['week', 'month'] as const).map((value) => <Button key={value} variant={period === value ? 'primary' : 'secondary'} onClick={() => setPeriod(value)}>{value}</Button>)}
          <Button variant="secondary" disabled={!report.data} onClick={() => void copyMarkdown()}>Copiar</Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {report.data ? Object.entries(report.data.counts).map(([key, value]) => (
          <div key={key} className="rounded-md border bg-background/35 p-3">
            <p className="text-xs uppercase text-muted-foreground">{key}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        )) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardHeader><CardTitle>Classes</CardTitle></CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-2">
            {(report.data?.classDistribution ?? []).map((row) => (
              <div key={row.class} className="rounded-md border bg-background/35 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{row.class}</p>
                  <Badge tone="blue">{row.active}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">L4+: {row.layer4Plus} | baixa presenca: {row.lowAttendance}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Riscos e acoes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(report.data?.risks ?? []).map((risk) => (
              <Link key={risk.key} href={risk.href} className="block rounded-md border bg-background/35 p-3 text-sm hover:border-primary">
                <Badge tone={risk.severity === 'danger' ? 'red' : risk.severity === 'warning' ? 'gold' : 'blue'}>{risk.severity}</Badge>
                <p className="mt-2 font-semibold">{risk.label}</p>
                <p className="text-xs text-muted-foreground">{risk.detail}</p>
              </Link>
            ))}
            {(report.data?.nextActions ?? []).map((action) => (
              <Link key={action.href} href={action.href} className="block rounded-md border bg-background/35 p-3 text-sm hover:border-primary">
                <p className="font-semibold">{action.label}</p>
                <p className="text-xs text-muted-foreground">{action.reason}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
