'use client';

import { useState } from 'react';
import { AuthGuard } from '@/components/guards/auth-guard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FileUploadButton } from '@/components/ui/file-upload-button';
import { notifyToast } from '@/components/ui/toaster';
import { useDeliverAuctionDrop, usePendingAuctionDeliveries, useUploadImage } from '@/hooks/use-guild-api';
import { itemName } from '@/lib/game-labels';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';

export default function StaffDeliveriesPage() {
  const locale = useLocaleStore((state) => state.locale);
  const deliveries = usePendingAuctionDeliveries();
  const deliverDrop = useDeliverAuctionDrop();
  const uploadImage = useUploadImage();
  const [proofs, setProofs] = useState<Record<string, string>>({});

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

        <div className="grid gap-4 xl:grid-cols-2">
          {(deliveries.data ?? []).map((row) => {
            const proof = proofs[row.auction.id] ?? '';
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
                    <Badge tone="gold">{row.auction.itemTier}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <FileUploadButton label={t(locale, 'attachImage')} onFileSelect={(files) => uploadProof(row.auction.id, files?.[0])} />
                  {proof ? <a className="block text-center text-sm text-primary" href={proof} target="_blank" rel="noreferrer">{t(locale, 'openDeliveryProof')}</a> : null}
                  <Button
                    disabled={!proof || deliverDrop.isPending || uploadImage.isPending}
                    onClick={() => deliverDrop.mutate(
                      { auctionId: row.auction.id, proofImageUrl: proof },
                      {
                        onSuccess: () => {
                          setProofs((current) => ({ ...current, [row.auction.id]: '' }));
                          notifyToast({ title: t(locale, 'delivered'), tone: 'success' });
                        },
                      },
                    )}
                  >
                    {t(locale, 'registerDelivery')}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {!deliveries.isLoading && (deliveries.data ?? []).length === 0 && (
          <EmptyState title={t(locale, 'noPendingDeliveries')}>{t(locale, 'noPendingDeliveriesHelp')}</EmptyState>
        )}
      </div>
    </AuthGuard>
  );
}
