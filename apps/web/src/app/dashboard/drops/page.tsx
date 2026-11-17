'use client';

import Link from 'next/link';
import { ExternalLink, Gavel } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useMyDrops, usePublishedAuctionResults } from '@/hooks/use-drops-api';
import { itemName } from '@/lib/game-labels';
import { displayImageUrl } from '@/lib/images';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';

export default function DropsPage() {
  const locale = useLocaleStore((state) => state.locale);
  const drops = useMyDrops();
  const results = usePublishedAuctionResults();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">{t(locale, 'lootLedger')}</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">Resultados e entregas</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Gavel className="h-5 w-5 text-primary" /> Resultados publicados dos leiloes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-background/35 p-3 text-sm text-muted-foreground">
            <p><strong className="text-foreground">PT-BR:</strong> O resultado aparece aqui somente depois que a Staff entrega o item e anexa a prova.</p>
            <p className="mt-2"><strong className="text-foreground">EN:</strong> Results appear here only after Staff delivers the item and attaches proof.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(results.data ?? []).map((result) => {
              const proofUrl = displayImageUrl(result.proofImageUrl);
              const imageUrl = displayImageUrl(result.itemImageUrl);
              return (
                <article key={result.id} className="overflow-hidden rounded-lg border bg-background/35">
                  {(proofUrl || imageUrl) && <img className="aspect-video w-full object-cover" src={proofUrl || imageUrl} alt={`Prova de entrega de ${result.itemNamePt}`} />}
                  <div className="space-y-3 p-4">
                    <div className="flex flex-wrap gap-2"><Badge tone="green">ENTREGUE</Badge>{result.itemTier && <Badge tone="gold">{result.itemTier}</Badge>}{result.auctionMode && <Badge tone="blue">{result.auctionMode}</Badge>}</div>
                    <div>
                      <p className="font-semibold">{result.itemNamePt}</p>
                      {result.itemNameEn !== result.itemNamePt && <p className="text-sm text-muted-foreground">{result.itemNameEn}</p>}
                    </div>
                    <div className="rounded-md border bg-card/50 p-3 text-sm">
                      <p><strong>PT-BR:</strong> Entregue para <span className="text-primary">{result.winner.nickname}</span>.</p>
                      <p className="mt-1"><strong>EN:</strong> Delivered to <span className="text-primary">{result.winner.nickname}</span>.</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(result.deliveredAt).toLocaleString()}</p>
                    <div className="flex flex-wrap gap-3 text-sm">
                      {proofUrl && <a className="inline-flex items-center gap-1 text-primary" href={proofUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /> Prova / Proof</a>}
                      <Link className="text-primary" href={`/dashboard/auctions/${result.auctionId}`}>Ver leilao / View auction</Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {!results.isLoading && (results.data ?? []).length === 0 && <EmptyState title="Nenhum resultado publicado / No published results">Os resultados aparecem depois da entrega com prova.</EmptyState>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t(locale, 'myDrops')} — {t(locale, 'deliveryHistory')}</CardTitle>
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
