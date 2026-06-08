'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';
import type { Auction } from '@/types/api';

export function BidModal({
  auction,
  existingBidAmount,
  onBid,
  pending,
}: {
  auction: Auction;
  existingBidAmount?: number;
  playerId?: string;
  onBid: (data: { amount?: number }) => void;
  pending?: boolean;
}) {
  const locale = useLocaleStore((state) => state.locale);
  const minimumAmount = existingBidAmount ? existingBidAmount + 1 : auction.minimumBid;
  const [amount, setAmount] = useState(String(minimumAmount));

  useEffect(() => {
    setAmount(String(minimumAmount));
  }, [minimumAmount]);

  function submit(event: FormEvent) {
    event.preventDefault();
    onBid({
      amount: auction.auctionMode === 'ALL_IN' ? undefined : Number(amount),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border bg-background/45 p-4">
      {auction.auctionMode === 'STANDARD' ? (
        <div className="space-y-2">
          {existingBidAmount ? (
            <p className="text-sm text-muted-foreground">
              {t(locale, 'currentBid')}: <span className="font-semibold text-foreground">{existingBidAmount} DKP</span>. {t(locale, 'increaseBidHelp')}
            </p>
          ) : null}
          <Input type="number" min={minimumAmount} value={amount} onChange={(event) => setAmount(event.target.value)} />
        </div>
      ) : (
        <p className="rounded-md border border-primary/40 bg-primary/10 p-3 text-sm text-primary">
          {t(locale, 'allInWarning')}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {auction.auctionMode === 'ALL_IN' ? t(locale, 'confirmParticipation') : existingBidAmount ? t(locale, 'increaseBid') : t(locale, 'placeBid')}
      </Button>
    </form>
  );
}
