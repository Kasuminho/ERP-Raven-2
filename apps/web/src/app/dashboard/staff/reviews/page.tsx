'use client';

import { useState } from 'react';
import { AuthGuard } from '@/components/guards/auth-guard';
import { StaffReviewCard } from '@/components/dashboard/staff-review-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { notifyToast } from '@/components/ui/toaster';
import { useApproveBidCancellation, useApproveWinner, useOverrideStaffReviewAlert, usePendingBidCancellations, usePendingReviews, useRejectBidCancellation, useRejectReview, useRemoveAuctionBid, useReviewAuctionDispute, useStaffAuctionDisputes, useStaffReviewDetails } from '@/hooks/use-auctions-api';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';
import type { AuctionDispute, AuctionDisputeStatus, StaffReviewAlert } from '@/types/api';

function ReviewItem({ auctionId }: { auctionId: string }) {
  const locale = useLocaleStore((state) => state.locale);
  const details = useStaffReviewDetails(auctionId);
  const approveWinner = useApproveWinner(auctionId);
  const overrideAlert = useOverrideStaffReviewAlert(auctionId);
  const rejectReview = useRejectReview(auctionId);
  const removeBid = useRemoveAuctionBid(auctionId);
  const [action, setAction] = useState<{ kind: 'reject' | 'invalidate'; bidId?: string } | { kind: 'override-alert'; alert: StaffReviewAlert }>();
  const [reason, setReason] = useState('');

  if (!details.data) return null;

  const pending = approveWinner.isPending || rejectReview.isPending || removeBid.isPending || overrideAlert.isPending;

  return (
    <>
      <StaffReviewCard
        auction={details.data}
        ranking={details.data.ranking}
        pending={pending}
        onApprove={(playerId) => approveWinner.mutate(playerId, { onSuccess: () => notifyToast({ title: 'Voto de aprovacao registrado.', tone: 'success' }) })}
        onInvalidateBid={(bidId) => { setReason(''); setAction({ kind: 'invalidate', bidId }); }}
        onOverrideAlert={(alert) => { setReason(''); setAction({ kind: 'override-alert', alert }); }}
        onReject={() => { setReason(''); setAction({ kind: 'reject' }); }}
      />
      <ConfirmationDialog
        open={Boolean(action)}
        title={action?.kind === 'override-alert' ? 'Ignorar alerta?' : action?.kind === 'invalidate' ? 'Invalidar bid?' : 'Rejeitar resultado?'}
        description={
          action?.kind === 'override-alert'
            ? 'O alerta fica auditado como ignorado, mas nenhuma decisao de loot e tomada automaticamente.'
            : action?.kind === 'invalidate'
              ? 'O bid sera invalidado e o DKP do player sera liberado depois do quorum exigido.'
              : t(locale, 'rejectionReasonPrompt')
        }
        confirmLabel={action?.kind === 'override-alert' ? 'Registrar motivo' : action?.kind === 'invalidate' ? 'Registrar invalidacao' : 'Registrar rejeicao'}
        pending={pending}
        onClose={() => setAction(undefined)}
        onConfirm={() => {
          if (!action || !reason.trim()) return;
          const kind = action.kind;
          const onSuccess = () => { setAction(undefined); notifyToast({ title: kind === 'override-alert' ? 'Alerta ignorado com auditoria.' : kind === 'invalidate' ? 'Voto de invalidacao registrado.' : 'Voto de rejeicao registrado.', tone: 'success' }); };
          if (kind === 'override-alert') {
            overrideAlert.mutate({
              alertKey: action.alert.key,
              playerId: action.alert.playerId,
              reason: reason.trim(),
            }, { onSuccess });
            return;
          }
          if (kind === 'invalidate' && action.bidId) removeBid.mutate({ bidId: action.bidId, reason: reason.trim() }, { onSuccess });
          else rejectReview.mutate(reason.trim(), { onSuccess });
        }}
      >
        <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo obrigatorio" aria-label="Motivo" />
      </ConfirmationDialog>
    </>
  );
}

export default function StaffReviewsPage() {
  const locale = useLocaleStore((state) => state.locale);
  const reviews = usePendingReviews();
  const bidCancellations = usePendingBidCancellations();
  const [disputeStatus, setDisputeStatus] = useState<AuctionDisputeStatus | 'ALL'>('PENDING');
  const disputes = useStaffAuctionDisputes(disputeStatus);
  const approveBidCancellation = useApproveBidCancellation();
  const rejectBidCancellation = useRejectBidCancellation();
  const reviewDispute = useReviewAuctionDispute();
  const [action, setAction] = useState<{ kind: 'approve' | 'reject'; requestId: string }>();
  const [disputeAction, setDisputeAction] = useState<{ status: 'ACCEPTED' | 'REJECTED'; dispute: AuctionDispute }>();
  const [note, setNote] = useState('');
  const [externalNotePt, setExternalNotePt] = useState('');
  const [externalNoteEn, setExternalNoteEn] = useState('');
  const pending = approveBidCancellation.isPending || rejectBidCancellation.isPending;
  const disputePending = reviewDispute.isPending;

  function openAction(kind: 'approve' | 'reject', requestId: string) {
    setNote('');
    setAction({ kind, requestId });
  }

  function openDisputeAction(status: 'ACCEPTED' | 'REJECTED', dispute: AuctionDispute) {
    setNote('');
    setExternalNotePt('');
    setExternalNoteEn('');
    setDisputeAction({ status, dispute });
  }

  return (
    <AuthGuard roles={['STAFF', 'ADMIN']}>
      <div className="space-y-6">
        <div><p className="text-sm uppercase text-primary">{t(locale, 'governance')}</p><h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'staffReview')}</h1></div>
        {bidCancellations.isError && <Card className="border-destructive/40 bg-destructive/10"><CardContent className="pt-6"><p className="font-semibold">{t(locale, 'bidCancellationLoadFailed')}</p><p className="mt-1 text-sm text-muted-foreground">{t(locale, 'bidCancellationLoadFailedHelp')}</p></CardContent></Card>}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Contestacoes de leilao</CardTitle>
                <p className="text-sm text-muted-foreground">Fila controlada: aceitar ou rejeitar nao reabre leilao automaticamente.</p>
              </div>
              <select value={disputeStatus} onChange={(event) => setDisputeStatus(event.target.value as AuctionDisputeStatus | 'ALL')} className="h-10 rounded-md border bg-background px-3 text-sm">
                {['PENDING', 'ACCEPTED', 'REJECTED', 'ALL'].map((status) => <option key={status}>{status}</option>)}
              </select>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {(disputes.data ?? []).map((dispute) => (
              <div key={dispute.id} className="rounded-lg border bg-background/45 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{dispute.auction?.itemName ?? dispute.auctionId}</p>
                    <p className="text-sm text-muted-foreground">{dispute.player?.nickname ?? dispute.playerId} - layer {dispute.player?.dimensionalLayer ?? '-'}</p>
                  </div>
                  <Badge tone={dispute.status === 'PENDING' ? 'gold' : dispute.status === 'ACCEPTED' ? 'green' : 'red'}>{dispute.status}</Badge>
                </div>
                <p className="mt-3 rounded-md border bg-background/50 p-3 text-sm text-muted-foreground">{dispute.reason}</p>
                {dispute.proofImageUrl ? <p className="mt-2 break-all text-xs text-primary">{dispute.proofImageUrl}</p> : null}
                {dispute.status === 'PENDING' ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button disabled={disputePending} onClick={() => openDisputeAction('ACCEPTED', dispute)}>Aceitar</Button>
                    <Button variant="danger" disabled={disputePending} onClick={() => openDisputeAction('REJECTED', dispute)}>Rejeitar</Button>
                  </div>
                ) : null}
              </div>
            ))}
            {!disputes.isLoading && (disputes.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma contestacao nesse filtro.</p> : null}
          </CardContent>
        </Card>
        {bidCancellations.data?.length ? (
          <Card>
            <CardHeader><CardTitle>{t(locale, 'pendingBidCancellations')}</CardTitle><p className="text-sm text-muted-foreground">{t(locale, 'pendingBidCancellationsHelp')}</p></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {bidCancellations.data.map((request) => (
                <div key={request.id} className="rounded-lg border bg-background/45 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{request.auction?.itemName ?? request.auctionId}</p><p className="text-sm text-muted-foreground">{request.player?.nickname ?? request.playerId} - {request.bid?.bidAmount ?? 0} DKP</p></div><p className="text-xs text-muted-foreground">{new Date(request.createdAt).toLocaleString()}</p></div>
                  <p className="mt-3 rounded-md border bg-background/50 p-3 text-sm text-muted-foreground">{request.reason}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button disabled={pending} onClick={() => openAction('approve', request.id)}>{t(locale, 'approveCancellation')}</Button>
                    <Button variant="danger" disabled={pending} onClick={() => openAction('reject', request.id)}>{t(locale, 'rejectCancellation')}</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
        {reviews.data?.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{reviews.data.map((auction) => <ReviewItem key={auction.id} auctionId={auction.id} />)}</div> : <EmptyState title={t(locale, 'noPendingReviews')}>{t(locale, 'noPendingReviewsHelp')}</EmptyState>}
        <ConfirmationDialog
          open={Boolean(action)}
          title={action?.kind === 'approve' ? 'Aprovar cancelamento de bid?' : 'Rejeitar cancelamento de bid?'}
          description={action?.kind === 'approve' ? 'O bid sera invalidado e o lock de DKP liberado conforme o quorum.' : 'O bid e o lock de DKP permanecerao ativos.'}
          confirmLabel={action?.kind === 'approve' ? t(locale, 'approveCancellation') : t(locale, 'rejectCancellation')}
          pending={pending}
          tone={action?.kind === 'approve' ? 'primary' : 'danger'}
          onClose={() => setAction(undefined)}
          onConfirm={() => {
            if (!action) return;
            const payload = { requestId: action.requestId, note: note.trim() || undefined };
            const onSuccess = () => { setAction(undefined); notifyToast({ title: t(locale, 'cancellationReviewed'), tone: 'success' }); };
            if (action.kind === 'approve') approveBidCancellation.mutate(payload, { onSuccess });
            else rejectBidCancellation.mutate(payload, { onSuccess });
          }}
        >
          <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder={action?.kind === 'approve' ? 'Observacao opcional' : 'Motivo da rejeicao'} aria-label="Observacao da revisao" />
        </ConfirmationDialog>
        <ConfirmationDialog
          open={Boolean(disputeAction)}
          title={disputeAction?.status === 'ACCEPTED' ? 'Aceitar contestacao?' : 'Rejeitar contestacao?'}
          description="A decisao registra auditoria e nao reabre o leilao automaticamente."
          confirmLabel={disputeAction?.status === 'ACCEPTED' ? 'Aceitar' : 'Rejeitar'}
          pending={disputePending}
          tone={disputeAction?.status === 'ACCEPTED' ? 'primary' : 'danger'}
          onClose={() => setDisputeAction(undefined)}
          onConfirm={() => {
            if (!disputeAction || note.trim().length < 8) return;
            reviewDispute.mutate({
              disputeId: disputeAction.dispute.id,
              status: disputeAction.status,
              reviewNote: note.trim(),
              externalNotePt: externalNotePt.trim() || undefined,
              externalNoteEn: externalNoteEn.trim() || undefined,
            }, {
              onSuccess: () => {
                setDisputeAction(undefined);
                notifyToast({ title: 'Contestacao revisada.', tone: 'success' });
              },
            });
          }}
        >
          <div className="space-y-2">
            <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Nota interna obrigatoria" aria-label="Nota interna" />
            <Input value={externalNotePt} onChange={(event) => setExternalNotePt(event.target.value)} placeholder="Nota externa PT-BR opcional" aria-label="Nota externa PT-BR" />
            <Input value={externalNoteEn} onChange={(event) => setExternalNoteEn(event.target.value)} placeholder="External note EN optional" aria-label="External note EN" />
          </div>
        </ConfirmationDialog>
      </div>
    </AuthGuard>
  );
}
