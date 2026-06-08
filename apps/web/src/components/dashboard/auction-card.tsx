'use client';

import Link from 'next/link';
import { Gavel, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { displayImageUrl } from '@/lib/images';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';
import type { Auction } from '@/types/api';
import { CountdownTimer } from './countdown-timer';

export function AuctionCard({ auction }: { auction: Auction }) {
  const locale = useLocaleStore((state) => state.locale);

  return (
    <Link href={`/dashboard/auctions/${auction.id}`}>
      <Card className="h-full transition hover:border-primary/55 hover:bg-card">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="line-clamp-2">{auction.itemName}</CardTitle>
            <Gavel className="h-5 w-5 shrink-0 text-primary" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {auction.itemCatalog?.image1Url && (
            <img
              src={displayImageUrl(auction.itemCatalog.image1Url)}
              alt={auction.itemName}
              className="aspect-video w-full rounded-md border object-cover"
            />
          )}
          <div className="flex flex-wrap gap-2">
            <Badge tone="gold">{auction.itemTier}</Badge>
            <Badge tone="blue">{auction.itemType}</Badge>
            <Badge tone={auction.status === 'OPEN' ? 'green' : 'muted'}>{auction.status}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">{t(locale, 'minimum')}</p>
              <p className="font-semibold">{auction.minimumBid} DKP</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t(locale, 'mode')}</p>
              <p className="font-semibold">{auction.auctionMode}</p>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border bg-background/40 p-3">
            <span className="text-sm text-muted-foreground">{t(locale, 'remainingTime')}</span>
            <CountdownTimer endsAt={auction.endsAt} />
          </div>
          {auction.requiresStaffReview && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <ShieldCheck className="h-4 w-4" /> {t(locale, 'staffReviewRequired')}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
