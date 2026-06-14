'use client';

import { AuthGuard } from '@/components/guards/auth-guard';
import { StaffReviewCard } from '@/components/dashboard/staff-review-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { notifyToast } from '@/components/ui/toaster';
import { useApproveBidCancellation, useApproveWinner, usePendingBidCancellations, usePendingReviews, useRejectBidCancellation, useRejectReview, useRemoveAuctionBid, useStaffReviewDetails } from '@/hooks/use-guild-api';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';

function ReviewItem({ auctionId }: { auctionId: string }) {
  const locale = useLocaleStore((state) => state.locale);
  const details = useStaffReviewDetails(auctionId);
  const approveWinner = useApproveWinner(auctionId);
  const rejectReview = useRejectReview(auctionId);
  const removeBid = useRemoveAuctionBid(auctionId);

  if (!details.data) return null;

  function reject() {
    const reason = window.prompt(t(locale, 'rejectionReasonPrompt'));

    if (!reason?.trim()) {
      return;
    }

    rejectReview.mutate(reason, { onSuccess: () => notifyToast({ title: 'Voto de rejeicao registrado.', tone: 'success' }) });
  }

  function invalidateBid(bidId: string) {
    const reason = window.prompt('Motivo para invalidar este bid e liberar o DKP do player:');

    if (!reason?.trim()) {
      return;
    }

    removeBid.mutate({ bidId, reason }, { onSuccess: () => notifyToast({ title: 'Bid invalidado e DKP liberado.', tone: 'success' }) });
  }

  return (
    <StaffReviewCard
      auction={details.data}
      ranking={details.data.ranking}
      pending={approveWinner.isPending || rejectReview.isPending || removeBid.isPending}
      onApprove={(playerId) => approveWinner.mutate(playerId, { onSuccess: () => notifyToast({ title: 'Voto de aprovacao registrado.', tone: 'success' }) })}
      onInvalidateBid={invalidateBid}
      onReject={reject}
    />
  );
}

export default function StaffReviewsPage() {
  const locale = useLocaleStore((state) => state.locale);
  const reviews = usePendingReviews();
  const bidCancellations = usePendingBidCancellations();
  const approveBidCancellation = useApproveBidCancellation();
  const rejectBidCancellation = useRejectBidCancellation();

  function approveCancellation(requestId: string) {
    const note = window.prompt('Observacao opcional da aprovacao:') ?? undefined;

    approveBidCancellation.mutate(
      { requestId, note },
      { onSuccess: () => notifyToast({ title: t(locale, 'cancellationReviewed'), tone: 'success' }) },
    );
  }

  function rejectCancellation(requestId: string) {
    const note = window.prompt('Motivo/observacao da rejeicao:') ?? undefined;

    rejectBidCancellation.mutate(
      { requestId, note },
      { onSuccess: () => notifyToast({ title: t(locale, 'cancellationReviewed'), tone: 'success' }) },
    );
  }

  return (
    <AuthGuard roles={['STAFF', 'ADMIN']}>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase text-primary">{t(locale, 'governance')}</p>
          <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'staffReview')}</h1>
        </div>
        {bidCancellations.isError ? (
          <Card className="border-destructive/40 bg-destructive/10">
            <CardContent className="pt-6">
              <p className="font-semibold">{t(locale, 'bidCancellationLoadFailed')}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t(locale, 'bidCancellationLoadFailedHelp')}</p>
            </CardContent>
          </Card>
        ) : null}
        {bidCancellations.data?.length ? (
          <Card>
            <CardHeader>
              <CardTitle>{t(locale, 'pendingBidCancellations')}</CardTitle>
              <p className="text-sm text-muted-foreground">{t(locale, 'pendingBidCancellationsHelp')}</p>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {bidCancellations.data.map((request) => (
                <div key={request.id} className="rounded-lg border bg-background/45 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{request.auction?.itemName ?? request.auctionId}</p>
                      <p className="text-sm text-muted-foreground">
                        {request.player?.nickname ?? request.playerId} - {request.bid?.bidAmount ?? 0} DKP
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(request.createdAt).toLocaleString()}</p>
                  </div>
                  <p className="mt-3 rounded-md border bg-background/50 p-3 text-sm text-muted-foreground">{request.reason}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      disabled={approveBidCancellation.isPending || rejectBidCancellation.isPending}
                      onClick={() => approveCancellation(request.id)}
                    >
                      {t(locale, 'approveCancellation')}
                    </Button>
                    <Button
                      variant="danger"
                      disabled={approveBidCancellation.isPending || rejectBidCancellation.isPending}
                      onClick={() => rejectCancellation(request.id)}
                    >
                      {t(locale, 'rejectCancellation')}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
        {reviews.data?.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {reviews.data.map((auction) => <ReviewItem key={auction.id} auctionId={auction.id} />)}
          </div>
        ) : <EmptyState title={t(locale, 'noPendingReviews')}>{t(locale, 'noPendingReviewsHelp')}</EmptyState>}
      </div>
    </AuthGuard>
  );
}
