'use client';

import { useParams } from 'next/navigation';
import { BidModal } from '@/components/dashboard/bid-modal';
import { CountdownTimer } from '@/components/dashboard/countdown-timer';
import { EligibilityBadge } from '@/components/dashboard/eligibility-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { notifyToast } from '@/components/ui/toaster';
import { useAuction, useAuctionBids, useAuctionRanking, useDkpSummary, useEligibility, useFinalizeAuction, usePlaceBid, usePlayerId } from '@/hooks/use-guild-api';
import { displayImageUrl } from '@/lib/images';
import { t } from '@/lib/i18n';
import { useAuthStore } from '@/store/auth-store';
import { useLocaleStore } from '@/store/locale-store';

export default function AuctionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const playerId = usePlayerId();
  const auction = useAuction(id);
  const bids = useAuctionBids(id);
  const dkp = useDkpSummary(playerId);
  const eligibility = useEligibility(playerId, id);
  const ranking = useAuctionRanking(id);
  const placeBid = usePlaceBid(id);
  const finalizeAuction = useFinalizeAuction(id);
  const canManageAuctions = useAuthStore((state) => state.hasRole(['STAFF', 'ADMIN']));
  const locale = useLocaleStore((state) => state.locale);

  if (!auction.data) return <EmptyState title={t(locale, 'loadingAuction')} />;

  const existingBid = (bids.data ?? []).find((bid) => bid.playerId === playerId);

  function closeAuctionEarly() {
    if (!window.confirm(t(locale, 'closeAuctionConfirm'))) return;
    finalizeAuction.mutate(undefined, { onSuccess: () => notifyToast({ title: 'Leilao enviado para finalizacao.', tone: 'success' }) });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
      <section className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-3xl">{auction.data.itemName}</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t(locale, 'minimum')} {auction.data.minimumBid} DKP - {auction.data.auctionMode}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {canManageAuctions && auction.data.status === 'OPEN' ? (
                  <Button variant="secondary" onClick={closeAuctionEarly} disabled={finalizeAuction.isPending}>
                    {t(locale, 'closeNow')}
                  </Button>
                ) : null}
                <CountdownTimer endsAt={auction.data.endsAt} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {(auction.data.itemCatalog?.image1Url || auction.data.itemCatalog?.image2Url) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {auction.data.itemCatalog?.image1Url && (
                  <img src={displayImageUrl(auction.data.itemCatalog.image1Url)} alt={auction.data.itemName} className="aspect-video rounded-md border object-cover" />
                )}
                {auction.data.itemCatalog?.image2Url && (
                  <img src={displayImageUrl(auction.data.itemCatalog.image2Url)} alt={auction.data.itemName} className="aspect-video rounded-md border object-cover" />
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Badge tone="gold">{auction.data.itemTier}</Badge>
              <Badge tone="blue">{auction.data.itemType}</Badge>
              <Badge tone="green">{auction.data.status}</Badge>
            </div>
            <div className="rounded-md border bg-background/40 p-4 text-sm text-muted-foreground">
              {t(locale, 'auctionRulesSummary')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t(locale, 'participation')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border bg-background/40 p-3"><p className="text-muted-foreground">{t(locale, 'available')}</p><p className="text-xl font-bold">{dkp.data?.available ?? 0}</p></div>
              <div className="rounded-md border bg-background/40 p-3"><p className="text-muted-foreground">{t(locale, 'locked')}</p><p className="text-xl font-bold">{dkp.data?.locked ?? 0}</p></div>
              <div className="rounded-md border bg-background/40 p-3"><p className="text-muted-foreground">{t(locale, 'eligibility')}</p><EligibilityBadge status={eligibility.data?.eligibilityStatus} /></div>
            </div>
            <p className="text-sm text-muted-foreground">{eligibility.data?.eligibilityReason}</p>
            {auction.data.status === 'OPEN' && (
              <BidModal
                auction={auction.data}
                existingBidAmount={existingBid?.bidAmount}
                playerId={playerId}
                pending={placeBid.isPending}
                onBid={(data) => placeBid.mutate(data, { onSuccess: () => notifyToast({ title: t(locale, existingBid ? 'increaseBid' : 'placeBid'), tone: 'success' }) })}
              />
            )}
          </CardContent>
        </Card>
      </section>

      <aside className="space-y-6">
        <Card>
          <CardHeader><CardTitle>{t(locale, 'rankingPreview')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(ranking.data ?? []).slice(0, 6).map((row, index) => (
              <div key={row.playerId} className="flex items-center justify-between rounded-md border bg-background/35 p-3 text-sm">
                <span>{index + 1}. {row.nickname}</span>
                <span className="text-primary">{Math.round(row.priorityScore)}</span>
              </div>
            ))}
            {!ranking.data?.length && <p className="text-sm text-muted-foreground">{t(locale, 'noCandidatesRanked')}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t(locale, 'bids')}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(bids.data ?? []).map((bid) => <div key={bid.id} className="flex justify-between text-sm"><span>{bid.playerId}</span><span>{bid.bidAmount} DKP</span></div>)}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
