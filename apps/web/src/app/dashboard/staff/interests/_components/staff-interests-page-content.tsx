'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CheckCircle2, ShieldAlert, Sparkles, Trophy, Users, Vote, AlertTriangle, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { FileUploadButton } from '@/components/ui/file-upload-button';
import { Input } from '@/components/ui/input';
import { notifyToast } from '@/components/ui/toaster';
import {
  useCancelItemInterest,
  useCloseItemInterest,
  useDecideItemInterest,
  useDeliverItemInterest,
  useStaffItemInterests,
  useStartItemInterestTieBreak,
  useVoteItemInterest,
} from '@/hooks/use-items-api';
import { useUploadImage } from '@/hooks/use-profile-api';
import { displayImageUrl } from '@/lib/images';
import { t } from '@/lib/i18n';
import { useAuthStore } from '@/store/auth-store';
import { useLocaleStore } from '@/store/locale-store';
import type { ItemInterestEntry, ItemInterestPost, ItemType } from '@/types/api';
import { StaffInterestFilters } from './staff-interest-filters';

function sortedEntriesByCombatPower(post: ItemInterestPost): ItemInterestEntry[] {
  return [...(post.entries ?? [])].sort((first, second) => {
    const cpFirst = first.player?.combatPower ?? first.staffComparison?.combatPower ?? 0;
    const cpSecond = second.player?.combatPower ?? second.staffComparison?.combatPower ?? 0;
    const cpDiff = cpSecond - cpFirst;

    if (cpDiff !== 0) return cpDiff;

    const attFirst = first.player?.attendancePercentage ?? first.staffComparison?.attendancePercentage ?? 0;
    const attSecond = second.player?.attendancePercentage ?? second.staffComparison?.attendancePercentage ?? 0;
    const attDiff = attSecond - attFirst;

    if (attDiff !== 0) return attDiff;

    return new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime();
  });
}

function localDateKey(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}

function shortDate(value?: string | null): string {
  return value ? new Date(value).toLocaleDateString('pt-BR') : 'sem registro';
}

function truncate(value: string, max = 90): string {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function StaffComparisonTable({
  entries,
  presenceMap,
  onTogglePresence,
}: {
  entries: ItemInterestEntry[];
  presenceMap: Record<string, boolean>;
  onTogglePresence: (entryId: string) => void;
}) {
  const comparable = entries.filter((entry) => entry.staffComparison || entry.player);

  if (comparable.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto rounded-md border bg-background/35">
      <table className="w-full min-w-[960px] text-left text-xs">
        <thead className="border-b bg-muted/30 text-muted-foreground">
          <tr>
            <th className="p-2 font-semibold">Rank CP</th>
            <th className="p-2 font-semibold">Player</th>
            <th className="p-2 font-semibold">Classe</th>
            <th className="p-2 font-semibold">Combat Power</th>
            <th className="p-2 font-semibold">Presença no Boss</th>
            <th className="p-2 font-semibold">Alerta de Tier / Slot</th>
            <th className="p-2 font-semibold">DKP / Frequência</th>
            <th className="p-2 font-semibold">Último Drop</th>
          </tr>
        </thead>
        <tbody>
          {comparable.map((entry, index) => {
            const comparison = entry.staffComparison;
            const cp = entry.player?.combatPower ?? comparison?.combatPower ?? 0;
            const isPresent = presenceMap[entry.id] ?? true;
            const isTop1 = index === 0;

            return (
              <tr key={entry.id} className={`border-b last:border-0 ${isTop1 ? 'bg-amber-500/5' : ''}`}>
                <td className="p-2 font-bold">
                  {isTop1 ? (
                    <span className="text-amber-400 font-bold flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" /> #1
                    </span>
                  ) : (
                    <span className="text-muted-foreground">#{index + 1}</span>
                  )}
                </td>
                <td className="p-2 font-semibold text-primary">{entry.player?.nickname}</td>
                <td className="p-2">{entry.player?.class ?? comparison?.playerClass ?? 'N/A'}</td>
                <td className="p-2 font-tabular font-bold text-emerald-400">
                  {cp > 0 ? `${cp.toLocaleString('pt-BR')} CP` : 'Sem print'}
                </td>
                <td className="p-2">
                  <button
                    type="button"
                    onClick={() => onTogglePresence(entry.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                      isPresent
                        ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                    }`}
                  >
                    {isPresent ? (
                      <>
                        <Check className="h-3 w-3" /> Presente
                      </>
                    ) : (
                      <>
                        <X className="h-3 w-3" /> Ausente
                      </>
                    )}
                  </button>
                </td>
                <td className="p-2">
                  {comparison?.hasSuperiorOrSameTier ? (
                    <span className="inline-flex items-center gap-1 text-amber-300 font-medium">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      {comparison.tierWarning ?? 'Já tem item equivalente'}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Sem alerta de tier</span>
                  )}
                </td>
                <td className="p-2">
                  {Math.round(entry.player?.attendancePercentage ?? comparison?.attendancePercentage ?? 0)}%
                  {comparison ? ` • ${comparison.availableDkp} DKP` : ''}
                </td>
                <td className="p-2 text-muted-foreground">
                  {shortDate(comparison?.recentLoot.lastDropAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function StaffInterestsPageContent() {
  const locale = useLocaleStore((state) => state.locale);
  const userId = useAuthStore((state) => state.userId);
  const posts = useStaffItemInterests();
  const closeInterest = useCloseItemInterest();
  const cancelInterest = useCancelItemInterest();
  const decideInterest = useDecideItemInterest();
  const deliverInterest = useDeliverItemInterest();
  const tieBreak = useStartItemInterestTieBreak();
  const uploadImage = useUploadImage();

  const [proofs, setProofs] = useState<Record<string, string>>({});
  const [presenceMap, setPresenceMap] = useState<Record<string, boolean>>({});
  const [showResolved, setShowResolved] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'ALL' | ItemType>('ALL');
  const [createdDateFilter, setCreatedDateFilter] = useState('');
  const [confirmation, setConfirmation] = useState<{ kind: 'cancel' | 'deliver'; postId: string; entryId?: string }>();
  const [cancelReason, setCancelReason] = useState('');

  // Modal de justificativa de decisão ágil
  const [decisionModal, setDecisionModal] = useState<{
    open: boolean;
    post?: ItemInterestPost;
    entry?: ItemInterestEntry;
    topEntry?: ItemInterestEntry;
    reason: string;
    isManualReason: boolean;
  }>({
    open: false,
    reason: '',
    isManualReason: false,
  });

  function togglePresence(entryId: string) {
    setPresenceMap((prev) => ({
      ...prev,
      [entryId]: prev[entryId] !== undefined ? !prev[entryId] : false,
    }));
  }

  const postsToRender = useMemo(
    () => (posts.data ?? [])
      .filter((post) => showResolved || !['DELIVERED', 'CANCELLED'].includes(post.status))
      .filter((post) => typeFilter === 'ALL' || post.itemCatalog?.itemType === typeFilter)
      .filter((post) => !createdDateFilter || localDateKey(post.createdAt) === createdDateFilter),
    [createdDateFilter, posts.data, showResolved, typeFilter],
  );

  function handleSelectWinner(post: ItemInterestPost, entry: ItemInterestEntry, topEntry?: ItemInterestEntry) {
    const isPresent = presenceMap[entry.id] ?? true;
    const isTop1 = topEntry ? entry.id === topEntry.id : true;
    const topIsPresent = topEntry ? (presenceMap[topEntry.id] ?? true) : true;
    const topHasWarning = topEntry?.staffComparison?.hasSuperiorOrSameTier;

    // Se estiver escolhendo alguém com CP inferior ao topo da lista, abrir modal de justificativa transparente
    if (!isTop1) {
      let defaultReason = 'Decisão de liderança por mérito de build';
      if (!topIsPresent) {
        defaultReason = `Top 1 CP (${topEntry?.player?.nickname}) não estava presente no boss`;
      } else if (topHasWarning) {
        defaultReason = `Top 1 CP (${topEntry?.player?.nickname}) já possui item deste tier ou superior`;
      }

      setDecisionModal({
        open: true,
        post,
        entry,
        topEntry,
        reason: defaultReason,
        isManualReason: false,
      });
      return;
    }

    // Se o Top 1 estiver ausente no boss
    if (!isPresent) {
      setDecisionModal({
        open: true,
        post,
        entry,
        topEntry,
        reason: 'Jogador marcado como ausente no boss pelo líder',
        isManualReason: false,
      });
      return;
    }

    // Caso normal (Top CP presente e regular): confirma direto
    decideInterest.mutate(
      { postId: post.id, entryId: entry.id, reason: 'Critério: Maior Combat Power e presença confirmada no boss' },
      {
        onSuccess: () => {
          notifyToast({
            title: 'Drop liberado para entrega!',
            description: `${entry.player?.nickname} foi selecionado como vencedor.`,
            tone: 'success',
          });
        },
      },
    );
  }

  function confirmDecisionWithReason() {
    if (!decisionModal.post || !decisionModal.entry) return;

    decideInterest.mutate(
      {
        postId: decisionModal.post.id,
        entryId: decisionModal.entry.id,
        reason: decisionModal.reason.trim() || 'Critério de liderança e rotação de loot',
      },
      {
        onSuccess: () => {
          notifyToast({
            title: 'Decisão registrada e entrega liberada!',
            description: `${decisionModal.entry?.player?.nickname} selecionado. Motivo registrado para o Discord.`,
            tone: 'success',
          });
          setDecisionModal({ open: false, reason: '', isManualReason: false });
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">{t(locale, 'staffLootDesk')}</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'interestPosts')}</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Gestão ágil de drops por Combat Power e presença no boss. Escolha o recebedor com 1 clique, anexe o print do jogo e a notificação será postada no Discord com total transparência.
        </p>
      </div>

      <StaffInterestFilters
        locale={locale}
        typeFilter={typeFilter}
        createdDateFilter={createdDateFilter}
        showResolved={showResolved}
        onTypeFilterChange={setTypeFilter}
        onCreatedDateFilterChange={setCreatedDateFilter}
        onShowResolvedChange={setShowResolved}
        onClear={() => {
          setTypeFilter('ALL');
          setCreatedDateFilter('');
          setShowResolved(false);
        }}
      />

      <div className="space-y-4">
        {postsToRender.map((post) => {
          const orderedEntries = sortedEntriesByCombatPower(post);
          const topEntry = orderedEntries[0];
          const selectedEntry = (post.entries ?? []).find((entry) => entry.id === post.selectedEntryId);

          return (
            <Card key={post.id} className="border-white/10 bg-card/60 backdrop-blur-md">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      {post.title}
                      {post.itemCatalog?.category && (
                        <Badge tone="muted" className="text-xs">
                          {post.itemCatalog.category} {post.itemCatalog.itemTier ? `• ${post.itemCatalog.itemTier}` : ''}
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {post.mode} &bull; {t(locale, 'closesAt')} {new Date(post.closesAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge tone={post.status === 'OPEN' ? 'green' : post.status === 'READY_FOR_DELIVERY' ? 'gold' : post.status === 'DELIVERED' ? 'blue' : 'muted'}>
                    {post.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Status Bar */}
                <div className="grid gap-3 rounded-md border border-white/10 bg-background/40 p-3 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Interessados Cadastrados</p>
                    <p className="text-lg font-bold text-foreground">{post.entries?.length ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Maior CP da Fila</p>
                    <p className="text-lg font-bold text-emerald-400">
                      {topEntry?.player?.combatPower
                        ? `${topEntry.player.combatPower.toLocaleString('pt-BR')} CP (${topEntry.player.nickname})`
                        : 'Nenhum participante'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Status do Drop</p>
                    <p className="text-lg font-bold text-foreground">
                      {post.status === 'READY_FOR_DELIVERY' ? (
                        <span className="text-amber-400 flex items-center gap-1">
                          <Trophy className="h-4 w-4" /> Pronto para Entrega
                        </span>
                      ) : post.status === 'DELIVERED' ? (
                        <span className="text-blue-400 flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" /> Entregue
                        </span>
                      ) : (
                        'Aberto para Decisão'
                      )}
                    </p>
                  </div>
                </div>

                {/* Banner do Vencedor Escolhido */}
                {post.status === 'READY_FOR_DELIVERY' && selectedEntry && (
                  <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-amber-300 font-bold text-base">
                          <Trophy className="h-5 w-5" /> Vencedor Selecionado: {selectedEntry.player?.nickname}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Classe: {selectedEntry.player?.class} &bull; Combat Power: {selectedEntry.player?.combatPower?.toLocaleString('pt-BR') ?? 'N/A'} CP
                        </p>
                        {post.selectionReason && (
                          <p className="mt-2 rounded bg-black/30 p-2 text-xs text-amber-200">
                            <strong>Critério da Liderança:</strong> {post.selectionReason}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tabela de Comparação Completa */}
                <StaffComparisonTable
                  entries={orderedEntries}
                  presenceMap={presenceMap}
                  onTogglePresence={togglePresence}
                />

                {/* Cards dos Candidatos com Botão de Decisão */}
                <div className="grid gap-3 md:grid-cols-2">
                  {orderedEntries.map((entry, index) => {
                    const printUrl = displayImageUrl(entry.imageUrl);
                    const comparison = entry.staffComparison;
                    const isWinner = post.selectedEntryId === entry.id;
                    const cp = entry.player?.combatPower ?? comparison?.combatPower ?? 0;
                    const isPresent = presenceMap[entry.id] ?? true;
                    const isTop1 = index === 0;

                    return (
                      <div
                        key={entry.id}
                        className={`rounded-lg border p-3.5 text-sm transition-all ${
                          isWinner
                            ? 'border-amber-400 bg-amber-500/10 ring-1 ring-amber-400/50'
                            : isTop1
                            ? 'border-primary/40 bg-background/50 hover:border-primary/60'
                            : 'border-white/10 bg-background/30 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge tone={isTop1 ? 'gold' : 'muted'} className="font-bold">
                                #{index + 1}
                              </Badge>
                              <span className="font-bold text-foreground text-base">
                                {entry.player?.nickname}
                              </span>
                              <Badge tone="blue" className="text-xs">
                                {entry.player?.class ?? comparison?.playerClass}
                              </Badge>
                              {isTop1 && (
                                <Badge tone="gold" className="text-xs">
                                  👑 TOP 1 CP
                                </Badge>
                              )}
                              {isWinner && (
                                <Badge tone="gold" className="text-xs">
                                  🏆 Vencedor
                                </Badge>
                              )}
                              {entry.isTransmuteRequest && (
                                <Badge tone="muted" className="text-xs">
                                  Transmutar
                                </Badge>
                              )}
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                              <span className="font-tabular font-bold text-emerald-400 text-sm">
                                {cp > 0 ? `${cp.toLocaleString('pt-BR')} CP` : 'Sem CP'}
                              </span>
                              <span className="text-muted-foreground">
                                Presença: {Math.round(entry.player?.attendancePercentage ?? comparison?.attendancePercentage ?? 0)}%
                              </span>
                              <span className="text-muted-foreground">
                                DKP: {comparison?.availableDkp ?? 0}
                              </span>
                            </div>

                            {/* Alerta de Tier / Slot */}
                            {comparison?.hasSuperiorOrSameTier && (
                              <div className="mt-2 rounded border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-300">
                                <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
                                {comparison.tierWarning}
                              </div>
                            )}

                            {/* Switch de Presença no Boss */}
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Presença no boss:</span>
                              <button
                                type="button"
                                onClick={() => togglePresence(entry.id)}
                                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ${
                                  isPresent
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-rose-500/20 text-rose-400'
                                }`}
                              >
                                {isPresent ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                {isPresent ? 'Presente' : 'Ausente'}
                              </button>
                            </div>
                          </div>

                          {/* Botão de Decisão Rápida */}
                          {post.status !== 'DELIVERED' && post.status !== 'CANCELLED' && (
                            <Button
                              size="sm"
                              variant={isWinner ? 'secondary' : isTop1 ? 'primary' : 'secondary'}
                              disabled={isWinner || decideInterest.isPending}
                              onClick={() => handleSelectWinner(post, entry, topEntry)}
                              className="shrink-0 gap-1.5"
                            >
                              <Trophy className="h-3.5 w-3.5" />
                              {isWinner ? 'Selecionado' : 'Escolher'}
                            </Button>
                          )}
                        </div>

                        {/* Print do Jogador */}
                        {printUrl && (
                          <div className="mt-3">
                            <a
                              className="block overflow-hidden rounded border border-white/10 bg-black/40"
                              href={entry.imageUrl ?? printUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <img className="aspect-video w-full object-cover" src={printUrl} alt={`Print de ${entry.player?.nickname}`} />
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Barra de Ações Inferiores (Encerrar, Cancelar, Entregar com Comprovante) */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={post.status === 'DELIVERED' || post.status === 'CANCELLED' || cancelInterest.isPending}
                      onClick={() => setConfirmation({ kind: 'cancel', postId: post.id })}
                    >
                      {t(locale, 'removeInterest')}
                    </Button>
                    {post.status === 'OPEN' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => closeInterest.mutate(post.id, { onSuccess: () => notifyToast({ title: 'Declaração fechada para lances.', tone: 'success' }) })}
                      >
                        Fechar Inscrições
                      </Button>
                    )}
                  </div>

                  {/* Fluxo de Entrega com Print do Jogo */}
                  {post.status === 'READY_FOR_DELIVERY' && selectedEntry && (
                    <div className="flex flex-wrap items-center gap-3">
                      <FileUploadButton
                        className="max-w-xs"
                        label={proofs[post.id] ? 'Trocar Comprovante' : '📸 Anexar Print do Jogo'}
                        onFileSelect={(files) => {
                          const file = files?.[0];
                          if (file) {
                            uploadImage.mutate(file, {
                              onSuccess: (data) => {
                                setProofs((curr) => ({ ...curr, [post.id]: data.url }));
                                notifyToast({ title: 'Comprovante anexado!', tone: 'success' });
                              },
                            });
                          }
                        }}
                      />
                      {proofs[post.id] && (
                        <span className="text-xs text-emerald-400 font-semibold">
                          Print anexado ✓
                        </span>
                      )}
                      <Button
                        disabled={!proofs[post.id] || deliverInterest.isPending}
                        onClick={() => setConfirmation({ kind: 'deliver', postId: post.id, entryId: selectedEntry.id })}
                        className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Marcar como Entregue
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modal de Justificativa de Seleção (Anti-panelinha) */}
      <ConfirmationDialog
        open={decisionModal.open}
        title="Justificativa de Seleção do Drop"
        description={`Você está selecionando ${decisionModal.entry?.player?.nickname} (${decisionModal.entry?.player?.combatPower ?? 0} CP) em vez do Top CP (${decisionModal.topEntry?.player?.nickname} - ${decisionModal.topEntry?.player?.combatPower ?? 0} CP). Este motivo ficará registrado e visível no Discord para toda a guilda.`}
        confirmLabel="Confirmar e Liberar Entrega"
        pending={decideInterest.isPending}
        tone="primary"
        onClose={() => setDecisionModal({ open: false, reason: '', isManualReason: false })}
        onConfirm={confirmDecisionWithReason}
      >
        <div className="space-y-3 pt-2">
          <p className="text-xs uppercase font-semibold text-muted-foreground">Escolha rápida do motivo:</p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className={`rounded-md border p-2.5 text-left text-xs transition-colors ${
                decisionModal.reason.includes('não estava presente')
                  ? 'border-primary bg-primary/20 text-white'
                  : 'border-white/10 bg-background/50 text-muted-foreground hover:bg-white/5'
              }`}
              onClick={() =>
                setDecisionModal((curr) => ({
                  ...curr,
                  reason: `Top 1 CP (${curr.topEntry?.player?.nickname}) não estava presente no boss`,
                  isManualReason: false,
                }))
              }
            >
              🎯 Top 1 CP ({decisionModal.topEntry?.player?.nickname}) não estava presente no boss
            </button>

            <button
              type="button"
              className={`rounded-md border p-2.5 text-left text-xs transition-colors ${
                decisionModal.reason.includes('já possui item')
                  ? 'border-primary bg-primary/20 text-white'
                  : 'border-white/10 bg-background/50 text-muted-foreground hover:bg-white/5'
              }`}
              onClick={() =>
                setDecisionModal((curr) => ({
                  ...curr,
                  reason: `Top 1 CP (${curr.topEntry?.player?.nickname}) já possui item deste tier ou superior no mesmo slot`,
                  isManualReason: false,
                }))
              }
            >
              🛡️ Top 1 CP ({decisionModal.topEntry?.player?.nickname}) já possui item deste tier ou superior
            </button>

            <button
              type="button"
              className={`rounded-md border p-2.5 text-left text-xs transition-colors ${
                decisionModal.isManualReason
                  ? 'border-primary bg-primary/20 text-white'
                  : 'border-white/10 bg-background/50 text-muted-foreground hover:bg-white/5'
              }`}
              onClick={() =>
                setDecisionModal((curr) => ({
                  ...curr,
                  isManualReason: true,
                  reason: '',
                }))
              }
            >
              ✍️ Outro motivo personalizado
            </button>
          </div>

          <label className="block space-y-1 pt-2">
            <span className="text-xs uppercase text-muted-foreground">Texto da justificativa:</span>
            <Input
              value={decisionModal.reason}
              onChange={(e) => setDecisionModal((curr) => ({ ...curr, reason: e.target.value }))}
              placeholder="Ex: Não estava na chamada de voz do boss / Já possui bota T4"
            />
          </label>
        </div>
      </ConfirmationDialog>

      {/* Dialog de Cancelamento de Post */}
      <ConfirmationDialog
        open={confirmation?.kind === 'cancel'}
        title={t(locale, 'removeInterest')}
        description={t(locale, 'removeInterestConfirm')}
        confirmLabel={t(locale, 'removeInterest')}
        pending={cancelInterest.isPending}
        onClose={() => { setConfirmation(undefined); setCancelReason(''); }}
        onConfirm={() => {
          if (confirmation?.kind !== 'cancel' || !cancelReason.trim()) return;
          cancelInterest.mutate(
            { id: confirmation.postId, reason: cancelReason.trim() },
            {
              onSuccess: () => {
                setConfirmation(undefined);
                setCancelReason('');
                notifyToast({ title: t(locale, 'interestRemoved'), tone: 'success' });
              },
            },
          );
        }}
      >
        <label className="space-y-1 text-sm">
          <span className="text-xs uppercase text-muted-foreground">Motivo obrigatório</span>
          <Input value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder={t(locale, 'removeInterestReasonPrompt')} />
        </label>
      </ConfirmationDialog>

      {/* Dialog de Confirmação de Entrega */}
      <ConfirmationDialog
        open={confirmation?.kind === 'deliver'}
        title="Confirmar Entrega do Drop e Notificar Discord?"
        description="O item será marcado como entregue. O comprovante anexado será publicado no Discord da guilda junto com os dados do recebedor e o critério adotado."
        confirmLabel="Confirmar Entrega"
        pending={deliverInterest.isPending}
        tone="primary"
        onClose={() => setConfirmation(undefined)}
        onConfirm={() => {
          if (confirmation?.kind !== 'deliver' || !confirmation.entryId || !proofs[confirmation.postId]) return;
          deliverInterest.mutate(
            { id: confirmation.postId, entryIds: [confirmation.entryId], proofImageUrl: proofs[confirmation.postId] },
            {
              onSuccess: () => {
                setProofs((current) => ({ ...current, [confirmation.postId]: '' }));
                setConfirmation(undefined);
                notifyToast({ title: 'Drop entregue e registrado no Discord!', tone: 'success' });
              },
            },
          );
        }}
      />
    </div>
  );
}
