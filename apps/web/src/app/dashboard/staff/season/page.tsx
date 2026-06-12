'use client';

import { useState } from 'react';
import { CalendarDays, Coins, Gem, HandCoins, Trophy, UsersRound } from 'lucide-react';
import { AuthGuard } from '@/components/guards/auth-guard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useSeasonSummary } from '@/hooks/use-guild-api';

function brl(cents?: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((cents ?? 0) / 100);
}

function Metric({ title, value, icon: Icon }: { title: string; value: string; icon: typeof Coins }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <Icon className="h-6 w-6 text-primary" />
      </CardContent>
    </Card>
  );
}

export default function StaffSeasonPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const summary = useSeasonSummary(month);
  const data = summary.data;

  return (
    <AuthGuard roles={['STAFF', 'ADMIN']}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase text-primary">Fechamento mensal</p>
            <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">Resumo da temporada</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Um raio-x mensal da guild: DKP, presenca, drops, requests e Daoshi.
            </p>
          </div>
          <Input className="max-w-48" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Metric title="DKP ganho" value={`${data?.dkpEarned ?? 0}`} icon={Coins} />
          <Metric title="DKP gasto" value={`${data?.dkpSpent ?? 0}`} icon={Coins} />
          <Metric title="Eventos com presenca" value={`${data?.attendanceEvents ?? 0}`} icon={CalendarDays} />
          <Metric title="Drops entregues" value={`${data?.dropsDelivered ?? 0}`} icon={Gem} />
          <Metric title="Daoshi aprovado" value={brl(data?.daoshiApprovedCents)} icon={HandCoins} />
          <Metric title="Requests completos" value={`${data?.itemRequestsDelivered ?? 0}`} icon={UsersRound} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" /> Destaques do mes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.topPlayers ?? []).map((row, index) => (
              <div key={row.playerId} className="grid gap-2 rounded-md border bg-background/35 p-3 text-sm md:grid-cols-[1.5fr_repeat(4,1fr)]">
                <strong><Badge tone="gold">#{index + 1}</Badge> {row.nickname}</strong>
                <span>DKP: {row.dkpDelta}</span>
                <span>Presencas: {row.attendanceCount}</span>
                <span>Drops: {row.dropsCount}</span>
                <span>Daoshi: {brl(row.daoshiApprovedCents)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
