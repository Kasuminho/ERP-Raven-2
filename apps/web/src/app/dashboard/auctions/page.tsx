'use client';

import { useMemo, useState } from 'react';
import { AuctionCard } from '@/components/dashboard/auction-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Select } from '@/components/ui/select';
import { useAuctions } from '@/hooks/use-auctions-api';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';

export default function AuctionsPage() {
  const locale = useLocaleStore((state) => state.locale);
  const { data = [] } = useAuctions();
  const [tier, setTier] = useState('ALL');
  const [type, setType] = useState('ALL');
  const [status, setStatus] = useState('ALL');

  const auctions = useMemo(() => data.filter((auction) => (
    (tier === 'ALL' || auction.itemTier === tier)
    && (type === 'ALL' || auction.itemType === type)
    && (status === 'ALL' || auction.status === status)
  )), [data, status, tier, type]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">{t(locale, 'quartermaster')}</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'auctions')}</h1>
      </div>
      <div className="flex flex-wrap gap-3">
        <Select value={tier} onChange={(event) => setTier(event.target.value)}>
          {['ALL', 'T2', 'T3', 'T4', 'LEGENDARY'].map((value) => <option key={value}>{value}</option>)}
        </Select>
        <Select value={type} onChange={(event) => setType(event.target.value)}>
          {['ALL', 'WEAPON', 'ARMOR', 'ACCESSORY', 'CELESTIAL_STONE'].map((value) => <option key={value}>{value}</option>)}
        </Select>
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          {['ALL', 'OPEN', 'PENDING_REVIEW', 'FINISHED', 'CANCELLED', 'RELISTED'].map((value) => <option key={value}>{value}</option>)}
        </Select>
      </div>
      {auctions.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {auctions.map((auction) => <AuctionCard key={auction.id} auction={auction} />)}
        </div>
      ) : <EmptyState title={t(locale, 'noAuctionsMatch')} />}
    </div>
  );
}
