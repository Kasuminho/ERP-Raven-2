'use client';

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { t } from '@/lib/i18n';
import { useAuthStore } from '@/store/auth-store';
import { useLocaleStore } from '@/store/locale-store';
import type { Auction, AuctionReviewVote, EligibilityRow } from '@/types/api';

const STAFF_REVIEW_THRESHOLD = 3;

function voteName(vote: AuctionReviewVote): string {
  return vote.voter?.discordNickname || vote.voter?.discordUsername || vote.voterId;
}

export function StaffReviewCard({
  auction,
  ranking = [],
  onApprove,
  onInvalidateBid,
  onReject,
  pending,
}: {
  auction: Auction;
  ranking?: EligibilityRow[];
  onApprove?: (playerId: string) => void;
  onInvalidateBid?: (bidId: string) => void;
  onReject?: () => void;
  pending?: boolean;
}) {
  const locale = useLocaleStore((state) => state.locale);
  const userId = useAuthStore((state) => state.userId);
  const top = ranking[0];
  const votes = auction.reviewVotes ?? [];
  const currentVote = votes.find((vote) => vote.voterId === userId);
  const rejectionVotes = votes.filter((vote) => vote.action === 'REJECT');
  const approvalVotes = votes.filter((vote) => vote.action === 'APPROVE');
  const approvalsByPlayer = new Map<string, AuctionReviewVote[]>();

  for (const vote of approvalVotes) {
    if (!vote.playerId) continue;

    approvalsByPlayer.set(vote.playerId, [...(approvalsByPlayer.get(vote.playerId) ?? []), vote]);
  }

  const topApprovalVotes = top ? approvalsByPlayer.get(top.playerId) ?? [] : [];
  const neededApprovals = Math.max(0, STAFF_REVIEW_THRESHOLD - topApprovalVotes.length);
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
        {top ? (
          <div className="rounded-md border bg-background/40 p-3 text-sm">
            <Link className="font-semibold text-primary underline-offset-4 hover:underline" href={`/dashboard/staff/item-audit?playerId=${top.playerId}`}>
              {top.nickname}
            </Link>
            <p className="text-muted-foreground">
              {t(locale, 'layer')} {top.dimensionalLayer} - {top.attendancePercentage}% {t(locale, 'attendance').toLowerCase()} - {top.availableDKP} DKP
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{top.eligibilityReason}</p>
            <div className="mt-3 space-y-1 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Aprovar este candidato</span>
                <span>{topApprovalVotes.length}/{STAFF_REVIEW_THRESHOLD}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, (topApprovalVotes.length / STAFF_REVIEW_THRESHOLD) * 100)}%` }} />
              </div>
              <p className="text-muted-foreground">
                Aprovaram: {topApprovalVotes.length ? topApprovalVotes.map(voteName).join(', ') : 'ninguem ainda'}
              </p>
            </div>
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
          <Button className="flex-1" disabled={!top || pending || currentVote?.action === 'APPROVE' && currentVote.playerId === top?.playerId} onClick={() => top && onApprove?.(top.playerId)}>
            {currentVote?.action === 'REJECT' ? 'Alterar para aprovar' : neededApprovals > 0 ? `${t(locale, 'approve')} (${neededApprovals})` : t(locale, 'approve')}
          </Button>
          <Button className="flex-1" variant="secondary" disabled={!top?.bidId || pending} onClick={() => top?.bidId && onInvalidateBid?.(top.bidId)}>
            Invalidar
          </Button>
          <Button className="flex-1" variant="danger" disabled={pending || currentVote?.action === 'REJECT'} onClick={onReject}>
            {currentVote?.action === 'APPROVE' ? 'Alterar para rejeitar' : neededRejections > 0 ? `${t(locale, 'reject')} (${neededRejections})` : t(locale, 'reject')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
