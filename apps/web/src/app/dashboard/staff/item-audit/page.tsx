'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { ArrowUpRight, ClipboardList, Gem, History, PackageSearch, Search } from 'lucide-react';
import { AuthGuard } from '@/components/guards/auth-guard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { usePlayerHistory, usePlayers } from '@/hooks/use-guild-api';
import { itemName, playerClassLabel, progressCategoryLabel } from '@/lib/game-labels';
import { displayImageUrl } from '@/lib/images';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';
import type { StaffPlayer } from '@/types/api';

function normalize(value?: string | null): string {
  return (value ?? '').toLowerCase().trim();
}

function playerLabel(player: StaffPlayer): string {
  const discordName = player.user.discordNickname || player.user.discordUsername;
  return `${player.nickname} - ${discordName} (${player.user.discordId})`;
}

function StaffItemAuditContent() {
  const locale = useLocaleStore((state) => state.locale);
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlayerId = searchParams.get('playerId') ?? '';
  const players = usePlayers();
  const [search, setSearch] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState(initialPlayerId);
  const history = usePlayerHistory(selectedPlayerId);

  const filteredPlayers = useMemo(() => {
    const term = normalize(search);

    return (players.data ?? []).filter((player) => {
      if (!term) return true;

      return [
        player.nickname,
        player.user.discordUsername,
        player.user.discordNickname,
        player.user.discordId,
      ].some((value) => normalize(value).includes(term));
    });
  }, [players.data, search]);

  const selectedPlayer = (players.data ?? []).find((player) => player.id === selectedPlayerId);
  const drops = history.data?.drops ?? [];
  const requests = history.data?.itemRequests ?? [];
  const transactions = history.data?.transactions ?? [];
  const progress = history.data?.progress ?? [];

  function selectPlayer(playerId: string) {
    setSelectedPlayerId(playerId);
    router.replace(playerId ? `/dashboard/staff/item-audit?playerId=${playerId}` : '/dashboard/staff/item-audit');
  }

  return (
    <AuthGuard roles={['STAFF', 'ADMIN']}>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase text-primary">Auditoria de loot</p>
          <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">Auditoria de itens por jogador</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Selecione um Discord/player para revisar entregas, pedidos, provas e registros antes de decidir votos ou aprovacoes.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Selecionar jogador
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-[1fr_1.5fr]">
            <Input
              placeholder="Buscar por nick, Discord ID ou Discord username"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Select value={selectedPlayerId} onChange={(event) => selectPlayer(event.target.value)}>
              <option value="">Selecione um jogador cadastrado</option>
              {filteredPlayers.map((player) => (
                <option key={player.id} value={player.id}>{playerLabel(player)}</option>
              ))}
            </Select>
          </CardContent>
        </Card>

        {selectedPlayer ? (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <Card>
                <CardContent className="space-y-1 p-4">
                  <p className="text-xs uppercase text-muted-foreground">Player</p>
                  <p className="text-lg font-semibold">{selectedPlayer.nickname}</p>
                  <p className="text-xs text-muted-foreground">{selectedPlayer.user.discordUsername} - {selectedPlayer.user.discordId}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="space-y-1 p-4">
                  <p className="text-xs uppercase text-muted-foreground">{t(locale, 'class')}</p>
                  <p className="text-lg font-semibold">{playerClassLabel(selectedPlayer.class, locale)}</p>
                  <p className="text-xs text-muted-foreground">{t(locale, 'layer')} {selectedPlayer.dimensionalLayer}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="space-y-1 p-4">
                  <p className="text-xs uppercase text-muted-foreground">Drops entregues</p>
                  <p className="text-lg font-semibold">{drops.length}</p>
                  <p className="text-xs text-muted-foreground">Historico vinculado ao Discord</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="space-y-1 p-4">
                  <p className="text-xs uppercase text-muted-foreground">Pedidos ativos/historico</p>
                  <p className="text-lg font-semibold">{requests.length}</p>
                  <p className="text-xs text-muted-foreground">Fila e entregas de request</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gem className="h-5 w-5 text-primary" />
                    Log de drops entregues
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {drops.map((drop) => {
                    const proofUrl = displayImageUrl(drop.proofImageUrl);

                    return (
                      <div key={drop.id} className="rounded-md border bg-background/35 p-3 text-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{itemName(drop.itemCatalog, locale, drop.itemName)}</p>
                            <p className="text-muted-foreground">
                              Entregue em {drop.deliveredAt ? new Date(drop.deliveredAt).toLocaleString() : '-'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Fonte: {drop.auction ? 'Leilao' : drop.itemInterestEntryId ? 'Interesse' : 'Pedido/Manual'}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {drop.auction && <Badge tone="gold">Auction</Badge>}
                            {drop.itemInterestEntryId && <Badge tone="blue">Interest</Badge>}
                            {drop.staffDiscordId && <Badge tone="muted">Staff {drop.staffDiscordId}</Badge>}
                          </div>
                        </div>
                        {proofUrl && (
                          <div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr]">
                            <img className="aspect-video w-full rounded-md border object-cover" src={proofUrl} alt={`Prova ${drop.itemName ?? 'drop'}`} />
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <p>Prova anexada. Clique na imagem para ampliar.</p>
                              <a className="inline-flex items-center gap-1 text-primary" href={drop.proofImageUrl ?? proofUrl} target="_blank" rel="noreferrer">
                                Abrir em nova aba <ArrowUpRight className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {!history.isLoading && drops.length === 0 && <EmptyState title="Nenhum drop entregue">Este player ainda nao tem entregas registradas.</EmptyState>}
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PackageSearch className="h-5 w-5 text-primary" />
                      Pedidos e ranks
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {requests.map((request) => (
                      <div key={request.id} className="rounded-md border bg-background/35 p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold">{itemName(request.itemCatalog, locale, request.itemName)}</p>
                          <Badge tone={request.remainingQuantity > 0 ? 'blue' : 'green'}>
                            {request.remainingQuantity > 0 ? 'Aberto' : 'Completo'}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">
                          Rank #{request.rankPosition} - Falta {request.remainingQuantity}/{request.totalQuantity}
                        </p>
                        {request.updateProofImageUrl && (
                          <img
                            className="mt-2 aspect-video w-full rounded-md border object-cover"
                            src={displayImageUrl(request.updateProofImageUrl)}
                            alt={`Atualizacao ${request.itemName}`}
                          />
                        )}
                      </div>
                    ))}
                    {!history.isLoading && requests.length === 0 && <p className="text-sm text-muted-foreground">Sem pedidos registrados.</p>}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5 text-primary" />
                      DKP recente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {transactions.slice(0, 12).map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-md border bg-background/35 p-2 text-sm">
                        <div>
                          <p className="font-semibold">{transaction.type}</p>
                          <p className="text-xs text-muted-foreground">{new Date(transaction.createdAt).toLocaleString()}</p>
                        </div>
                        <Badge tone={transaction.amount >= 0 ? 'green' : 'red'}>{transaction.amount}</Badge>
                      </div>
                    ))}
                    {!history.isLoading && transactions.length === 0 && <p className="text-sm text-muted-foreground">Sem transacoes DKP.</p>}
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Progresso recente</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {progress.slice(0, 9).map((row) => (
                  <div key={row.id} className="rounded-md border bg-background/35 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{progressCategoryLabel(row.category, locale)}</p>
                      <Badge tone={row.reviewStatus === 'APPROVED' ? 'green' : row.reviewStatus === 'PENDING' ? 'gold' : 'muted'}>{row.reviewStatus}</Badge>
                    </div>
                    <p className="text-muted-foreground">{row.note || 'Sem observacao'}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {(row.imageUrls?.length ? row.imageUrls : row.imageUrl ? [row.imageUrl] : []).slice(0, 4).map((url) => (
                        <img key={url} className="aspect-video rounded-md border object-cover" src={displayImageUrl(url)} alt={row.category} />
                      ))}
                    </div>
                  </div>
                ))}
                {!history.isLoading && progress.length === 0 && <p className="text-sm text-muted-foreground">Sem progresso publicado.</p>}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Link className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold hover:border-primary" href={`/dashboard/staff/players/${selectedPlayer.id}`}>
                Abrir dossie completo <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </>
        ) : (
          <EmptyState title="Selecione um jogador">Use a busca acima para carregar a auditoria de drops e pedidos de um Discord.</EmptyState>
        )}
      </div>
    </AuthGuard>
  );
}

export default function StaffItemAuditPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Carregando auditoria...</div>}>
      <StaffItemAuditContent />
    </Suspense>
  );
}
