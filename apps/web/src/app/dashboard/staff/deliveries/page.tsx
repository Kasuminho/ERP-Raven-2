'use client';

import { useMemo, useState } from 'react';
import { Filter } from 'lucide-react';
import { AuthGuard } from '@/components/guards/auth-guard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FileUploadButton } from '@/components/ui/file-upload-button';
import { notifyToast } from '@/components/ui/toaster';
import { useDeliverAuctionDrop, usePendingAuctionDeliveries, useUploadImage } from '@/hooks/use-guild-api';
import { itemName } from '@/lib/game-labels';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';
import type { PendingAuctionDelivery } from '@/types/api';

type DeliveryFilter = 'all' | 'overdue' | 'today' | 'missing-proof';

const urgencyTone: Record<NonNullable<PendingAuctionDelivery['urgency']>, 'gold' | 'red' | 'blue'> = {
  overdue: 'red',
  urgent: 'gold',
  today: 'blue',
};

const urgencyLabel: Record<NonNullable<PendingAuctionDelivery['urgency']>, string> = {
  overdue: 'Atrasada',
  urgent: 'Urgente hoje',
  today: 'Hoje',
};

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString('pt-BR') : '-';
}

export default function StaffDeliveriesPage() {
  const locale = useLocaleStore((state) => state.locale);
  const deliveries = usePendingAuctionDeliveries();
  const deliverDrop = useDeliverAuctionDrop();
  const uploadImage = useUploadImage();
  const [proofs, setProofs] = useState<Record<string, string>>({});
  const [deliveryToConfirm, setDeliveryToConfirm] = useState<string>();
  const [filter, setFilter] = useState<DeliveryFilter>('all');
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const deliveryRows = deliveries.data ?? [];
  const tierOptions = useMemo(() => [...new Set(deliveryRows.map((row) => row.auction.itemTier))].sort(), [deliveryRows]);
  const filteredDeliveries = deliveryRows.filter((row) => {
    const proof = proofs[row.auction.id] ?? '';
    const normalizedSearch = search.trim().toLowerCase();
    const matchesSearch = !normalizedSearch
      || row.player.nickname.toLowerCase().includes(normalizedSearch)
      || row.auction.itemName.toLowerCase().includes(normalizedSearch)
      || row.auction.itemCatalog?.namePt?.toLowerCase().includes(normalizedSearch)
      || row.auction.itemCatalog?.nameEn?.toLowerCase().includes(normalizedSearch);
    const matchesTier = tierFilter === 'all' || row.auction.itemTier === tierFilter;
    const matchesFilter = filter === 'overdue'
      ? row.urgency === 'overdue'
      : filter === 'today'
        ? row.urgency === 'today' || row.urgency === 'urgent'
        : filter === 'missing-proof'
          ? !proof
          : true;
    return matchesSearch && matchesTier && matchesFilter;
  });

  async function uploadProof(auctionId: string, file?: File) {
    if (!file) return;
    const uploaded = await uploadImage.mutateAsync(file);
    setProofs((current) => ({ ...current, [auctionId]: uploaded.url }));
  }

  return (
    <AuthGuard roles={['STAFF', 'ADMIN']}>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase text-primary">{t(locale, 'lootProtocol')}</p>
          <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'auctionDeliveries')}</h1>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-md border bg-card/70 p-3">
            <p className="text-xs uppercase text-muted-foreground">Pendentes</p>
            <p className="text-2xl font-bold">{deliveryRows.length}</p>
          </div>
          <div className="rounded-md border bg-card/70 p-3">
            <p className="text-xs uppercase text-muted-foreground">Atrasadas</p>
            <p className="text-2xl font-bold text-red-200">{deliveryRows.filter((row) => row.urgency === 'overdue').length}</p>
          </div>
          <div className="rounded-md border bg-card/70 p-3">
            <p className="text-xs uppercase text-muted-foreground">Urgentes hoje</p>
            <p className="text-2xl font-bold text-primary">{deliveryRows.filter((row) => row.urgency === 'urgent').length}</p>
          </div>
          <div className="rounded-md border bg-card/70 p-3">
            <p className="text-xs uppercase text-muted-foreground">Com prova anexada</p>
            <p className="text-2xl font-bold text-cyan-200">{Object.values(proofs).filter(Boolean).length}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {([
            ['all', 'Todos'],
            ['overdue', 'Atrasados'],
            ['today', 'Hoje'],
            ['missing-proof', 'Sem prova'],
          ] as Array<[DeliveryFilter, string]>).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              variant={filter === value ? 'primary' : 'secondary'}
              className="h-9 px-3"
              onClick={() => setFilter(value)}
            >
              <Filter className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <label className="space-y-1 text-sm">
            <span className="text-xs uppercase text-muted-foreground">Player ou item</span>
            <input
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por vencedor ou item"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs uppercase text-muted-foreground">Tier</span>
            <select
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              value={tierFilter}
              onChange={(event) => setTierFilter(event.target.value)}
            >
              <option value="all">Todos os tiers</option>
              {tierOptions.map((tier) => <option key={tier} value={tier}>{tier}</option>)}
            </select>
          </label>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {filteredDeliveries.map((row) => {
            const proof = proofs[row.auction.id] ?? '';
            const urgency = row.urgency ?? 'today';
            return (
              <Card key={row.auction.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{itemName(row.auction.itemCatalog, locale, row.auction.itemName)}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t(locale, 'winner')}: {row.player.nickname} - {Math.abs(row.transaction.amount)} DKP
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Badge tone={urgencyTone[urgency]}>{urgencyLabel[urgency]}</Badge>
                      <Badge tone="gold">{row.auction.itemTier}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2 rounded-md border bg-background/35 p-3 text-sm md:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Idade</p>
                      <p className="font-semibold">{row.ageHours ?? 0}h</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Prazo</p>
                      <p className="font-semibold">{formatDate(row.deliveryDueAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Prova</p>
                      <p className="font-semibold">{proof ? 'Anexada' : 'Pendente'}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{row.priorityReason ?? 'Anexe a prova e registre a entrega para fechar a pendencia.'}</p>
                  <FileUploadButton label={t(locale, 'attachImage')} onFileSelect={(files) => uploadProof(row.auction.id, files?.[0])} />
                  {proof ? <a className="block text-center text-sm text-primary" href={proof} target="_blank" rel="noreferrer">{t(locale, 'openDeliveryProof')}</a> : null}
                  <Button
                    disabled={!proof || deliverDrop.isPending || uploadImage.isPending}
                    onClick={() => setDeliveryToConfirm(row.auction.id)}
                  >
                    {t(locale, 'registerDelivery')}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {!deliveries.isLoading && deliveryRows.length === 0 && (
          <EmptyState title={t(locale, 'noPendingDeliveries')}>{t(locale, 'noPendingDeliveriesHelp')}</EmptyState>
        )}
        {!deliveries.isLoading && deliveryRows.length > 0 && filteredDeliveries.length === 0 && (
          <EmptyState title="Nenhuma entrega neste filtro">Troque o filtro para ver as demais pendencias.</EmptyState>
        )}
        <ConfirmationDialog
          open={Boolean(deliveryToConfirm)}
          title="Confirmar entrega do leilao?"
          description="A entrega vincula o comprovante ao vencedor e conclui esta pendencia. Confira player, item e imagem antes de continuar."
          confirmLabel={t(locale, 'registerDelivery')}
          pending={deliverDrop.isPending}
          tone="primary"
          onClose={() => setDeliveryToConfirm(undefined)}
          onConfirm={() => {
            if (!deliveryToConfirm || !proofs[deliveryToConfirm]) return;
            deliverDrop.mutate(
              { auctionId: deliveryToConfirm, proofImageUrl: proofs[deliveryToConfirm] },
              { onSuccess: () => {
                setProofs((current) => ({ ...current, [deliveryToConfirm]: '' }));
                setDeliveryToConfirm(undefined);
                notifyToast({ title: t(locale, 'delivered'), tone: 'success' });
              } },
            );
          }}
        />
      </div>
    </AuthGuard>
  );
}
