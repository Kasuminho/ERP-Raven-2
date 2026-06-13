'use client';

import { useMemo, useState } from 'react';
import { UsersRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { usePlayerComparison, usePlayers } from '@/hooks/use-guild-api';

export default function StaffComparePage() {
  const players = usePlayers();
  const [selected, setSelected] = useState<string[]>([]);
  const comparison = usePlayerComparison(selected);
  const available = useMemo(() => players.data ?? [], [players.data]);

  function setSlot(index: number, value: string) {
    const next = [...selected];
    if (value) next[index] = value;
    else next.splice(index, 1);
    setSelected([...new Set(next.filter(Boolean))].slice(0, 4));
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">Decisao de Staff</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">Comparador de players</h1>
        <p className="mt-2 text-sm text-muted-foreground">Compare camada, presenca, DKP, drops e requests antes de votar.</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><UsersRound className="h-5 w-5 text-primary" /> Selecionar ate 4 players</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Select key={index} value={selected[index] ?? ''} onChange={(event) => setSlot(index, event.target.value)}>
              <option value="">Player {index + 1}</option>
              {available.map((player) => <option key={player.id} value={player.id}>{player.nickname}</option>)}
            </Select>
          ))}
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(comparison.data?.players ?? []).map((player) => (
          <Card key={player.playerId}>
            <CardHeader><CardTitle>{player.nickname}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><Badge tone="blue">{player.class}</Badge></p>
              <p>Camada: <strong>{player.dimensionalLayer}</strong></p>
              <p>CP: <strong>{player.combatPower}</strong></p>
              <p>Presenca: <strong>{Math.round(player.attendancePercentage)}%</strong></p>
              <p>DKP: <strong>{player.currentDkp}</strong></p>
              <p>Drops 30d: <strong>{player.drops30d}</strong></p>
              <p>Drops 90d: <strong>{player.drops90d}</strong></p>
              <p>Requests ativos: <strong>{player.activeRequests}</strong></p>
              <p className="text-muted-foreground">Ultimo drop: {player.lastDropAt ? new Date(player.lastDropAt).toLocaleDateString() : 'nunca'}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
