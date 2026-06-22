'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { BidModal } from '@/components/dashboard/bid-modal';
import { CountdownTimer } from '@/components/dashboard/countdown-timer';
import { EligibilityBadge } from '@/components/dashboard/eligibility-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Input } from '@/components/ui/input';
import { notifyToast } from '@/components/ui/toaster';
import { useAuction, useAuctionBids, useAuctionRanking, useDkpSummary, useEligibility, useFinalizeAuction, useMyAuctionBid, useMyBidCancellation, usePlaceBid, usePlayerId, useRequestBidCancellation } from '@/hooks/use-guild-api';
import { displayImageUrl } from '@/lib/images';
import { t } from '@/lib/i18n';
import { useAuthStore } from '@/store/auth-store';
import { useLocaleStore } from '@/store/locale-store';

export default function AuctionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const playerId = usePlayerId();
  const canManageAuctions = useAuthStore((state) => state.hasRole(['STAFF', 'ADMIN']));
  const auction = useAuction(id);
  const bids = useAuctionBids(id, canManageAuctions);
  const myBid = useMyAuctionBid(id);
  const dkp = useDkpSummary(playerId);
  const eligibility = useEligibility(playerId, id);
  const ranking = useAuctionRanking(id, canManageAuctions);
  const placeBid = usePlaceBid(id);
  const requestBidCancellation = useRequestBidCancellation(id);
  const myBidCancellation = useMyBidCancellation(id);
  const finalizeAuction = useFinalizeAuction(id);
  const locale = useLocaleStore((state) => state.locale);
  const [confirmFinalize, setConfirmFinalize] = useState(false);
  const [confirmBidCancellation, setConfirmBidCancellation] = useState(false);
  const [bidCancellationReason, setBidCancellationReason] = useState('');

  if (!auction.data) return <EmptyState title={t(locale, 'loadingAuction')} />;

  const existingBid = myBid.data ?? undefined;
  const rankingByPlayerId = new Map((ranking.data ?? []).map((row) => [row.playerId, row]));

  function closeAuctionEarly() {
    finalizeAuction.mutate(undefined, {
      onSuccess: () => {
        setConfirmFinalize(false);
        notifyToast({ title: 'Leilao enviado para finalizacao.', tone: 'success' });
      },
    });
  }

  function requestCancellation() {
    if (!bidCancellationReason.trim()) return;
    requestBidCancellation.mutate(bidCancellationReason.trim(), {
      onSuccess: (response) => {
        setConfirmBidCancellation(false);
        setBidCancellationReason('');
        notifyToast({
          title: response.autoApproved ? t(locale, 'bidCancellationAutoApproved') : t(locale, 'bidCancellationRequested'),
          tone: 'success',
        });
      },
      onError: () => notifyToast({
        title: t(locale, 'bidCancellationFailed'),
        tone: 'error',
      }),
    });
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
                  <Button variant="secondary" onClick={() => setConfirmFinalize(true)} disabled={finalizeAuction.isPending}>
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
              <div className="space-y-3">
                <BidModal
                  auction={auction.data}
                  existingBidAmount={existingBid?.isValid ? existingBid.bidAmount : undefined}
                  playerId={playerId}
                  pending={placeBid.isPending}
                  onBid={(data) => placeBid.mutate(data, { onSuccess: () => notifyToast({ title: t(locale, existingBid ? 'increaseBid' : 'placeBid'), tone: 'success' }) })}
                />
                {myBidCancellation.data ? (
                  <div className="rounded-lg border border-primary/25 bg-primary/10 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">{t(locale, 'bidCancellationStatus')}</p>
                      <Badge tone={myBidCancellation.data.status === 'PENDING' ? 'gold' : myBidCancellation.data.status === 'APPROVED' ? 'green' : 'red'}>
                        {t(locale, `bidCancellation${myBidCancellation.data.status}`)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{myBidCancellation.data.reason}</p>
                  </div>
                ) : null}
                {existingBid?.isValid && auction.data.auctionMode === 'ALL_IN' && myBidCancellation.data?.status !== 'PENDING' ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                    <p className="text-sm text-muted-foreground">{t(locale, 'confirmBidCancellationRule')}</p>
                    <Button
                      type="button"
                      variant="secondary"
                      className="mt-3"
                      disabled={requestBidCancellation.isPending}
                      onClick={() => setConfirmBidCancellation(true)}
                    >
                      {t(locale, 'requestBidCancellation')}
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <aside className="space-y-6">
        <Card>
          <CardHeader><CardTitle>{t(locale, 'rankingPreview')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {canManageAuctions && (ranking.data ?? []).slice(0, 6).map((row, index) => (
              <div key={row.playerId} className="flex items-center justify-between rounded-md border bg-background/35 p-3 text-sm">
                <span>{index + 1}. {row.nickname}</span>
                <span className="text-primary">{Math.round(row.priorityScore)}</span>
              </div>
            ))}
            {canManageAuctions && !ranking.isLoading && !ranking.data?.length && <p className="text-sm text-muted-foreground">{t(locale, 'noCandidatesRanked')}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t(locale, 'bids')}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {canManageAuctions && (bids.data ?? []).map((bid) => (
              <div key={bid.id} className="flex justify-between text-sm">
                <span>{rankingByPlayerId.get(bid.playerId)?.nickname ?? bid.playerId}</span>
                <span>{bid.bidAmount} DKP</span>
              </div>
            ))}
            {canManageAuctions && !bids.isLoading && !bids.data?.length && <p className="text-sm text-muted-foreground">{t(locale, 'noCandidatesRanked')}</p>}
          </CardContent>
        </Card>
      </aside>
      <ConfirmationDialog
        open={confirmFinalize}
        title="Encerrar leilao agora?"
        description={t(locale, 'closeAuctionConfirm')}
        confirmLabel={t(locale, 'closeNow')}
        pending={finalizeAuction.isPending}
        onClose={() => setConfirmFinalize(false)}
        onConfirm={closeAuctionEarly}
      />
      <ConfirmationDialog
        open={confirmBidCancellation}
        title={t(locale, 'requestBidCancellation')}
        description={t(locale, 'confirmBidCancellationRule')}
        confirmLabel={t(locale, 'requestBidCancellation')}
        pending={requestBidCancellation.isPending}
        onClose={() => { setConfirmBidCancellation(false); setBidCancellationReason(''); }}
        onConfirm={requestCancellation}
      >
        <label className="space-y-1 text-sm">
          <span className="text-xs uppercase text-muted-foreground">{t(locale, 'reason')}</span>
          <Input value={bidCancellationReason} onChange={(event) => setBidCancellationReason(event.target.value)} placeholder={t(locale, 'bidCancellationReasonPrompt')} />
        </label>
      </ConfirmationDialog>
    </div>
  );
}
