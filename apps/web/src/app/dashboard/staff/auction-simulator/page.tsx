'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Calculator, ExternalLink } from 'lucide-react';
import { AuthGuard } from '@/components/guards/auth-guard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { useAuctionRanking, useAuctions } from '@/hooks/use-guild-api';

export default function StaffAuctionSimulatorPage() {
  const auctions = useAuctions();
  const activeAuctions = useMemo(() => (auctions.data ?? []).filter((auction) => ['OPEN', 'PENDING_REVIEW'].includes(auction.status)), [auctions.data]);
  const [auctionId, setAuctionId] = useState('');
  const ranking = useAuctionRanking(auctionId);
  const selected = activeAuctions.find((auction) => auction.id === auctionId);

  return (
    <AuthGuard roles={['STAFF', 'ADMIN']}>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase text-primary">Governanca de loot</p>
          <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">Simulador de leilao</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Veja a ordem atual, score e fatores antes de votar. Classe prioritaria em arma recebe bonus pesado; camada, presenca e bid tambem contam.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5 text-primary" /> Selecionar leilao</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={auctionId} onChange={(event) => setAuctionId(event.target.value)}>
              <option value="">Escolha um leilao aberto ou em review</option>
              {activeAuctions.map((auction) => (
                <option key={auction.id} value={auction.id}>{auction.itemName} - {auction.status}</option>
              ))}
            </Select>
          </CardContent>
        </Card>

        {selected && (
          <Card>
            <CardHeader>
              <CardTitle>{selected.itemName}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm md:grid-cols-5">
              <span><Badge tone="gold">{selected.itemTier}</Badge></span>
              <span>Modo: {selected.auctionMode}</span>
              <span>Minimo: {selected.minimumBid}</span>
              <span>Status: {selected.status}</span>
              <Link className="inline-flex items-center gap-1 text-primary" href={`/dashboard/auctions/${selected.id}`}>Abrir <ExternalLink className="h-3 w-3" /></Link>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Ranking calculado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(ranking.data ?? []).map((row, index) => (
              <div key={row.playerId} className="grid gap-2 rounded-md border bg-background/35 p-3 text-sm md:grid-cols-[1.2fr_repeat(5,1fr)]">
                <strong><Badge tone="gold">#{index + 1}</Badge> {row.nickname}</strong>
                <span>Score: {Math.round(row.priorityScore)}</span>
                <span>Layer: {row.dimensionalLayer}</span>
                <span>Presenca: {Math.round(row.attendancePercentage)}%</span>
                <span>Bid: {row.bidAmount ?? row.availableDKP}</span>
                <span>{row.eligibilityStatus}</span>
                <p className="md:col-span-6 text-xs text-muted-foreground">{row.eligibilityReason}</p>
              </div>
            ))}
            {auctionId && !ranking.isLoading && (ranking.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Sem candidatos validos ainda.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
