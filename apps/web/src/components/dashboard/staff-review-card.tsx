'use client';

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';
import type { Auction, EligibilityRow } from '@/types/api';

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
  const top = ranking[0];

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
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t(locale, 'noRankedCandidates')}</p>
        )}
        <div className="flex gap-2">
          <Button className="flex-1" disabled={!top || pending} onClick={() => top && onApprove?.(top.playerId)}>
            {t(locale, 'approve')}
          </Button>
          <Button className="flex-1" variant="secondary" disabled={!top?.bidId || pending} onClick={() => top?.bidId && onInvalidateBid?.(top.bidId)}>
            Invalidar
          </Button>
          <Button className="flex-1" variant="danger" disabled={pending} onClick={onReject}>
            {t(locale, 'reject')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
