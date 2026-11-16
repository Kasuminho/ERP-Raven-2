'use client';

import { useState } from 'react';
import {
  AlertCircle,
  Award,
  Check,
  CheckCircle2,
  ExternalLink,
  Flame,
  Gavel,
  History,
  Package,
  RefreshCw,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  User,
  Users,
  X,
  ZoomIn,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { notifyToast } from '@/components/ui/toaster';
import {
  useDeclareLootWinner,
  useDiscordLiveDrops,
  useExpressLootInterest,
  useMyDrops,
  usePublishedAuctionResults,
  type LiveDropItem,
} from '@/hooks/use-drops-api';
import { playerClassLabel } from '@/lib/game-labels';
import { displayImageUrl } from '@/lib/images';
import { useAuthStore } from '@/store/auth-store';
import { useLocaleStore } from '@/store/locale-store';

export default function DropsDistributionPage() {
  const locale = useLocaleStore((state) => state.locale);
  const hasRole = useAuthStore((state) => state.hasRole);
  const isStaff = hasRole(['STAFF', 'ADMIN']);

  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);

  // Vencedor modal
  const [declaringWinner, setDeclaringWinner] = useState<{
    drop: LiveDropItem;
    player: LiveDropItem['interestedPlayers'][0];
  } | null>(null);
  const [winnerNote, setWinnerNote] = useState('');

  // Queries e Mutações
  const liveDrops = useDiscordLiveDrops();
  const declareWinnerMutation = useDeclareLootWinner();
  const expressInterestMutation = useExpressLootInterest();
  const historyDrops = useMyDrops();
  const publishedResults = usePublishedAuctionResults();

  async function handleExpressInterest(drop: LiveDropItem) {
    try {
      await expressInterestMutation.mutateAsync({
        channelId: drop.channelId,
        messageId: drop.messageId,
      });
      notifyToast({
        title: locale === 'en' ? 'Interest registered!' : 'Interesse registrado!',
        description:
          locale === 'en'
            ? 'Reaction ✅ added to Discord message and site pool.'
            : 'Reação ✅ adicionada no Discord e no ranking do site.',
        tone: 'success',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao manifestar interesse.';
      notifyToast({
        title: locale === 'en' ? 'Error' : 'Erro',
        description: msg,
        tone: 'error',
      });
    }
  }

  async function handleConfirmWinner() {
    if (!declaringWinner) return;
    try {
      await declareWinnerMutation.mutateAsync({
        channelId: declaringWinner.drop.channelId,
        messageId: declaringWinner.drop.messageId,
        playerId: declaringWinner.player.playerId!,
        note: winnerNote.trim() || undefined,
      });
      notifyToast({
        title: locale === 'en' ? 'Winner declared!' : 'Vencedor anunciado!',
        description:
          locale === 'en'
            ? `Official reply sent to Discord for ${declaringWinner.player.nickname}.`
            : `Resposta oficial enviada no canal do Discord para ${declaringWinner.player.nickname}.`,
        tone: 'success',
      });
      setDeclaringWinner(null);
      setWinnerNote('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao anunciar vencedor.';
      notifyToast({
        title: locale === 'en' ? 'Error' : 'Erro',
        description: msg,
        tone: 'error',
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-card via-card/90 to-primary/10 p-6 md:p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <Package className="h-3.5 w-3.5" />
              AlcatraZ Loot & Boss Drops
            </div>
            <h1 className="font-[var(--font-cinzel)] text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              {locale === 'en' ? 'Loot & Boss Drop Distribution' : 'Distribuição de Loot & Boss Drops'}
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              {locale === 'en'
                ? 'Live drops synced directly from Discord (#loot-distribution-cp). Players react with ✅ or click below. Winner is automatically ordered by verified Guild CP!'
                : 'Drops sincronizados direto do Discord (#loot-distribution-cp). Reaja com ✅ no Discord ou clique abaixo. A fila de interessados é ordenada automaticamente pelo CP Oficial da guilda!'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 border border-white/10 hover:bg-white/5"
              onClick={() => liveDrops.refetch()}
              disabled={liveDrops.isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${liveDrops.isFetching ? 'animate-spin text-primary' : ''}`} />
              <span>{locale === 'en' ? 'Refresh Drops' : 'Atualizar Drops'}</span>
            </Button>
          </div>
        </div>

        {/* Abas de Navegação */}
        <div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={() => setActiveTab('live')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'live'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
            }`}
          >
            <Flame className="h-4 w-4" />
            <span>{locale === 'en' ? 'Live Drops (Discord)' : 'Drops Ativos (Discord)'}</span>
            {liveDrops.data && (
              <span className="ml-1 rounded-full bg-black/30 px-1.5 py-0.2 text-[10px]">
                {liveDrops.data.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
            }`}
          >
            <History className="h-4 w-4" />
            <span>{locale === 'en' ? 'Delivery History' : 'Histórico de Entregas'}</span>
          </button>
        </div>
      </div>

      {/* Conteúdo Aba 1: Drops Ativos */}
      {activeTab === 'live' && (
        <div className="space-y-6">
          {liveDrops.isLoading && (
            <div className="py-16 text-center text-muted-foreground animate-pulse">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-40 animate-bounce" />
              <p className="text-sm font-semibold">
                {locale === 'en' ? 'Reading drops and Discord reactions...' : 'Lendo drops e reações do canal do Discord...'}
              </p>
            </div>
          )}

          {!liveDrops.isLoading && (!liveDrops.data || liveDrops.data.length === 0) && (
            <div className="rounded-2xl border border-white/10 bg-card/60 p-12 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-30 text-primary" />
              <h3 className="text-base font-bold text-foreground">
                {locale === 'en' ? 'No active drops in #loot-distribution-cp' : 'Nenhum drop ativo no canal #loot-distribution-cp'}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                {locale === 'en'
                  ? 'When Staff posts new item prints on Discord, they will automatically appear here with CP ranking.'
                  : 'Assim que a Staff postar os prints dos novos drops no Discord, eles aparecerão aqui com a ordenação automática de CP.'}
              </p>
            </div>
          )}

          <div className="grid gap-6">
            {(liveDrops.data ?? []).map((drop, dropIdx) => {
              const eligibleCount = drop.interestedPlayers.filter((p) => p.isClassEligible && p.registered).length;

              return (
                <div
                  key={drop.messageId}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-card/80 shadow-xl backdrop-blur-md transition-all hover:border-primary/40"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
                    {/* Imagens do Drop (Prints anexados) */}
                    <div className="lg:col-span-4 flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/20 text-primary text-xs font-black">
                          #{dropIdx + 1}
                        </span>
                        <Badge
                          tone={
                            drop.restriction === 'RANGED'
                              ? 'blue'
                              : drop.restriction === 'MELEE'
                              ? 'red'
                              : drop.restriction === 'DIVINE_CASTER'
                              ? 'gold'
                              : 'green'
                          }
                          className="text-[11px] font-bold"
                        >
                          {drop.restriction === 'RANGED'
                            ? '🏹 RANGED ONLY'
                            : drop.restriction === 'MELEE'
                            ? '⚔️ MELEE ONLY'
                            : drop.restriction === 'DIVINE_CASTER'
                            ? '✨ DIVINE CASTER ONLY'
                            : '🛡️ LIVRE / OPEN'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {drop.images.map((img, i) => (
                          <div
                            key={i}
                            className="group relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black cursor-zoom-in"
                            onClick={() => setZoomUrl(img.url)}
                          >
                            <img
                              src={img.url}
                              alt={`Drop Print ${i + 1}`}
                              className="h-full w-full object-contain transition-transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <ZoomIn className="h-6 w-6 text-white" />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground border-t border-white/5 pt-2">
                        <span>
                          Postado por: <strong className="text-foreground">{drop.authorUsername}</strong>
                        </span>
                        <span>{new Date(drop.postedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      {/* Botão de Tenho Interesse para o Player */}
                      <Button
                        size="sm"
                        className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold gap-2 shadow-md"
                        onClick={() => handleExpressInterest(drop)}
                        disabled={expressInterestMutation.isPending}
                      >
                        <Check className="h-4 w-4" />
                        <span>{locale === 'en' ? 'I Want This Item (React ✅)' : 'Tenho Interesse (Reagir ✅)'}</span>
                      </Button>
                    </div>

                    {/* Fila de Interessados Ordenados por CP */}
                    <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                          <div className="flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-amber-400" />
                            <h3 className="font-bold text-sm text-foreground">
                              {locale === 'en' ? 'Interested Players by CP' : 'Fila de Interessados por CP da Guilda'}
                            </h3>
                            <span className="text-xs text-muted-foreground">({drop.totalReactions} reações no Discord)</span>
                          </div>

                          <span className="text-xs font-semibold text-emerald-400">
                            {eligibleCount} {locale === 'en' ? 'eligible players' : 'jogadores elegíveis'}
                          </span>
                        </div>

                        {/* Tabela de Interessados */}
                        <div className="overflow-x-auto mt-3">
                          <table className="w-full text-left text-xs">
                            <thead className="border-b border-white/10 bg-muted/30 text-[10px] font-bold uppercase text-muted-foreground">
                              <tr>
                                <th className="py-2 px-3 w-12 text-center">Rank</th>
                                <th className="py-2 px-3">Personagem</th>
                                <th className="py-2 px-3 text-center">Guilda</th>
                                <th className="py-2 px-3">Classe</th>
                                <th className="py-2 px-3 text-center font-bold text-foreground">🔥 CP Total</th>
                                <th className="py-2 px-3 text-center">Elegibilidade</th>
                                {isStaff && <th className="py-2 px-3 text-center">Decisão</th>}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-medium">
                              {drop.interestedPlayers.map((player) => {
                                const isTop1Eligible = player.rank === 1 && player.isClassEligible && player.registered;

                                return (
                                  <tr
                                    key={player.discordId}
                                    className={`transition-colors hover:bg-white/[0.02] ${
                                      !player.isClassEligible
                                        ? 'opacity-40 bg-red-950/5'
                                        : isTop1Eligible
                                        ? 'bg-amber-500/10 font-bold'
                                        : ''
                                    }`}
                                  >
                                    {/* Rank */}
                                    <td className="py-2.5 px-3 text-center">
                                      {isTop1Eligible ? (
                                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-500/20 text-amber-300 font-extrabold text-[10px] border border-amber-500/40">
                                          👑
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground font-semibold">#{player.rank}</span>
                                      )}
                                    </td>

                                    {/* Nome */}
                                    <td className="py-2.5 px-3">
                                      {player.registered ? (
                                        <div className="flex items-center gap-1.5">
                                          <strong className="text-foreground">{player.nickname}</strong>
                                          <span className="text-[10px] text-muted-foreground/60 font-normal">
                                            ({player.discordUsername})
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1 text-muted-foreground">
                                          <span>{player.discordUsername}</span>
                                          <Badge tone="muted" className="text-[9px] py-0">
                                            Não cadastrado
                                          </Badge>
                                        </div>
                                      )}
                                    </td>

                                    {/* Guilda */}
                                    <td className="py-2.5 px-3 text-center">
                                      {player.guildName ? (
                                        <Badge
                                          tone={player.guildName === 'AlcatraZ2' ? 'blue' : 'gold'}
                                          className="text-[9px] py-0"
                                        >
                                          {player.guildName}
                                        </Badge>
                                      ) : (
                                        <span className="text-muted-foreground/40">-</span>
                                      )}
                                    </td>

                                    {/* Classe */}
                                    <td className="py-2.5 px-3">
                                      {player.charClass ? (
                                        <span className="text-primary font-medium">
                                          {playerClassLabel(player.charClass, locale)}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground/40">-</span>
                                      )}
                                    </td>

                                    {/* CP Total */}
                                    <td className="py-2.5 px-3 text-center">
                                      {player.combatPower ? (
                                        <span className="font-extrabold text-emerald-400">
                                          {player.combatPower.toLocaleString('pt-BR')} CP
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground/40">-</span>
                                      )}
                                    </td>

                                    {/* Elegibilidade */}
                                    <td className="py-2.5 px-3 text-center">
                                      {player.isClassEligible ? (
                                        <Badge tone="green" className="text-[9px] py-0">
                                          Compatível
                                        </Badge>
                                      ) : (
                                        <Badge tone="red" className="text-[9px] py-0">
                                          Classe Incompatível
                                        </Badge>
                                      )}
                                    </td>

                                    {/* Decisão Staff */}
                                    {isStaff && (
                                      <td className="py-2.5 px-3 text-center">
                                        {player.registered && (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className={`h-6 px-2 text-[10px] font-bold gap-1 ${
                                              isTop1Eligible
                                                ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                                            }`}
                                            onClick={() => {
                                              setDeclaringWinner({ drop, player });
                                              setWinnerNote('');
                                            }}
                                          >
                                            <Award className="h-3 w-3" />
                                            <span>Declarar Vencedor</span>
                                          </Button>
                                        )}
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}

                              {drop.interestedPlayers.length === 0 && (
                                <tr>
                                  <td colSpan={isStaff ? 7 : 6} className="py-6 text-center text-muted-foreground text-xs">
                                    Nenhuma reação ✅ registrada no Discord ainda.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Conteúdo Aba 2: Histórico de Entregas */}
      {activeTab === 'history' && (
        <Card className="border-white/10 bg-card/80 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-primary" />
              <span>{locale === 'en' ? 'Delivered Items History' : 'Histórico de Entregas Realizadas'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {(publishedResults.data ?? []).map((result) => {
                const proofUrl = displayImageUrl(result.proofImageUrl);
                const imageUrl = displayImageUrl(result.itemImageUrl);
                return (
                  <article key={result.id} className="overflow-hidden rounded-xl border border-white/10 bg-background/40">
                    {(proofUrl || imageUrl) && (
                      <img
                        className="aspect-video w-full object-cover"
                        src={proofUrl || imageUrl}
                        alt={`Prova de entrega`}
                      />
                    )}
                    <div className="space-y-3 p-4">
                      <div className="flex flex-wrap gap-2">
                        <Badge tone="green">ENTREGUE</Badge>
                        {result.itemTier && <Badge tone="gold">{result.itemTier}</Badge>}
                      </div>
                      <p className="font-bold text-sm text-foreground">{result.itemNamePt}</p>
                      <div className="rounded-lg border border-white/10 bg-card/60 p-2.5 text-xs">
                        <p>
                          Entregue para: <strong className="text-primary">{result.winner.nickname}</strong>
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(result.deliveredAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      {proofUrl && (
                        <a
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-semibold"
                          href={proofUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="h-3 w-3" /> Ver Comprovante
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            {!publishedResults.isLoading && (publishedResults.data ?? []).length === 0 && (
              <div className="py-12 text-center text-muted-foreground text-xs">
                Nenhum histórico publicado no momento.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal de Confirmação para Declarar Vencedor (Staff) */}
      {declaringWinner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-amber-500/40 bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Award className="h-5 w-5" />
                <h3 className="text-lg font-bold text-foreground">Declarar Vencedor do Drop</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeclaringWinner(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              Confirmar <strong className="text-foreground">{declaringWinner.player.nickname}</strong> com{' '}
              <strong className="text-emerald-400">
                {(declaringWinner.player.combatPower ?? 0).toLocaleString('pt-BR')} CP
              </strong>{' '}
              como vencedor deste drop?
            </p>

            <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-xs text-muted-foreground space-y-1">
              <p>
                📢 <strong>Aviso automático no Discord:</strong>
              </p>
              <p className="text-[11px]">
                O bot responderá diretamente à mensagem do post no canal <strong>#loot-distribution-cp</strong> mencionando o jogador com o CP aprovado.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Observação Adicional (Opcional)</label>
              <Input
                value={winnerNote}
                onChange={(e) => setWinnerNote(e.target.value)}
                placeholder="Ex: Entregue no baú, pegar com Vagner..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <Button variant="ghost" onClick={() => setDeclaringWinner(null)} disabled={declareWinnerMutation.isPending}>
                Cancelar
              </Button>
              <Button
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold"
                onClick={handleConfirmWinner}
                disabled={declareWinnerMutation.isPending}
              >
                {declareWinnerMutation.isPending ? 'Anunciando...' : 'Confirmar e Postar no Discord'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox para Imagem Ampliada */}
      {zoomUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md cursor-zoom-out"
          onClick={() => setZoomUrl(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <img
              src={zoomUrl}
              alt="Drop Print"
              className="max-h-[85vh] w-auto rounded-xl border border-white/20 object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setZoomUrl(null)}
              className="absolute -top-3 -right-3 rounded-full bg-primary text-primary-foreground p-1 shadow-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
