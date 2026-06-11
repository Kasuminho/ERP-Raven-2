'use client';

import { BarChart3, Coins, Lock, TrendingDown, TrendingUp, UsersRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDkpEconomy } from '@/hooks/use-guild-api';

function number(value?: number) {
  return new Intl.NumberFormat('pt-BR').format(value ?? 0);
}

function MetricCard({ title, value, icon: Icon, tone }: { title: string; value: string; icon: typeof Coins; tone?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <Icon className={`h-6 w-6 ${tone ?? 'text-primary'}`} />
      </CardContent>
    </Card>
  );
}

export default function StaffEconomyPage() {
  const economy = useDkpEconomy();
  const data = economy.data;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">Guild Treasury</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">Economia DKP</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Visao de saude da moeda da guild: emissao, consumo, locks e distribuicao entre players.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Players ativos" value={number(data?.activePlayers)} icon={UsersRound} />
        <MetricCard title="DKP liquido em circulacao" value={number(data?.netDkp)} icon={Coins} />
        <MetricCard title="DKP travado" value={number(data?.totalLockedDkp)} icon={Lock} tone="text-cyan-200" />
        <MetricCard title="Gasto em leiloes" value={number(data?.auctionSpentDkp)} icon={TrendingDown} tone="text-red-200" />
        <MetricCard title="Emitido positivo" value={number(data?.totalPositiveDkp)} icon={TrendingUp} tone="text-emerald-200" />
        <MetricCard title="Consumido negativo" value={number(data?.totalNegativeDkp)} icon={TrendingDown} tone="text-red-200" />
        <MetricCard title="DKP por eventos" value={number(data?.eventRewardDkp)} icon={BarChart3} />
        <MetricCard title="Ajustes manuais" value={number(data?.adminAdjustmentDkp)} icon={Coins} tone="text-yellow-200" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Maiores saldos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.topBalances ?? []).map((row, index) => (
              <div key={row.playerId} className="flex items-center justify-between rounded-md border bg-background/35 p-3 text-sm">
                <span><Badge tone="gold">#{index + 1}</Badge> {row.nickname}</span>
                <strong>{number(row.total)} DKP</strong>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quem mais ganhou DKP</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.topEarners ?? []).map((row, index) => (
              <div key={row.playerId} className="flex items-center justify-between rounded-md border bg-background/35 p-3 text-sm">
                <span><Badge tone="green">#{index + 1}</Badge> {row.nickname}</span>
                <strong>+{number(row.amount)}</strong>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quem mais gastou DKP</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.topSpenders ?? []).map((row, index) => (
              <div key={row.playerId} className="flex items-center justify-between rounded-md border bg-background/35 p-3 text-sm">
                <span><Badge tone="red">#{index + 1}</Badge> {row.nickname}</span>
                <strong>-{number(row.amount)}</strong>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
