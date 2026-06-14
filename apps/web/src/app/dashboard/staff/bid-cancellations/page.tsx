'use client';

import Link from 'next/link';
import { AuthGuard } from '@/components/guards/auth-guard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { notifyToast } from '@/components/ui/toaster';
import { useApproveBidCancellation, useBidCancellationHistory, usePendingBidCancellations, useRejectBidCancellation } from '@/hooks/use-guild-api';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';
import type { AuctionBidCancellationRequest } from '@/types/api';

function statusTone(status: AuctionBidCancellationRequest['status']) {
  if (status === 'APPROVED') return 'green';
  if (status === 'REJECTED') return 'red';
  return 'gold';
}

function CancellationCard({
  request,
  showActions,
  onApprove,
  onReject,
  pending,
}: {
  request: AuctionBidCancellationRequest;
  showActions?: boolean;
  onApprove?: (requestId: string) => void;
  onReject?: (requestId: string) => void;
  pending?: boolean;
}) {
  const locale = useLocaleStore((state) => state.locale);
  const playerName = request.player?.nickname ?? request.player?.user?.discordNickname ?? request.player?.user?.discordUsername ?? request.playerId;
  const auctionName = request.auction?.itemName ?? request.auctionId;

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link href={`/dashboard/staff/item-audit?player=${request.playerId}`} className="font-semibold text-primary hover:underline">
              {playerName}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">{auctionName}</p>
          </div>
          <Badge tone={statusTone(request.status)}>{t(locale, `bidCancellation${request.status}`)}</Badge>
        </div>
        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
          <span>{request.bid?.bidAmount ?? 0} DKP</span>
          <span>{request.auction?.auctionMode ?? 'ALL_IN'}</span>
          <span>{new Date(request.createdAt).toLocaleString()}</span>
        </div>
        <div className="rounded-md border bg-background/45 p-3 text-sm">
          <p className="text-muted-foreground">{t(locale, 'reason')}</p>
          <p className="mt-1">{request.reason}</p>
        </div>
        {request.reviewNote ? (
          <div className="rounded-md border bg-background/45 p-3 text-sm">
            <p className="text-muted-foreground">{t(locale, 'reviewNote')}</p>
            <p className="mt-1">{request.reviewNote}</p>
          </div>
        ) : null}
        {showActions ? (
          <div className="flex flex-wrap gap-2">
            <Button disabled={pending} onClick={() => onApprove?.(request.id)}>
              {t(locale, 'approveCancellation')}
            </Button>
            <Button variant="danger" disabled={pending} onClick={() => onReject?.(request.id)}>
              {t(locale, 'rejectCancellation')}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function BidCancellationsPage() {
  const locale = useLocaleStore((state) => state.locale);
  const pendingRequests = usePendingBidCancellations();
  const history = useBidCancellationHistory();
  const approve = useApproveBidCancellation();
  const reject = useRejectBidCancellation();

  function approveCancellation(requestId: string) {
    const note = window.prompt(t(locale, 'optionalApprovalNote')) ?? undefined;
    approve.mutate({ requestId, note }, { onSuccess: () => notifyToast({ title: t(locale, 'cancellationReviewed'), tone: 'success' }) });
  }

  function rejectCancellation(requestId: string) {
    const note = window.prompt(t(locale, 'optionalRejectionNote')) ?? undefined;
    reject.mutate({ requestId, note }, { onSuccess: () => notifyToast({ title: t(locale, 'cancellationReviewed'), tone: 'success' }) });
  }

  return (
    <AuthGuard roles={['STAFF', 'ADMIN']}>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase text-primary">{t(locale, 'governance')}</p>
          <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'bidCancellations')}</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{t(locale, 'bidCancellationsHelp')}</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">{t(locale, 'pendingBidCancellations')}</h2>
          {pendingRequests.isError ? (
            <Card className="border-destructive/40 bg-destructive/10">
              <CardContent className="pt-6">
                <p className="font-semibold">{t(locale, 'bidCancellationLoadFailed')}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t(locale, 'bidCancellationLoadFailedHelp')}</p>
              </CardContent>
            </Card>
          ) : pendingRequests.data?.length ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {pendingRequests.data.map((request) => (
                <CancellationCard
                  key={request.id}
                  request={request}
                  showActions
                  pending={approve.isPending || reject.isPending}
                  onApprove={approveCancellation}
                  onReject={rejectCancellation}
                />
              ))}
            </div>
          ) : (
            <EmptyState title={t(locale, 'noPendingBidCancellations')}>{t(locale, 'noPendingBidCancellationsHelp')}</EmptyState>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">{t(locale, 'recentBidCancellations')}</h2>
          {history.isError ? (
            <Card className="border-destructive/40 bg-destructive/10">
              <CardContent className="pt-6">
                <p className="font-semibold">{t(locale, 'bidCancellationLoadFailed')}</p>
              </CardContent>
            </Card>
          ) : history.data?.length ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {history.data.map((request) => <CancellationCard key={request.id} request={request} />)}
            </div>
          ) : (
            <EmptyState title={t(locale, 'noRecentBidCancellations')} />
          )}
        </section>
      </div>
    </AuthGuard>
  );
}
