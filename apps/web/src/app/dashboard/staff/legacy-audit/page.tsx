'use client';

import { Database } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLegacyAudit } from '@/hooks/use-guild-api';

export default function StaffLegacyAuditPage() {
  const audit = useLegacyAudit();
  const data = audit.data;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">Migracao e legado</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">Auditoria legado</h1>
        <p className="mt-2 text-sm text-muted-foreground">Itens e logs importados que ainda precisam de vinculacao ou correcao.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        {[
          ['Drops sem player', data?.unlinkedDrops ?? 0],
          ['Requests sem player', data?.unlinkedRequests ?? 0],
          ['Itens sem tier', data?.itemsWithoutTier ?? 0],
          ['Itens sem tipo', data?.itemsWithoutType ?? 0],
          ['Itens inativos', data?.inactiveItems ?? 0],
        ].map(([label, value]) => (
          <Card key={label}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></CardContent></Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-primary" /> Drops sem cadastro</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(data?.recentUnlinkedDrops ?? []).map((row) => (
              <div key={row.id} className="rounded-md border bg-background/35 p-3 text-sm">
                <p className="font-semibold">{row.itemName ?? 'Item sem nome'}</p>
                <p className="text-muted-foreground">{row.nicknameIngame ?? 'Sem nick'} / {row.discordId ?? 'sem discord'}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Requests sem cadastro</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(data?.recentUnlinkedRequests ?? []).map((row) => (
              <div key={row.id} className="rounded-md border bg-background/35 p-3 text-sm">
                <p className="font-semibold">{row.itemName}</p>
                <p className="text-muted-foreground">{row.playerName} / {row.discordId}</p>
                <Badge tone="gold">{new Date(row.updatedAt).toLocaleDateString()}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
