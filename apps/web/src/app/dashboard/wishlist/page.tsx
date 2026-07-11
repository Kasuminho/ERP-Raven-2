'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { notifyToast } from '@/components/ui/toaster';
import { useItems } from '@/hooks/use-items-api';
import { useCreateWishlistItem, useMyWishlist, useSetWishlistItemStatus } from '@/hooks/use-wishlist-api';
import type { WishlistPriority } from '@/types/api';

const priorities: WishlistPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function WishlistPage() {
  const wishlist = useMyWishlist();
  const items = useItems();
  const createWishlistItem = useCreateWishlistItem();
  const setStatus = useSetWishlistItemStatus();
  const [itemCatalogId, setItemCatalogId] = useState('');
  const [priority, setPriority] = useState<WishlistPriority>('MEDIUM');
  const [reason, setReason] = useState('');
  const [build, setBuild] = useState('');
  const [note, setNote] = useState('');
  const [proofImageUrl, setProofImageUrl] = useState('');
  const activeItems = useMemo(() => (items.data ?? []).filter((item) => item.isActive), [items.data]);

  function create() {
    if (!itemCatalogId || reason.trim().length < 3) return;

    createWishlistItem.mutate({
      itemCatalogId,
      priority,
      reason: reason.trim(),
      build: build.trim() || undefined,
      note: note.trim() || undefined,
      proofImageUrl: proofImageUrl.trim() || undefined,
    }, {
      onSuccess: () => {
        setReason('');
        setBuild('');
        setNote('');
        setProofImageUrl('');
        notifyToast({ title: 'Item adicionado a wishlist.', tone: 'success' });
      },
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">Loot</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">Wishlist</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Novo desejo</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_160px_1fr_1fr_auto]">
          <Select value={itemCatalogId} onChange={(event) => setItemCatalogId(event.target.value)}>
            <option value="">Item</option>
            {activeItems.map((item) => <option key={item.id} value={item.id}>{item.namePt} / {item.nameEn}</option>)}
          </Select>
          <Select value={priority} onChange={(event) => setPriority(event.target.value as WishlistPriority)}>
            {priorities.map((value) => <option key={value}>{value}</option>)}
          </Select>
          <Input placeholder="Motivo" value={reason} onChange={(event) => setReason(event.target.value)} />
          <Input placeholder="Build relacionada" value={build} onChange={(event) => setBuild(event.target.value)} />
          <Button onClick={create} disabled={!itemCatalogId || reason.trim().length < 3 || createWishlistItem.isPending}>Adicionar</Button>
          <Input className="xl:col-span-2" placeholder="Nota opcional" value={note} onChange={(event) => setNote(event.target.value)} />
          <Input className="xl:col-span-3" placeholder="Print opcional" value={proofImageUrl} onChange={(event) => setProofImageUrl(event.target.value)} />
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(wishlist.data ?? []).map((item) => (
          <Card key={item.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{item.itemCatalog?.namePt ?? item.itemCatalogId}</p>
                  <p className="text-xs text-muted-foreground">{item.itemCatalog?.itemTier ?? '-'} / {item.itemCatalog?.itemType ?? '-'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={item.priority === 'CRITICAL' ? 'red' : item.priority === 'HIGH' ? 'gold' : 'blue'}>{item.priority}</Badge>
                  <Badge tone={item.status === 'ACTIVE' ? 'green' : item.status === 'FULFILLED' ? 'blue' : 'muted'}>{item.status}</Badge>
                </div>
              </div>
              <p className="rounded-md border bg-background/35 p-3 text-sm text-muted-foreground">{item.reason}</p>
              {item.build ? <p className="text-xs text-muted-foreground">Build: {item.build}</p> : null}
              {item.status === 'ACTIVE' || item.status === 'PAUSED' ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ wishlistItemId: item.id, action: item.status === 'ACTIVE' ? 'pause' : 'resume' })}>
                    {item.status === 'ACTIVE' ? 'Pausar' : 'Retomar'}
                  </Button>
                  <Button variant="danger" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ wishlistItemId: item.id, action: 'remove' })}>
                    Remover
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
