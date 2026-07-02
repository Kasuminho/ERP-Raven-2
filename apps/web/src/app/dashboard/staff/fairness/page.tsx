'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Scale } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useLootFairness } from '@/hooks/use-staff-operations-api';

export default function StaffFairnessPage() {
  const [days, setDays] = useState(30);
  const fairness = useLootFairness(days);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase text-primary">Governanca de loot</p>
          <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">Loot fairness</h1>
          <p className="mt-2 text-sm text-muted-foreground">Quem recebeu mais coisa recentemente, com DKP e presenca no mesmo quadro.</p>
        </div>
        <Input className="max-w-40" type="number" min="7" max="180" value={days} onChange={(event) => setDays(Number(event.target.value) || 30)} />
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Scale className="h-5 w-5 text-primary" /> Ultimos {fairness.data?.days ?? days} dias</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(fairness.data?.rows ?? []).map((row, index) => (
            <Link key={row.playerId} href={`/dashboard/staff/item-audit?playerId=${row.playerId}`} className="grid gap-2 rounded-md border bg-background/35 p-3 text-sm hover:border-primary md:grid-cols-[1.5fr_repeat(6,1fr)]">
              <strong><Badge tone="gold">#{index + 1}</Badge> {row.nickname}</strong>
              <span>Drops: {row.dropsCount}</span>
              <span>T4: {row.t4Drops}</span>
              <span>Leg: {row.legendaryDrops}</span>
              <span>Presenca: {Math.round(row.attendancePercentage)}%</span>
              <span>DKP: {row.currentDkp}</span>
              <span>{row.lastDropAt ? new Date(row.lastDropAt).toLocaleDateString() : 'Sem drop'}</span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
