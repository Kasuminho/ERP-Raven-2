'use client';

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { t } from '@/lib/i18n';
import { useAuthStore } from '@/store/auth-store';
import { useLocaleStore } from '@/store/locale-store';
import type { Auction, AuctionBidInvalidationVote, AuctionReviewVote, EligibilityRow, StaffReviewAlert } from '@/types/api';

const STAFF_REVIEW_THRESHOLD = 3;

function voteName(vote: AuctionReviewVote | AuctionBidInvalidationVote): string {
  return vote.voter?.discordNickname || vote.voter?.discordUsername || vote.voterId;
}

function alertTone(severity: StaffReviewAlert['severity']) {
  if (severity === 'danger') return 'red';
  if (severity === 'warning') return 'gold';
  return 'blue';
}

function alertInstanceKey(alert: StaffReviewAlert) {
  return alert.playerId ? `${alert.key}:${alert.playerId}` : alert.key;
}

export function StaffReviewCard({
  auction,
  ranking = [],
  onApprove,
  onInvalidateBid,
  onOverrideAlert,
  onReject,
  pending,
}: {
  auction: Auction & { assistedReview?: { alerts: StaffReviewAlert[]; overriddenAlertKeys: string[] } };
  ranking?: EligibilityRow[];
  onApprove?: (playerId: string) => void;
  onInvalidateBid?: (bidId: string) => void;
  onOverrideAlert?: (alert: StaffReviewAlert) => void;
  onReject?: () => void;
  pending?: boolean;
}) {
  const locale = useLocaleStore((state) => state.locale);
  const userId = useAuthStore((state) => state.userId);
  const votes = auction.reviewVotes ?? [];
  const currentVote = votes.find((vote) => vote.voterId === userId);
  const rejectionVotes = votes.filter((vote) => vote.action === 'REJECT');
  const approvalVotes = votes.filter((vote) => vote.action === 'APPROVE');
  const bidInvalidationVotes = auction.bidInvalidationVotes ?? [];
  const assistedAlerts = auction.assistedReview?.alerts ?? [];
  const overriddenAlertKeys = new Set(auction.assistedReview?.overriddenAlertKeys ?? []);
  const approvalsByPlayer = new Map<string, AuctionReviewVote[]>();
  const invalidationsByBid = new Map<string, AuctionBidInvalidationVote[]>();

  for (const vote of approvalVotes) {
    if (!vote.playerId) continue;

    approvalsByPlayer.set(vote.playerId, [...(approvalsByPlayer.get(vote.playerId) ?? []), vote]);
  }

  for (const vote of bidInvalidationVotes) {
    invalidationsByBid.set(vote.bidId, [...(invalidationsByBid.get(vote.bidId) ?? []), vote]);
  }

  const neededRejections = Math.max(0, STAFF_REVIEW_THRESHOLD - rejectionVotes.length);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{auction.itemName}</CardTitle>
          <ShieldAlert className="h-5 w-5 text-primary" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge tone="gold">{auction.itemTier}</Badge>
          <Badge tone="red">{auction.status}</Badge>
        </div>
        {assistedAlerts.length ? (
          <div className="rounded-md border bg-background/35 p-3 text-xs">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">Review assistida</p>
              <Badge tone="muted">{assistedAlerts.length} alerta(s)</Badge>
            </div>
            <div className="space-y-2">
              {assistedAlerts.map((alert) => {
                const overridden = overriddenAlertKeys.has(alertInstanceKey(alert));

                return (
                  <div key={alertInstanceKey(alert)} className="rounded-md border bg-background/45 p-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={overridden ? 'muted' : alertTone(alert.severity)}>{overridden ? 'ignorado' : alert.severity}</Badge>
                        <span className="font-semibold">{alert.title}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link href={alert.evidenceHref} className="font-semibold text-primary hover:underline">Evidencia</Link>
                        {!overridden ? (
                          <button
                            type="button"
                            className="font-semibold text-primary hover:underline disabled:text-muted-foreground"
                            disabled={pending}
                            onClick={() => onOverrideAlert?.(alert)}
                          >
                            Ignorar
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-1 text-muted-foreground">{alert.explanation}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
        {ranking.length ? (
          <div className="space-y-3">
            {ranking.map((candidate, index) => {
              const candidateVotes = approvalsByPlayer.get(candidate.playerId) ?? [];
              const invalidationVotes = candidate.bidId ? invalidationsByBid.get(candidate.bidId) ?? [] : [];
              const neededApprovals = Math.max(0, STAFF_REVIEW_THRESHOLD - candidateVotes.length);
              const neededInvalidations = Math.max(0, STAFF_REVIEW_THRESHOLD - invalidationVotes.length);
              const currentApprovalForCandidate =
                currentVote?.action === 'APPROVE' && currentVote.playerId === candidate.playerId;
              const currentInvalidationForCandidate =
                candidate.bidId ? invalidationVotes.some((vote) => vote.voterId === userId) : false;
              const canApprove =
                candidate.eligibilityStatus !== 'INELIGIBLE' && candidate.lockMatchesBid !== false;

              return (
                <div
                  key={candidate.playerId}
                  className="rounded-md border bg-background/40 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={index === 0 ? 'gold' : 'muted'}>#{index + 1}</Badge>
                        {index === 0 && <Badge tone="green">Atual vencedor</Badge>}
                        <Link
                          className="font-semibold text-primary underline-offset-4 hover:underline"
                          href={`/dashboard/staff/item-audit?playerId=${candidate.playerId}`}
                        >
                          {candidate.nickname}
                        </Link>
                      </div>
                      <p className="text-muted-foreground">
                        {t(locale, 'layer')} {candidate.dimensionalLayer} - {candidate.attendancePercentage}%{' '}
                        {t(locale, 'attendance').toLowerCase()} - Score {candidate.priorityScore.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge tone="blue">Bid {candidate.bidAmount ?? 0} DKP</Badge>
                      <Badge tone={candidate.lockMatchesBid === false ? 'red' : 'green'}>
                        Lock {candidate.lockAmount ?? 0} DKP
                      </Badge>
                      <Badge tone={candidate.eligibilityStatus === 'INELIGIBLE' ? 'red' : 'gold'}>
                        {candidate.eligibilityStatus}
                      </Badge>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground">{candidate.eligibilityReason}</p>

                  <div className="mt-3 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Aprovar este candidato</span>
                      <span>{candidateVotes.length}/{STAFF_REVIEW_THRESHOLD}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, (candidateVotes.length / STAFF_REVIEW_THRESHOLD) * 100)}%` }}
                      />
                    </div>
                    <p className="text-muted-foreground">
                      Aprovaram: {candidateVotes.length ? candidateVotes.map(voteName).join(', ') : 'ninguem ainda'}
                    </p>
                  </div>

                  <div className="mt-3 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Invalidar este bid</span>
                      <span>{invalidationVotes.length}/{STAFF_REVIEW_THRESHOLD}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-destructive transition-all"
                        style={{ width: `${Math.min(100, (invalidationVotes.length / STAFF_REVIEW_THRESHOLD) * 100)}%` }}
                      />
                    </div>
                    <p className="text-muted-foreground">
                      Votaram para invalidar:{' '}
                      {invalidationVotes.length ? invalidationVotes.map(voteName).join(', ') : 'ninguem ainda'}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Button
                      className="flex-1"
                      disabled={!canApprove || pending || currentApprovalForCandidate}
                      onClick={() => onApprove?.(candidate.playerId)}
                    >
                      {currentVote?.action === 'REJECT'
                        ? 'Alterar para aprovar'
                        : neededApprovals > 0
                          ? `${t(locale, 'approve')} (${neededApprovals})`
                          : t(locale, 'approve')}
                    </Button>
                    <Button
                      className="flex-1"
                      variant="secondary"
                      disabled={!candidate.bidId || pending || currentInvalidationForCandidate}
                      onClick={() => candidate.bidId && onInvalidateBid?.(candidate.bidId)}
                    >
                      {currentInvalidationForCandidate
                        ? 'Voto de invalidação registrado'
                        : neededInvalidations > 0
                          ? `Votar invalidar (${neededInvalidations})`
                          : 'Invalidar bid'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t(locale, 'noRankedCandidates')}</p>
        )}
        <div className="rounded-md border bg-background/35 p-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-muted-foreground">
              Seu voto: {currentVote ? currentVote.action === 'APPROVE' ? 'Aprovar' : 'Rejeitar' : 'Ainda nao votou'}
            </span>
            <span className="text-muted-foreground">
              Rejeicoes: {rejectionVotes.length}/{STAFF_REVIEW_THRESHOLD} {neededRejections > 0 ? `(faltam ${neededRejections})` : ''}
            </span>
          </div>
          <p className="mt-2 text-muted-foreground">
            Rejeitaram: {rejectionVotes.length ? rejectionVotes.map(voteName).join(', ') : 'ninguem ainda'}
          </p>
          {approvalsByPlayer.size > 1 && (
            <div className="mt-2 space-y-1 text-muted-foreground">
              {[...approvalsByPlayer.entries()].map(([playerId, playerVotes]) => {
                const candidate = ranking.find((row) => row.playerId === playerId);

                return (
                  <p key={playerId}>
                    {candidate?.nickname ?? playerId}: {playerVotes.length}/{STAFF_REVIEW_THRESHOLD} - {playerVotes.map(voteName).join(', ')}
                  </p>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" variant="danger" disabled={pending || currentVote?.action === 'REJECT'} onClick={onReject}>
            {currentVote?.action === 'APPROVE'
              ? 'Alterar para rejeitar resultado'
              : neededRejections > 0
                ? `Rejeitar resultado e relistar (${neededRejections})`
                : 'Rejeitar resultado e relistar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
