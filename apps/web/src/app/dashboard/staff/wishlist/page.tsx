'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Input } from '@/components/ui/input';
import { notifyToast } from '@/components/ui/toaster';
import { useFulfillWishlistItem, useStaffWishlistDemand } from '@/hooks/use-wishlist-api';
import type { StaffWishlistDemand } from '@/types/api';

export default function StaffWishlistPage() {
  const demand = useStaffWishlistDemand();
  const fulfill = useFulfillWishlistItem();
  const [selected, setSelected] = useState<StaffWishlistDemand | null>(null);
  const [fulfillTarget, setFulfillTarget] = useState<{ id: string; label: string }>();
  const [note, setNote] = useState('');

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">Loot</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">Demanda da wishlist</h1>
      </div>

      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader><CardTitle>Itens desejados</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(demand.data ?? []).map((row) => (
              <button
                key={row.itemCatalogId}
                className={`w-full rounded-md border p-3 text-left text-sm transition hover:border-primary ${selected?.itemCatalogId === row.itemCatalogId ? 'border-primary bg-primary/10' : 'bg-background/35'}`}
                onClick={() => setSelected(row)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{row.item.namePt}</p>
                    <p className="text-xs text-muted-foreground">{row.item.itemTier ?? '-'} / {row.item.itemType ?? '-'} / L{row.minLayer}-{row.maxLayer}</p>
                  </div>
                  <Badge tone={row.active > 0 ? 'green' : 'muted'}>{row.active}/{row.total}</Badge>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{selected?.item.namePt ?? 'Selecione um item'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selected ? (
              <>
                <div className="grid gap-2 md:grid-cols-4">
                  <div className="rounded-md border bg-background/35 p-3 text-sm"><p className="text-xs uppercase text-muted-foreground">Ativos</p><p className="text-xl font-bold">{selected.active}</p></div>
                  <div className="rounded-md border bg-background/35 p-3 text-sm"><p className="text-xs uppercase text-muted-foreground">Pausados</p><p className="text-xl font-bold">{selected.paused}</p></div>
                  <div className="rounded-md border bg-background/35 p-3 text-sm"><p className="text-xs uppercase text-muted-foreground">Prioridade</p><p className="text-xl font-bold">{selected.priorityCounts.CRITICAL ?? selected.priorityCounts.HIGH ?? 0}</p></div>
                  <div className="rounded-md border bg-background/35 p-3 text-sm"><p className="text-xs uppercase text-muted-foreground">Camadas</p><p className="text-xl font-bold">L{selected.minLayer}-{selected.maxLayer}</p></div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {selected.players.map((row) => (
                    <div key={row.id} className="rounded-md border bg-background/35 p-3 text-sm">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{row.player.nickname}</p>
                          <p className="text-xs text-muted-foreground">{row.player.class} - L{row.player.dimensionalLayer} - {row.player.attendancePercentage.toFixed(1)}%</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge tone={row.priority === 'CRITICAL' ? 'red' : row.priority === 'HIGH' ? 'gold' : 'blue'}>{row.priority}</Badge>
                          <Badge tone={row.status === 'ACTIVE' ? 'green' : 'muted'}>{row.status}</Badge>
                        </div>
                      </div>
                      <p className="mt-2 rounded-md border bg-background/45 p-2 text-xs text-muted-foreground">{row.reason}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {row.signals.lowAttendance ? <Badge tone="gold">baixa presenca</Badge> : null}
                        {row.signals.highLayer ? <Badge tone="blue">camada alta</Badge> : null}
                        {row.signals.hasBuild ? <Badge tone="green">build</Badge> : null}
                      </div>
                      {row.status === 'ACTIVE' ? (
                        <Button className="mt-3 h-8 px-3 text-xs" disabled={fulfill.isPending} onClick={() => { setNote(''); setFulfillTarget({ id: row.id, label: row.player.nickname }); }}>
                          Marcar atendido
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Abra um item para ver demanda por classe, camada, prioridade e sinais operacionais.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmationDialog
        open={Boolean(fulfillTarget)}
        title="Marcar wishlist como atendida?"
        description="Isso apenas atualiza a wishlist com auditoria. Nao cria bid, interesse nem entrega automaticamente."
        confirmLabel="Confirmar"
        pending={fulfill.isPending}
        onClose={() => setFulfillTarget(undefined)}
        onConfirm={() => {
          if (!fulfillTarget) return;
          fulfill.mutate({ wishlistItemId: fulfillTarget.id, note: note.trim() || undefined }, {
            onSuccess: () => {
              setFulfillTarget(undefined);
              notifyToast({ title: 'Wishlist marcada como atendida.', tone: 'success' });
            },
          });
        }}
      >
        <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder={`Nota opcional para ${fulfillTarget?.label ?? ''}`} />
      </ConfirmationDialog>
    </div>
  );
}
