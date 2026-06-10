'use client';

import { AuthGuard } from '@/components/guards/auth-guard';
import { StaffReviewCard } from '@/components/dashboard/staff-review-card';
import { EmptyState } from '@/components/ui/empty-state';
import { notifyToast } from '@/components/ui/toaster';
import { useApproveWinner, usePendingReviews, useRejectReview, useRemoveAuctionBid, useStaffReviewDetails } from '@/hooks/use-guild-api';
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

  return (
    <AuthGuard roles={['STAFF', 'ADMIN']}>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase text-primary">{t(locale, 'governance')}</p>
          <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'staffReview')}</h1>
        </div>
        {reviews.data?.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {reviews.data.map((auction) => <ReviewItem key={auction.id} auctionId={auction.id} />)}
          </div>
        ) : <EmptyState title={t(locale, 'noPendingReviews')}>{t(locale, 'noPendingReviewsHelp')}</EmptyState>}
      </div>
    </AuthGuard>
  );
}
