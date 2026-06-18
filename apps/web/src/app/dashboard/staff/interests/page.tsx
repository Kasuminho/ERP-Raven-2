'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CheckCircle2, Trophy, Vote } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUploadButton } from '@/components/ui/file-upload-button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { notifyToast } from '@/components/ui/toaster';
import { useCancelItemInterest, useCloseItemInterest, useDeliverItemInterest, useItemInterests, useStartItemInterestTieBreak, useUploadImage, useVoteItemInterest } from '@/hooks/use-guild-api';
import { displayImageUrl } from '@/lib/images';
import { t } from '@/lib/i18n';
import { useAuthStore } from '@/store/auth-store';
import { useLocaleStore } from '@/store/locale-store';
import type { ItemInterestEntry, ItemInterestPost, ItemType } from '@/types/api';

const STAFF_VOTE_THRESHOLD = 3;
const itemTypes: ItemType[] = ['WEAPON', 'ARMOR', 'ACCESSORY', 'CELESTIAL_STONE'];

function currentRoundVotes(post: ItemInterestPost): Map<string, number> {
  const counts = new Map<string, number>();
  const votes = (post.votes ?? []).filter((vote) => vote.round === post.votingRound);

  for (const vote of votes) {
    counts.set(vote.entryId, (counts.get(vote.entryId) ?? 0) + 1);
  }

  return counts;
}

function tieCandidateIds(post: ItemInterestPost): string[] {
  const counts = currentRoundVotes(post);
  const maxVotes = Math.max(0, ...counts.values());

  if (maxVotes === 0) return [];

  return [...counts.entries()].filter(([, count]) => count === maxVotes).map(([entryId]) => entryId);
}

function voteSummary(post: ItemInterestPost, entry: ItemInterestEntry): string {
  const count = currentRoundVotes(post).get(entry.id) ?? 0;
  return `${count}/${STAFF_VOTE_THRESHOLD}`;
}

function voterNames(post: ItemInterestPost, entry: ItemInterestEntry): string[] {
  return (entry.votes ?? [])
    .filter((vote) => vote.round === post.votingRound)
    .map((vote) => vote.voter?.discordNickname || vote.voter?.discordUsername || vote.voterId);
}

function currentUserVoteEntryId(post: ItemInterestPost, userId?: string): string | undefined {
  if (!userId) return undefined;

  return (post.votes ?? []).find((vote) => vote.round === post.votingRound && vote.voterId === userId)?.entryId;
}

function sortedEntriesByVotes(post: ItemInterestPost): ItemInterestEntry[] {
  const counts = currentRoundVotes(post);

  return [...(post.entries ?? [])].sort((first, second) => {
    const voteDiff = (counts.get(second.id) ?? 0) - (counts.get(first.id) ?? 0);

    if (voteDiff !== 0) return voteDiff;

    const layerDiff = (second.player?.dimensionalLayer ?? 0) - (first.player?.dimensionalLayer ?? 0);

    if (layerDiff !== 0) return layerDiff;

    return new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime();
  });
}

function localDateKey(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}

function itemTypeLabel(type: ItemType): string {
  return type.replace('_', ' ');
}

export default function StaffInterestsPage() {
  const locale = useLocaleStore((state) => state.locale);
  const userId = useAuthStore((state) => state.userId);
  const posts = useItemInterests();
  const closeInterest = useCloseItemInterest();
  const cancelInterest = useCancelItemInterest();
  const deliverInterest = useDeliverItemInterest();
  const voteInterest = useVoteItemInterest();
  const tieBreak = useStartItemInterestTieBreak();
  const uploadImage = useUploadImage();
  const [proofs, setProofs] = useState<Record<string, string>>({});
  const [showResolved, setShowResolved] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'ALL' | ItemType>('ALL');
  const [createdDateFilter, setCreatedDateFilter] = useState('');
  const [votingEntryId, setVotingEntryId] = useState<string>();

  const postsToRender = useMemo(
    () => (posts.data ?? [])
      .filter((post) => showResolved || !['DELIVERED', 'CANCELLED'].includes(post.status))
      .filter((post) => typeFilter === 'ALL' || post.itemCatalog?.itemType === typeFilter)
      .filter((post) => !createdDateFilter || localDateKey(post.createdAt) === createdDateFilter),
    [createdDateFilter, posts.data, showResolved, typeFilter],
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">{t(locale, 'staffLootDesk')}</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'interestPosts')}</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{t(locale, 'staffInterestsFlowHelp')}</p>
      </div>
      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
          <label className="space-y-1 text-sm">
            <span className="text-xs uppercase text-muted-foreground">{t(locale, 'filterByType')}</span>
            <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'ALL' | ItemType)}>
              <option value="ALL">{t(locale, 'allTypes')}</option>
              {itemTypes.map((type) => (
                <option key={type} value={type}>{itemTypeLabel(type)}</option>
              ))}
            </Select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs uppercase text-muted-foreground">{t(locale, 'filterByAddedDate')}</span>
            <Input type="date" value={createdDateFilter} onChange={(event) => setCreatedDateFilter(event.target.value)} />
          </label>
          <label className="flex items-center gap-2 rounded-md border bg-background/45 px-3 py-2 text-sm text-muted-foreground">
            <input className="h-4 w-4 accent-primary" type="checkbox" checked={showResolved} onChange={(event) => setShowResolved(event.target.checked)} />
            {t(locale, 'showResolvedInterests')}
          </label>
          <Button
            variant="secondary"
            onClick={() => {
              setTypeFilter('ALL');
              setCreatedDateFilter('');
              setShowResolved(false);
            }}
          >
            {t(locale, 'clearFilters')}
          </Button>
        </CardContent>
      </Card>
      <div className="space-y-4">
        {postsToRender.map((post) => {
          const selectedEntry = (post.entries ?? []).find((entry) => entry.id === post.selectedEntryId);
          const tiedIds = tieCandidateIds(post);
          const canStartTieBreak = post.status === 'VOTING' && tiedIds.length > 1;
          const restrictedCandidateIds = Array.isArray(post.votingCandidateEntryIds) ? post.votingCandidateEntryIds : [];
          const voteCounts = currentRoundVotes(post);
          const orderedEntries = sortedEntriesByVotes(post);
          const currentVoteEntryId = currentUserVoteEntryId(post, userId);
          const currentVoteEntry = orderedEntries.find((entry) => entry.id === currentVoteEntryId);
          const totalRoundVotes = (post.votes ?? []).filter((vote) => vote.round === post.votingRound).length;
          const leadingVotes = Math.max(0, ...voteCounts.values());
          const remainingToDecision = Math.max(0, STAFF_VOTE_THRESHOLD - leadingVotes);

          return (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{post.title}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {post.mode} - {t(locale, 'closesAt')} {new Date(post.closesAt).toLocaleString()} - Rodada {post.votingRound}
                    </p>
                  </div>
                  <Badge tone={post.status === 'OPEN' ? 'green' : post.status === 'READY_FOR_DELIVERY' ? 'gold' : 'blue'}>{post.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 rounded-md border bg-background/35 p-3 text-sm md:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Interessados</p>
                    <p className="text-lg font-semibold">{post.entries?.length ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Votos da rodada</p>
                    <p className="text-lg font-semibold">{totalRoundVotes}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Para liberar entrega</p>
                    <p className="text-lg font-semibold">
                      {post.status === 'VOTING'
                        ? remainingToDecision === 0 ? 'Maioria atingida' : `Faltam ${remainingToDecision}`
                        : post.status === 'READY_FOR_DELIVERY' ? 'Liberado' : '-'}
                    </p>
                  </div>
                </div>
                {post.status === 'VOTING' && (
                  <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm">
                    <Vote className="mr-2 inline h-4 w-4 text-primary" />
                    {currentVoteEntry
                      ? <>Seu voto atual: <strong>{currentVoteEntry.player?.nickname}</strong>. Voce pode alterar o voto escolhendo outro candidato ate alguem bater {STAFF_VOTE_THRESHOLD} votos.</>
                      : <>Voce ainda nao votou nesta rodada. O candidato com {STAFF_VOTE_THRESHOLD} votos fica liberado para entrega.</>}
                  </div>
                )}
                {post.status === 'READY_FOR_DELIVERY' && selectedEntry && (
                  <div className="rounded-md border border-primary/40 bg-primary/10 p-3 text-sm text-primary">
                    <Trophy className="mr-2 inline h-4 w-4" />
                    Liberado para entrega: <strong>{selectedEntry.player?.nickname}</strong>
                  </div>
                )}
                <div className="grid gap-2 md:grid-cols-2">
                  {orderedEntries.map((entry, index) => {
                    const printUrl = displayImageUrl(entry.imageUrl);
                    const isWinner = post.selectedEntryId === entry.id;
                    const isRestrictedOut = restrictedCandidateIds.length > 0 && !restrictedCandidateIds.includes(entry.id);
                    const votes = voteCounts.get(entry.id) ?? 0;
                    const missingVotes = Math.max(0, STAFF_VOTE_THRESHOLD - votes);
                    const isCurrentVote = currentVoteEntryId === entry.id;
                    const isVotingThisEntry = votingEntryId === entry.id && voteInterest.isPending;
                    const auditHref = entry.player?.id ? `/dashboard/staff/item-audit?playerId=${entry.player.id}` : undefined;
                    const voters = voterNames(post, entry);
                    const voteButtonLabel = isVotingThisEntry
                      ? currentVoteEntryId ? 'Alterando...' : 'Votando...'
                      : isCurrentVote ? 'Votado' : currentVoteEntryId ? 'Alterar voto' : 'Votar';

                    return (
                      <div key={entry.id} className={`rounded-md border bg-background/35 p-3 text-sm ${isWinner ? 'border-primary/70' : isCurrentVote ? 'border-cyan-300/60' : ''}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge tone={index === 0 && votes > 0 ? 'gold' : 'muted'}>#{index + 1}</Badge>
                              {auditHref ? (
                                <Link className="font-semibold text-primary underline-offset-4 hover:underline" href={auditHref}>
                                  {entry.player?.nickname}
                                </Link>
                              ) : (
                                <span className="font-semibold">{entry.player?.nickname}</span>
                              )}
                              {isCurrentVote && <Badge tone="blue">Seu voto</Badge>}
                              {isWinner && <Badge tone="gold">Vencedor</Badge>}
                              {entry.dropHistory && <Badge tone="green">{t(locale, 'delivered')}</Badge>}
                              {isRestrictedOut && <Badge tone="muted">Fora do desempate</Badge>}
                            </div>
                            <span className="block text-muted-foreground">
                              {t(locale, 'layer')} {entry.player?.dimensionalLayer} - {t(locale, 'attendance')} {entry.player?.attendancePercentage}%
                            </span>
                            {entry.lootStats && (
                              <div className="mt-2 grid gap-1 rounded-md border border-border/70 bg-background/40 p-2 text-xs text-muted-foreground sm:grid-cols-2">
                                <span>Fila: {entry.lootStats.queueDays} dia(s)</span>
                                <span>Ultimo drop: {entry.lootStats.lastDropAt ? new Date(entry.lootStats.lastDropAt).toLocaleDateString() : 'sem registro'}</span>
                                <span>Mesmo item: {entry.lootStats.sameItemDrops}</span>
                                <span>Mesmo tipo: {entry.lootStats.sameTypeDrops}</span>
                              </div>
                            )}
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-primary">Votos: {voteSummary(post, entry)}</span>
                                <span className="text-muted-foreground">{missingVotes === 0 ? 'Maioria' : `Faltam ${missingVotes}`}</span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-muted">
                                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, (votes / STAFF_VOTE_THRESHOLD) * 100)}%` }} />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Votaram: {voters.length ? voters.join(', ') : 'ninguem ainda'}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant={isCurrentVote ? 'secondary' : 'primary'}
                            disabled={post.status !== 'VOTING' || isRestrictedOut || isCurrentVote || voteInterest.isPending}
                            onClick={() => {
                              setVotingEntryId(entry.id);
                              voteInterest.mutate(
                                { postId: post.id, entryId: entry.id },
                                {
                                  onSuccess: () => notifyToast({ title: currentVoteEntryId ? 'Voto alterado.' : 'Voto registrado.', tone: 'success' }),
                                  onSettled: () => setVotingEntryId(undefined),
                                },
                              );
                            }}
                          >
                            <Vote className="h-4 w-4" /> {voteButtonLabel}
                          </Button>
                        </div>
                        {entry.note && <p className="mt-2 text-muted-foreground">{entry.note}</p>}
                        {printUrl && (
                          <div className="mt-3 space-y-2">
                            <a className="block overflow-hidden rounded-md border border-border/80 bg-background/70" href={entry.imageUrl ?? printUrl} target="_blank" rel="noreferrer">
                              <img className="aspect-video w-full object-cover" src={printUrl} alt={`Print ${entry.player?.nickname ?? ''}`} />
                            </a>
                            <a className="text-xs text-primary" href={entry.imageUrl ?? printUrl} target="_blank" rel="noreferrer">{t(locale, 'openPrintNewTab')}</a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button
                    variant="danger"
                    disabled={post.status === 'DELIVERED' || post.status === 'CANCELLED' || cancelInterest.isPending}
                    onClick={() => {
                      const reason = window.prompt(t(locale, 'removeInterestReasonPrompt'))?.trim();
                      if (!reason || !window.confirm(t(locale, 'removeInterestConfirm'))) return;

                      cancelInterest.mutate(
                        { id: post.id, reason },
                        { onSuccess: () => notifyToast({ title: t(locale, 'interestRemoved'), tone: 'success' }) },
                      );
                    }}
                  >
                    {t(locale, 'removeInterest')}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => closeInterest.mutate(post.id, { onSuccess: () => notifyToast({ title: t(locale, 'closeDeclaration'), tone: 'success' }) })}
                    disabled={post.status !== 'OPEN'}
                  >
                    {t(locale, 'closeDeclaration')}
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={!canStartTieBreak || tieBreak.isPending}
                    onClick={() => tieBreak.mutate(post.id, { onSuccess: () => notifyToast({ title: 'Desempate iniciado.', tone: 'success' }) })}
                  >
                    Gerar desempate
                  </Button>
                  <FileUploadButton
                    className="max-w-xs"
                    label={t(locale, 'attachImage')}
                    onFileSelect={(files) => {
                      const file = files?.[0];
                      if (file) uploadImage.mutate(file, { onSuccess: (data) => setProofs((current) => ({ ...current, [post.id]: data.url })) });
                    }}
                  />
                  {proofs[post.id] && <span className="self-center text-xs text-primary">{t(locale, 'proofAttached')}</span>}
                  <Button
                    disabled={!selectedEntry || !proofs[post.id] || post.status !== 'READY_FOR_DELIVERY' || deliverInterest.isPending}
                    onClick={() => selectedEntry && deliverInterest.mutate(
                      { id: post.id, entryIds: [selectedEntry.id], proofImageUrl: proofs[post.id] },
                      {
                        onSuccess: () => {
                          setProofs((current) => ({ ...current, [post.id]: '' }));
                          notifyToast({ title: t(locale, 'delivered'), tone: 'success' });
                        },
                      },
                    )}
                  >
                    <CheckCircle2 className="h-4 w-4" /> {t(locale, 'markDelivered')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
