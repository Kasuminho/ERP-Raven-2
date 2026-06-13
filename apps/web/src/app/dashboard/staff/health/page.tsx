'use client';

import { Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOperationalHealth } from '@/hooks/use-guild-api';

export default function StaffHealthPage() {
  const health = useOperationalHealth();
  const data = health.data;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">Observabilidade</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">Saude operacional</h1>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Falhas 24h</p><p className="text-2xl font-bold">{data?.discordFailures24h ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Anuncios ativos</p><p className="text-2xl font-bold">{data?.activeAnnouncements ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pendencias estimadas</p><p className="text-2xl font-bold">{data?.pendingQueueApproximation ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Ultima falha</p><p className="text-sm font-semibold">{data?.latestDiscordFailure ? new Date(data.latestDiscordFailure).toLocaleString() : 'Nenhuma'}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Checks</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(data?.checks ?? []).map((check) => (
            <div key={check.key} className="flex flex-col gap-2 rounded-md border bg-background/35 p-3 text-sm md:flex-row md:items-center md:justify-between">
              <div><strong>{check.label}</strong><p className="text-muted-foreground">{check.detail}</p></div>
              <Badge tone={check.ready ? 'green' : 'red'}>{check.ready ? 'OK' : 'Falha'}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
