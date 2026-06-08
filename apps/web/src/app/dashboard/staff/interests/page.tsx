'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Trophy, Vote } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUploadButton } from '@/components/ui/file-upload-button';
import { notifyToast } from '@/components/ui/toaster';
import { useCloseItemInterest, useDeliverItemInterest, useItemInterests, useStartItemInterestTieBreak, useUploadImage, useVoteItemInterest } from '@/hooks/use-guild-api';
import { displayImageUrl } from '@/lib/images';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';
import type { ItemInterestEntry, ItemInterestPost } from '@/types/api';

const STAFF_VOTE_THRESHOLD = 3;

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

export default function StaffInterestsPage() {
  const locale = useLocaleStore((state) => state.locale);
  const posts = useItemInterests();
  const closeInterest = useCloseItemInterest();
  const deliverInterest = useDeliverItemInterest();
  const voteInterest = useVoteItemInterest();
  const tieBreak = useStartItemInterestTieBreak();
  const uploadImage = useUploadImage();
  const [proofs, setProofs] = useState<Record<string, string>>({});
  const [showResolved, setShowResolved] = useState(false);

  const postsToRender = useMemo(
    () => (posts.data ?? []).filter((post) => showResolved || !['DELIVERED', 'CANCELLED'].includes(post.status)),
    [posts.data, showResolved],
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">{t(locale, 'staffLootDesk')}</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'interestPosts')}</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{t(locale, 'staffInterestsFlowHelp')}</p>
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input className="h-4 w-4 accent-primary" type="checkbox" checked={showResolved} onChange={(event) => setShowResolved(event.target.checked)} />
        {t(locale, 'showResolvedInterests')}
      </label>
      <div className="space-y-4">
        {postsToRender.map((post) => {
          const selectedEntry = (post.entries ?? []).find((entry) => entry.id === post.selectedEntryId);
          const tiedIds = tieCandidateIds(post);
          const canStartTieBreak = post.status === 'VOTING' && tiedIds.length > 1;
          const restrictedCandidateIds = Array.isArray(post.votingCandidateEntryIds) ? post.votingCandidateEntryIds : [];

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
                <p className="text-sm text-muted-foreground">{post.entries?.length ?? 0} {t(locale, 'interestedPlayers')}</p>
                {post.status === 'READY_FOR_DELIVERY' && selectedEntry && (
                  <div className="rounded-md border border-primary/40 bg-primary/10 p-3 text-sm text-primary">
                    <Trophy className="mr-2 inline h-4 w-4" />
                    Liberado para entrega: <strong>{selectedEntry.player?.nickname}</strong>
                  </div>
                )}
                <div className="grid gap-2 md:grid-cols-2">
                  {(post.entries ?? []).map((entry) => {
                    const printUrl = displayImageUrl(entry.imageUrl);
                    const isWinner = post.selectedEntryId === entry.id;
                    const isRestrictedOut = restrictedCandidateIds.length > 0 && !restrictedCandidateIds.includes(entry.id);

                    return (
                      <div key={entry.id} className={`rounded-md border bg-background/35 p-3 text-sm ${isWinner ? 'border-primary/70' : ''}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold">{entry.player?.nickname}</span>
                              {isWinner && <Badge tone="gold">Vencedor</Badge>}
                              {entry.dropHistory && <Badge tone="green">{t(locale, 'delivered')}</Badge>}
                              {isRestrictedOut && <Badge tone="muted">Fora do desempate</Badge>}
                            </div>
                            <span className="block text-muted-foreground">
                              {t(locale, 'layer')} {entry.player?.dimensionalLayer} - {t(locale, 'attendance')} {entry.player?.attendancePercentage}%
                            </span>
                            <span className="mt-1 block text-xs text-primary">Votos: {voteSummary(post, entry)}</span>
                          </div>
                          <Button
                            variant="secondary"
                            disabled={post.status !== 'VOTING' || isRestrictedOut || voteInterest.isPending}
                            onClick={() => voteInterest.mutate(
                              { postId: post.id, entryId: entry.id },
                              { onSuccess: () => notifyToast({ title: 'Voto registrado.', tone: 'success' }) },
                            )}
                          >
                            <Vote className="h-4 w-4" /> Votar
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
