'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ClipboardList, Gavel, HandHeart, History, Search, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useItemAuditFull, useItemAuditSummaries } from '@/hooks/use-items-api';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';
import { displayImageUrl } from '@/lib/images';
import type { ItemAuditSummary } from '@/types/api';

function itemLabel(item: ItemAuditSummary) {
  if (item.namePt && item.nameEn && item.namePt.toLowerCase() !== item.nameEn.toLowerCase()) {
    return `${item.namePt} / ${item.nameEn}`;
  }

  return item.namePt || item.nameEn || item.itemName;
}

export default function ItemAuditByItemPage() {
  const locale = useLocaleStore((state) => state.locale);
  const [search, setSearch] = useState('');
  const summaries = useItemAuditSummaries(search);
  const [selected, setSelected] = useState<ItemAuditSummary | null>(null);
  const detailParams = useMemo(
    () => ({ itemCatalogId: selected?.itemCatalogId, itemName: selected?.itemCatalogId ? undefined : selected?.itemName }),
    [selected],
  );
  const details = useItemAuditFull(detailParams);
  const audit = details.data;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">Loot Audit</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">Auditoria por item</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Veja quem ja recebeu cada item, inclusive entregas legadas ligadas por Discord ID ou nome antigo.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar item PT/EN/ES ou legado" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Itens com entrega registrada</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[720px] space-y-2 overflow-y-auto">
            {(summaries.data ?? []).map((item) => {
              const image = displayImageUrl(item.imageUrl);
              const active = selected?.itemKey === item.itemKey;

              return (
                <button
                  key={item.itemKey}
                  className={`flex w-full items-center gap-3 rounded-md border bg-background/35 p-3 text-left transition hover:border-primary/60 ${active ? 'border-primary/70' : ''}`}
                  onClick={() => setSelected(item)}
                >
                  {image && <img className="h-12 w-12 rounded object-cover" src={image} alt={itemLabel(item)} />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{itemLabel(item)}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.deliveredCount} entrega(s) - {item.uniquePlayers} player(s)
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {item.itemTier && <Badge tone="gold">{item.itemTier}</Badge>}
                      {item.itemType && <Badge tone="blue">{item.itemType}</Badge>}
                    </div>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              {selected ? itemLabel(selected) : 'Selecione um item'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selected && <p className="text-sm text-muted-foreground">Escolha um item na lista para abrir o log completo.</p>}
            {selected && (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-md border bg-background/35 p-3">
                  <p className="text-xs text-muted-foreground">{t(locale, 'deliveryProofs')}</p>
                  <p className="text-2xl font-bold">{audit?.drops.length ?? 0}</p>
                </div>
                <div className="rounded-md border bg-background/35 p-3">
                  <p className="text-xs text-muted-foreground">{t(locale, 'auctionsRan')}</p>
                  <p className="text-2xl font-bold">{audit?.auctions.length ?? 0}</p>
                </div>
                <div className="rounded-md border bg-background/35 p-3">
                  <p className="text-xs text-muted-foreground">{t(locale, 'interestDeclarations')}</p>
                  <p className="text-2xl font-bold">{audit?.interestPosts.reduce((sum, post) => sum + (post.entries?.length ?? 0), 0) ?? 0}</p>
                </div>
                <div className="rounded-md border bg-background/35 p-3">
                  <p className="text-xs text-muted-foreground">{t(locale, 'auditLogs')}</p>
                  <p className="text-2xl font-bold">{audit?.logs.length ?? 0}</p>
                </div>
              </div>
            )}

            {selected && (audit?.drops ?? []).map((drop) => (
              <div key={drop.id} className="rounded-md border bg-background/35 p-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    {drop.playerId ? (
                      <Link className="font-semibold text-primary underline-offset-4 hover:underline" href={`/dashboard/staff/item-audit?playerId=${drop.playerId}`}>
                        {drop.player?.nickname || drop.nicknameIngame || drop.discordId || 'Player legado'}
                      </Link>
                    ) : (
                      <p className="font-semibold">{drop.nicknameIngame || drop.discordId || 'Player legado'}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Discord: {drop.player?.user?.discordUsername || drop.discordId || 'sem vinculo'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={drop.source === 'AUCTION' ? 'gold' : drop.source === 'INTEREST' ? 'green' : 'muted'}>{drop.source}</Badge>
                    <Badge>{drop.deliveredAt ? new Date(drop.deliveredAt).toLocaleString() : 'sem data'}</Badge>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Staff: {drop.staff?.discordNickname || drop.staff?.discordUsername || drop.staffDiscordId || 'nao registrado'}
                </p>
                {drop.proofImageUrl && (
                  <a className="mt-2 inline-block text-xs text-primary" href={drop.proofImageUrl} target="_blank" rel="noreferrer">
                    Abrir comprovante
                  </a>
                )}
              </div>
            ))}
            {selected && (audit?.drops ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma entrega encontrada para este item.</p>
            )}
            {selected && (audit?.auctions ?? []).length > 0 && (
              <section className="space-y-2 pt-2">
                <h3 className="flex items-center gap-2 font-semibold"><Gavel className="h-4 w-4 text-primary" /> {t(locale, 'auctionsRan')}</h3>
                {audit?.auctions.map((auction) => (
                  <div key={auction.id} className="rounded-md border bg-background/35 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong>{auction.itemName}</strong>
                      <span className="flex flex-wrap gap-2">
                        <Badge tone="gold">{auction.itemTier}</Badge>
                        <Badge tone="blue">{auction.status}</Badge>
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{auction.bids?.length ?? 0} bid(s) - {new Date(auction.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </section>
            )}
            {selected && (audit?.interestPosts ?? []).length > 0 && (
              <section className="space-y-2 pt-2">
                <h3 className="flex items-center gap-2 font-semibold"><HandHeart className="h-4 w-4 text-primary" /> {t(locale, 'interestDeclarations')}</h3>
                {audit?.interestPosts.map((post) => (
                  <div key={post.id} className="rounded-md border bg-background/35 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong>{post.title}</strong>
                      <Badge tone="blue">{post.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{post.entries?.length ?? 0} interessado(s) - {post.votes?.length ?? 0} voto(s)</p>
                  </div>
                ))}
              </section>
            )}
            {selected && (audit?.winners ?? []).length > 0 && (
              <section className="space-y-2 pt-2">
                <h3 className="flex items-center gap-2 font-semibold"><Trophy className="h-4 w-4 text-primary" /> Vencedores</h3>
                {audit?.winners.map((winner) => (
                  <div key={`${winner.auctionId}-${winner.player?.id ?? winner.deliveredAt}`} className="rounded-md border bg-background/35 p-3 text-sm">
                    <p className="font-semibold">{winner.player?.nickname ?? 'Player nao vinculado'}</p>
                    <p className="text-xs text-muted-foreground">{winner.auctionTitle} - {winner.deliveredAt ? new Date(winner.deliveredAt).toLocaleString() : 'sem entrega'}</p>
                  </div>
                ))}
              </section>
            )}
            {selected && (audit?.logs ?? []).length > 0 && (
              <section className="space-y-2 pt-2">
                <h3 className="flex items-center gap-2 font-semibold"><History className="h-4 w-4 text-primary" /> {t(locale, 'auditLogs')}</h3>
                {audit?.logs.slice(0, 25).map((log) => (
                  <div key={log.id} className="rounded-md border bg-background/35 p-3 text-xs">
                    <div className="flex flex-wrap justify-between gap-2">
                      <strong>{log.action}</strong>
                      <span className="text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 text-muted-foreground">{log.targetType} - {log.actor?.discordNickname || log.actor?.discordUsername || 'sistema'}</p>
                  </div>
                ))}
              </section>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
