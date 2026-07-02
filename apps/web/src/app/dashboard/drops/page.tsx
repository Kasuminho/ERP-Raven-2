'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useMyDrops } from '@/hooks/use-drops-api';
import { itemName } from '@/lib/game-labels';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';

export default function DropsPage() {
  const locale = useLocaleStore((state) => state.locale);
  const drops = useMyDrops();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">{t(locale, 'lootLedger')}</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'myDrops')}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t(locale, 'deliveryHistory')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(drops.data ?? []).map((drop) => (
            <div key={drop.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background/35 p-3">
              <div>
                <p className="font-semibold">{itemName(drop.itemCatalog, locale, drop.itemName || 'Item')}</p>
                <p className="text-sm text-muted-foreground">{drop.nicknameIngame || drop.discordId || t(locale, 'unidentifiedPlayer')}</p>
                {drop.proofImageUrl ? <a className="text-sm text-primary" href={drop.proofImageUrl} target="_blank" rel="noreferrer">{t(locale, 'openDeliveryProof')}</a> : null}
              </div>
              <div className="text-right">
                <Badge tone="green">{t(locale, 'delivered')}</Badge>
                <p className="mt-1 text-xs text-muted-foreground">
                  {drop.deliveredAt ? new Date(drop.deliveredAt).toLocaleString() : new Date(drop.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
          {!drops.isLoading && (drops.data ?? []).length === 0 && <EmptyState title={t(locale, 'noDropsDelivered')}>{t(locale, 'noDropsDeliveredHelp')}</EmptyState>}
        </CardContent>
      </Card>
    </div>
  );
}
