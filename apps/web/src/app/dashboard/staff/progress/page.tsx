'use client';

import { useState } from 'react';
import { AuthGuard } from '@/components/guards/auth-guard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { notifyToast } from '@/components/ui/toaster';
import { useApproveProgressReview, useCommentProgress, usePendingProgressReviews, useRejectProgressReview } from '@/hooks/use-guild-api';
import { progressCategoryLabel } from '@/lib/game-labels';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';

export default function StaffProgressReviewPage() {
  const reviews = usePendingProgressReviews();
  const locale = useLocaleStore((state) => state.locale);
  const approve = useApproveProgressReview();
  const reject = useRejectProgressReview();
  const commentProgress = useCommentProgress();
  const [forms, setForms] = useState<Record<string, { combatPower: string; dimensionalLayer: string; reviewNote: string }>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  function updateForm(id: string, patch: Partial<{ combatPower: string; dimensionalLayer: string; reviewNote: string }>) {
    setForms((current) => ({
      ...current,
      [id]: {
        ...(current[id] ?? { combatPower: '', dimensionalLayer: '', reviewNote: '' }),
        ...patch,
      },
    }));
  }

  return (
    <AuthGuard roles={['STAFF', 'ADMIN']}>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase text-primary">{t(locale, 'progressReview')}</p>
          <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'statusAndRift')}</h1>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {(reviews.data ?? []).map((review) => {
            const form = forms[review.id] ?? { combatPower: String(review.combatPower ?? ''), dimensionalLayer: String(review.dimensionalLayer ?? ''), reviewNote: '' };
            const urls = review.imageUrls?.length ? review.imageUrls : review.imageUrl ? [review.imageUrl] : [];
            return (
              <Card key={review.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{review.player?.nickname ?? 'Player'}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">{progressCategoryLabel(review.category, locale)}</p>
                    </div>
                    <Badge tone="gold">{review.reviewStatus}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {urls.map((url, index) => (
                      <a key={url} className="text-sm text-primary" href={url} target="_blank" rel="noreferrer">Print {index + 1}</a>
                    ))}
                  </div>
                  {review.note ? <p className="text-sm text-muted-foreground">{review.note}</p> : null}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input placeholder={t(locale, 'confirmedCp')} value={form.combatPower} onChange={(event) => updateForm(review.id, { combatPower: event.target.value })} />
                    <Input placeholder={t(locale, 'confirmedFloor')} value={form.dimensionalLayer} onChange={(event) => updateForm(review.id, { dimensionalLayer: event.target.value })} />
                  </div>
                  <Input placeholder={t(locale, 'staffNote')} value={form.reviewNote} onChange={(event) => updateForm(review.id, { reviewNote: event.target.value })} />
                  <div className="rounded-md border bg-background/40 p-3">
                    <p className="mb-2 font-semibold">{t(locale, 'progressComments')}</p>
                    <div className="space-y-2">
                      {(review.comments ?? []).map((comment) => (
                        <div key={comment.id} className="rounded border bg-background/35 p-2 text-sm">
                          <p className="text-xs text-muted-foreground">{comment.author?.discordNickname || comment.author?.discordUsername || 'Staff'} - {new Date(comment.createdAt).toLocaleString()}</p>
                          <p>{comment.body}</p>
                        </div>
                      ))}
                      {(review.comments ?? []).length === 0 && <p className="text-xs text-muted-foreground">{t(locale, 'noObservation')}</p>}
                    </div>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <Input
                        placeholder={t(locale, 'progressCommentPlaceholder')}
                        value={commentDrafts[review.id] ?? ''}
                        onChange={(event) => setCommentDrafts((current) => ({ ...current, [review.id]: event.target.value }))}
                      />
                      <Button
                        disabled={commentProgress.isPending || !(commentDrafts[review.id] ?? '').trim()}
                        onClick={() => commentProgress.mutate(
                          { progressId: review.id, body: commentDrafts[review.id] ?? '' },
                          {
                            onSuccess: () => {
                              setCommentDrafts((current) => ({ ...current, [review.id]: '' }));
                              notifyToast({ title: t(locale, 'progressCommentSent'), tone: 'success' });
                            },
                          },
                        )}
                      >
                        {t(locale, 'addProgressComment')}
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={approve.isPending}
                      onClick={() => approve.mutate(
                        {
                          id: review.id,
                          combatPower: form.combatPower ? Number(form.combatPower) : undefined,
                          dimensionalLayer: form.dimensionalLayer ? Number(form.dimensionalLayer) : undefined,
                          reviewNote: form.reviewNote,
                        },
                        { onSuccess: () => notifyToast({ title: t(locale, 'approve'), tone: 'success' }) },
                      )}
                    >
                      {t(locale, 'approveAndUpdateProfile')}
                    </Button>
                    <Button
                      variant="danger"
                      disabled={reject.isPending}
                      onClick={() => reject.mutate(
                        { id: review.id, reviewNote: form.reviewNote },
                        { onSuccess: () => notifyToast({ title: t(locale, 'reject'), tone: 'success' }) },
                      )}
                    >
                      {t(locale, 'reject')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        {!reviews.isLoading && (reviews.data ?? []).length === 0 && (
          <EmptyState title={t(locale, 'noProgressReviews')}>{t(locale, 'noProgressReviewsHelp')}</EmptyState>
        )}
      </div>
    </AuthGuard>
  );
}
