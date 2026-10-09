'use client';

import { useState } from 'react';
import { AuthGuard } from '@/components/guards/auth-guard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { notifyToast } from '@/components/ui/toaster';
import { useApproveProgressReview, useCommentProgress, usePendingProgressReviews, useRejectProgressReview } from '@/hooks/use-profile-api';
import { playerClassLabel, progressCategoryLabel } from '@/lib/game-labels';
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
  const [reviewToReject, setReviewToReject] = useState<string>();
  const [zoomImage, setZoomImage] = useState<string | null>(null);

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
          <p className="mt-1 text-sm text-muted-foreground">
            Validação de prints com OCR do Raven 2: confira a conformidade dos buffs ativos da classe antes de aprovar.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {(reviews.data ?? []).map((review) => {
            const suggestedCp = review.combatPower ?? review.metadata?.calculatedCp;
            const form = forms[review.id] ?? {
              combatPower: suggestedCp ? String(suggestedCp) : '',
              dimensionalLayer: String(review.dimensionalLayer ?? ''),
              reviewNote: '',
            };
            const urls = review.imageUrls?.length ? review.imageUrls : review.imageUrl ? [review.imageUrl] : [];
            const meta = review.metadata;
            const hasOcr = Boolean(meta?.calculatedCp || meta?.attack);

            return (
              <Card key={review.id} className="border-border/60 bg-card/60 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl font-bold">{review.player?.nickname ?? 'Player'}</CardTitle>
                        {review.player?.class ? (
                          <Badge tone="blue">
                            {playerClassLabel(review.player.class, locale)}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {progressCategoryLabel(review.category, locale)} • Enviado em {new Date(review.createdAt).toLocaleString(locale === 'en' ? 'en-US' : 'pt-BR')}
                      </p>
                    </div>
                    <Badge tone="gold">{review.reviewStatus}</Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Visualização de Prints com Lightbox */}
                  <div className="space-y-2">
                    {urls.map((url, index) => (
                      <div key={url} className="group relative overflow-hidden rounded-lg border border-border/80 bg-black/60">
                        <img
                          src={url}
                          alt={`Print ${index + 1} de ${review.player?.nickname}`}
                          className="max-h-[300px] w-full object-contain cursor-zoom-in transition-transform duration-200 group-hover:scale-[1.01]"
                          onClick={() => setZoomImage(url)}
                        />
                        <button
                          type="button"
                          onClick={() => setZoomImage(url)}
                          className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-md bg-black/80 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur hover:bg-black"
                        >
                          🔍 Ampliar / Inspecionar Buffs
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Resumo do OCR do Raven 2 */}
                  {hasOcr ? (
                    <div className="rounded-lg border border-primary/40 bg-primary/10 p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-primary flex items-center gap-1">
                          ⚡ OCR Raven 2 (Soma Automática de CP)
                        </span>
                        <Badge tone="muted" className="text-[10px]">
                          {meta?.source === 'discord_slash_command' ? 'Discord (/status)' : 'Upload Site'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="rounded bg-background/60 p-2 text-center border border-border/50">
                          <span className="text-muted-foreground block text-[10px]">⚔️ ATAQUE</span>
                          <strong className="text-sm font-bold text-foreground">{meta?.attack ?? '-'}</strong>
                        </div>
                        <div className="rounded bg-background/60 p-2 text-center border border-border/50">
                          <span className="text-muted-foreground block text-[10px]">🛡️ DEFESA</span>
                          <strong className="text-sm font-bold text-foreground">{meta?.defense ?? '-'}</strong>
                        </div>
                        <div className="rounded bg-background/60 p-2 text-center border border-border/50">
                          <span className="text-muted-foreground block text-[10px]">🎯 PRECISÃO</span>
                          <strong className="text-sm font-bold text-foreground">{meta?.accuracy ?? '-'}</strong>
                        </div>
                        <div className="rounded bg-primary/20 p-2 text-center border border-primary/50">
                          <span className="text-primary block text-[10px] font-bold">➔ CP SOMADO</span>
                          <strong className="text-sm font-extrabold text-primary">{meta?.calculatedCp?.toLocaleString('pt-BR') ?? '-'}</strong>
                        </div>
                      </div>

                      {meta?.buffCount ? (
                        <p className="text-xs text-muted-foreground pt-1 border-t border-primary/20">
                          🧪 <strong>{meta.buffCount} buffs ativos</strong> detectados na barra horizontal inferior {meta.buffsDescription ? `(${meta.buffsDescription})` : ''}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Alerta Anti-Malandragem / Buffs da Classe */}
                  <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                    <span className="text-base leading-none">⚠️</span>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-amber-200">
                        Inspeção de Buffs ({review.player?.class ? playerClassLabel(review.player.class, locale) : 'Classe'}):
                      </p>
                      <p className="text-amber-300/90 leading-relaxed">
                        Verifique na barra inferior se o jogador não ativou buffs irregulares de suporte de outra classe (ex: Dagger com buff de Healer) ou itens de evento não permitidos para inflar o CP.
                      </p>
                    </div>
                  </div>

                  {review.note ? (
                    <div className="rounded bg-background/50 p-2.5 text-xs text-muted-foreground border">
                      <strong>Nota do jogador:</strong> {review.note}
                    </div>
                  ) : null}

                  {/* Campos de Confirmação da Staff */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">
                        CP Confirmado {hasOcr ? '(pré-digitado pelo OCR)' : ''}:
                      </label>
                      <Input
                        type="number"
                        placeholder={t(locale, 'confirmedCp')}
                        value={form.combatPower}
                        onChange={(event) => updateForm(review.id, { combatPower: event.target.value })}
                        className="font-bold text-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">
                        Andar/Camada Dimensional:
                      </label>
                      <Input
                        type="number"
                        placeholder={t(locale, 'confirmedFloor')}
                        value={form.dimensionalLayer}
                        onChange={(event) => updateForm(review.id, { dimensionalLayer: event.target.value })}
                      />
                    </div>
                  </div>

                  <Input
                    placeholder={t(locale, 'staffNote')}
                    value={form.reviewNote}
                    onChange={(event) => updateForm(review.id, { reviewNote: event.target.value })}
                  />

                  {/* Seção de Comentários / Histórico */}
                  <div className="rounded-lg border bg-background/40 p-3 space-y-2">
                    <p className="font-semibold text-xs text-muted-foreground uppercase">{t(locale, 'progressComments')}</p>
                    <div className="space-y-2 max-h-36 overflow-y-auto">
                      {(review.comments ?? []).map((comment) => (
                        <div key={comment.id} className="rounded border bg-background/50 p-2 text-xs">
                          <p className="text-[10px] text-muted-foreground">
                            {comment.author?.discordNickname || comment.author?.discordUsername || 'Staff'} • {new Date(comment.createdAt).toLocaleString(locale === 'en' ? 'en-US' : 'pt-BR')}
                          </p>
                          <p className="mt-0.5">{comment.body}</p>
                        </div>
                      ))}
                      {(review.comments ?? []).length === 0 && (
                        <p className="text-xs text-muted-foreground">{t(locale, 'noObservation')}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                      <Input
                        placeholder={t(locale, 'progressCommentPlaceholder')}
                        value={commentDrafts[review.id] ?? ''}
                        onChange={(event) => setCommentDrafts((current) => ({ ...current, [review.id]: event.target.value }))}
                        className="text-xs"
                      />
                      <Button
                        size="sm"
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

                  {/* Ações Rápidas de Aprovação/Rejeição */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      disabled={approve.isPending}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 font-bold"
                      onClick={() => approve.mutate(
                        {
                          id: review.id,
                          combatPower: form.combatPower ? Number(form.combatPower) : undefined,
                          dimensionalLayer: form.dimensionalLayer ? Number(form.dimensionalLayer) : undefined,
                          reviewNote: form.reviewNote,
                        },
                        { onSuccess: () => notifyToast({ title: 'Progresso homologado com sucesso!', tone: 'success' }) },
                      )}
                    >
                      {approve.isPending
                        ? 'Aprovando...'
                        : `✅ Aprovar CP (${form.combatPower ? Number(form.combatPower).toLocaleString('pt-BR') : 'Definido'})`}
                    </Button>

                    <Button
                      variant="danger"
                      disabled={reject.isPending}
                      onClick={() => setReviewToReject(review.id)}
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

        {/* Modal de Rejeição */}
        <ConfirmationDialog
          open={Boolean(reviewToReject)}
          title="Rejeitar atualização de progresso?"
          description="A atualização não será aplicada ao perfil do player. A nota preenchida será enviada como justificativa (ex: buffs indevidos)."
          confirmLabel={t(locale, 'reject')}
          pending={reject.isPending}
          onClose={() => setReviewToReject(undefined)}
          onConfirm={() => {
            if (!reviewToReject) return;
            reject.mutate(
              { id: reviewToReject, reviewNote: forms[reviewToReject]?.reviewNote ?? '' },
              { onSuccess: () => {
                setReviewToReject(undefined);
                notifyToast({ title: t(locale, 'reject'), tone: 'success' });
              } },
            );
          }}
        />

        {/* Lightbox / Zoom da Imagem do Jogo */}
        {zoomImage ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm cursor-zoom-out"
            onClick={() => setZoomImage(null)}
          >
            <div className="relative max-h-[92vh] max-w-[94vw] overflow-auto rounded-lg border border-border bg-background p-2" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between pb-2 px-1 border-b">
                <span className="text-xs font-semibold text-muted-foreground">
                  🔍 Inspeção Detalhada de HUD e Buffs (Raven 2)
                </span>
                <button
                  type="button"
                  onClick={() => setZoomImage(null)}
                  className="rounded px-2 py-0.5 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  ✕ Fechar
                </button>
              </div>
              <img
                src={zoomImage}
                alt="Zoom do print"
                className="mt-2 max-h-[82vh] w-auto max-w-full object-contain rounded"
              />
            </div>
          </div>
        ) : null}
      </div>
    </AuthGuard>
  );
}
