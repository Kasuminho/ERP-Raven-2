'use client';

import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  History,
  Image as ImageIcon,
  Package,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Upload,
  User,
  Users,
  X,
  ZoomIn,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { notifyToast } from '@/components/ui/toaster';
import {
  useCreateManualDrop,
  useDeliveredDrops,
  usePlayerDrops,
} from '@/hooks/use-drops-api';
import {
  useCreateItemInterest,
  useDeclareItemInterest,
  useDeliverItemInterest,
  useItemInterests,
  useItems,
  useStaffItemInterests,
} from '@/hooks/use-items-api';
import { useUploadImage } from '@/hooks/use-profile-api';
import { displayImageUrl } from '@/lib/images';
import { itemName, playerClassLabel } from '@/lib/game-labels';
import { useAuthStore } from '@/store/auth-store';
import { useLocaleStore } from '@/store/locale-store';
import type { ItemCatalog, ItemInterestEntry, ItemInterestPost } from '@/types/api';

export default function DropsDistributionPage() {
  const locale = useLocaleStore((state) => state.locale);
  const hasRole = useAuthStore((state) => state.hasRole);
  const currentPlayerId = useAuthStore((state) => state.playerId);
  const isStaff = hasRole(['STAFF', 'ADMIN']);

  const [activeTab, setActiveTab] = useState<'open' | 'delivered'>('open');
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);

  // Queries
  const playerInterests = useItemInterests('OPEN');
  const staffInterests = useStaffItemInterests('OPEN');
  const allDeliveredDrops = useDeliveredDrops();
  const catalog = useItems();

  // Mutations
  const createDropMutation = useCreateItemInterest();
  const declareInterestMutation = useDeclareItemInterest();
  const deliverMutation = useDeliverItemInterest();
  const uploadImageMutation = useUploadImage();
  const manualDropMutation = useCreateManualDrop();

  // Estados de Modais
  const [isNewDropModalOpen, setIsNewDropModalOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<ItemCatalog | null>(null);
  const [dropMode, setDropMode] = useState<'PvE' | 'PvP'>('PvE');
  const [dropDurationHours, setDropDurationHours] = useState<number>(2);
  const [customClosesAt, setCustomClosesAt] = useState<string>('');

  // Modal de Entrega (Staff)
  const [deliveringPost, setDeliveringPost] = useState<ItemInterestPost | null>(null);
  const [selectedWinnerEntry, setSelectedWinnerEntry] = useState<ItemInterestEntry | null>(null);
  const [deliveryProofUrl, setDeliveryProofUrl] = useState('');
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  // Modal de Histórico de Jogador
  const [inspectedPlayerId, setInspectedPlayerId] = useState<string | null>(null);
  const [inspectedPlayerName, setInspectedPlayerName] = useState<string>('');
  const playerDropsQuery = usePlayerDrops(inspectedPlayerId || undefined);

  // Lançamento manual retroativo dentro do modal de histórico
  const [isAddingManualDrop, setIsAddingManualDrop] = useState(false);
  const [manualItemName, setManualItemName] = useState('');
  const [manualDeliveredAt, setManualDeliveredAt] = useState('');
  const [manualProofUrl, setManualProofUrl] = useState('');

  // Posts para exibir
  const activePosts = useMemo(() => {
    return isStaff ? (staffInterests.data ?? []) : (playerInterests.data ?? []);
  }, [isStaff, staffInterests.data, playerInterests.data]);

  // Itens filtrados do catálogo para o modal de novo drop
  const filteredCatalogItems = useMemo(() => {
    const list = catalog.data ?? [];
    if (!catalogSearch.trim()) return list.slice(0, 30);
    const s = catalogSearch.toLowerCase();
    return list
      .filter((i) => i.namePt.toLowerCase().includes(s) || i.nameEn.toLowerCase().includes(s))
      .slice(0, 30);
  }, [catalog.data, catalogSearch]);

  // Formata tempo restante
  function getRemainingTimeText(closesAtStr: string): { text: string; isClosed: boolean } {
    const closesAt = new Date(closesAtStr);
    const now = new Date();
    const diffMs = closesAt.getTime() - now.getTime();

    if (diffMs <= 0) {
      return { text: locale === 'en' ? 'Closed' : 'Encerrado', isClosed: true };
    }

    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffHours >= 24) {
      const days = Math.floor(diffHours / 24);
      return {
        text: locale === 'en' ? `${days}d left` : `Encerra em ${days}d`,
        isClosed: false,
      };
    }
    if (diffHours > 0) {
      const mins = diffMinutes % 60;
      return {
        text: locale === 'en' ? `${diffHours}h ${mins}m left` : `Encerra em ${diffHours}h ${mins}m`,
        isClosed: false,
      };
    }
    return {
      text: locale === 'en' ? `${diffMinutes}m left` : `Encerra em ${diffMinutes}m`,
      isClosed: false,
    };
  }

  // Declara interesse (Jogador)
  async function handleToggleInterest(post: ItemInterestPost) {
    try {
      await declareInterestMutation.mutateAsync({
        postId: post.id,
        imageUrl: '/transmutar.png', // Identificador padrão de manifesto sem print avulso obrigatório
        note: 'Manifestado via Web',
      });
      notifyToast({
        title: locale === 'en' ? 'Interest saved!' : 'Interesse registrado!',
        description:
          locale === 'en'
            ? 'Your interest is visible in the CP rank for this drop.'
            : 'Seu interesse está registrado e visível no ranking deste drop.',
        tone: 'success',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao manifestar interesse.';
      notifyToast({
        title: locale === 'en' ? 'Error' : 'Erro',
        description: msg,
        tone: 'error',
      });
    }
  }

  // Criação de Drop (Staff)
  async function handleCreateDrop() {
    if (!selectedCatalogItem) {
      notifyToast({
        title: 'Selecione um item',
        description: 'Escolha um item do catálogo para abrir o drop.',
        tone: 'error',
      });
      return;
    }

    let calculatedClosesAt: string;
    if (customClosesAt) {
      calculatedClosesAt = new Date(customClosesAt).toISOString();
    } else {
      const date = new Date(Date.now() + dropDurationHours * 3600 * 1000);
      calculatedClosesAt = date.toISOString();
    }

    try {
      await createDropMutation.mutateAsync({
        itemCatalogId: selectedCatalogItem.id,
        mode: dropMode,
        closesAt: calculatedClosesAt,
      });

      notifyToast({
        title: 'Drop publicado!',
        description: `O item ${selectedCatalogItem.namePt} foi aberto no site e enviado ao canal do Discord.`,
        tone: 'success',
      });

      setIsNewDropModalOpen(false);
      setSelectedCatalogItem(null);
      setCustomClosesAt('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao publicar drop.';
      notifyToast({ title: 'Erro', description: msg, tone: 'error' });
    }
  }

  // Confirmar Entrega (Staff)
  async function handleConfirmDelivery() {
    if (!deliveringPost || !selectedWinnerEntry) return;

    try {
      await deliverMutation.mutateAsync({
        id: deliveringPost.id,
        entryIds: [selectedWinnerEntry.id],
        proofImageUrl: deliveryProofUrl.trim() || undefined,
      });

      notifyToast({
        title: 'Drop Entregue!',
        description: `Item entregue com sucesso para ${selectedWinnerEntry.player?.nickname}. Notificação enviada.`,
        tone: 'success',
      });

      setDeliveringPost(null);
      setSelectedWinnerEntry(null);
      setDeliveryProofUrl('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao entregar drop.';
      notifyToast({ title: 'Erro', description: msg, tone: 'error' });
    }
  }

  // Upload de Comprovante de Entrega
  async function handleUploadProof(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingProof(true);
      const res = await uploadImageMutation.mutateAsync(file);
      setDeliveryProofUrl(res.url);
      notifyToast({
        title: 'Comprovante anexado!',
        description: 'Imagem enviada com sucesso.',
        tone: 'success',
      });
    } catch {
      notifyToast({
        title: 'Erro no envio',
        description: 'Não foi possível fazer upload do comprovante.',
        tone: 'error',
      });
    } finally {
      setIsUploadingProof(false);
    }
  }

  // Lançamento manual retroativo de drop (Staff)
  async function handleSaveManualDrop() {
    if (!inspectedPlayerId || !manualItemName.trim()) {
      notifyToast({
        title: 'Campos incompletos',
        description: 'Informe o nome do item entregue.',
        tone: 'error',
      });
      return;
    }

    try {
      await manualDropMutation.mutateAsync({
        playerId: inspectedPlayerId,
        itemName: manualItemName.trim(),
        deliveredAt: manualDeliveredAt ? new Date(manualDeliveredAt).toISOString() : new Date().toISOString(),
        proofImageUrl: manualProofUrl.trim() || undefined,
      });

      notifyToast({
        title: 'Entrega manual registrada!',
        description: `Item ${manualItemName} adicionado ao histórico de ${inspectedPlayerName}.`,
        tone: 'success',
      });

      setIsAddingManualDrop(false);
      setManualItemName('');
      setManualDeliveredAt('');
      setManualProofUrl('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao registrar entrega manual.';
      notifyToast({ title: 'Erro', description: msg, tone: 'error' });
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-card via-card/90 to-primary/10 p-6 md:p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <Swords className="h-3.5 w-3.5" />
              AlcatraZ Loot & Boss Drops
            </div>
            <h1 className="font-[var(--font-cinzel)] text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              {locale === 'en' ? 'Loot & Boss Drop Distribution' : 'Distribuição de Loot & Boss Drops'}
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              {locale === 'en'
                ? 'Active drops opened by Staff. Reacters from Discord (#loot-distribution-cp) and the website are synced automatically. Staff decides winners strictly by verified Combat Power (CP).'
                : 'Drops abertos pela Staff. As reações do Discord (#loot-distribution-cp) e do site são sincronizadas em tempo real. A Staff decide a entrega com prioridade transparente por Combat Power (CP).'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isStaff && (
              <Button
                onClick={() => setIsNewDropModalOpen(true)}
                className="gap-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold shadow-lg shadow-amber-900/30"
              >
                <Plus className="h-4 w-4" />
                Lançar Novo Drop
              </Button>
            )}
          </div>
        </div>

        {/* Abas */}
        <div className="mt-6 flex gap-2 border-b border-white/10 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('open')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'open'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
            }`}
          >
            <Flame className="h-4 w-4" />
            {locale === 'en' ? 'Open Drops' : 'Drops Abertos'}
            <span className="ml-1.5 rounded-full bg-black/40 px-2 py-0.5 text-xs">
              {activePosts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('delivered')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'delivered'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
            }`}
          >
            <History className="h-4 w-4" />
            {locale === 'en' ? 'Delivery History' : 'Histórico de Entregas'}
            <span className="ml-1.5 rounded-full bg-black/40 px-2 py-0.5 text-xs">
              {(allDeliveredDrops.data ?? []).length}
            </span>
          </button>
        </div>
      </div>

      {/* Conteúdo da Aba 1: Drops Abertos */}
      {activeTab === 'open' && (
        <div className="space-y-6">
          {activePosts.length === 0 ? (
            <EmptyState title={locale === 'en' ? 'No active drops right now' : 'Nenhum drop aberto no momento'}>
              {locale === 'en'
                ? 'When Staff opens new drops from bosses or vault, they will appear here and on Discord #loot-distribution-cp.'
                : 'Quando a Staff publicar novos drops de bosses ou baú, eles aparecerão aqui e no canal #loot-distribution-cp do Discord.'}
            </EmptyState>
          ) : (
            <div className="grid gap-6">
              {activePosts.map((post) => {
                const item = post.itemCatalog;
                const { text: timeText, isClosed } = getRemainingTimeText(post.closesAt);
                const imageUrl = displayImageUrl(item?.image1Url || item?.image2Url);

                // Jogador logado já manifestou interesse?
                const entriesList = post.entries ?? [];
                const userHasDeclared = entriesList.some(
                  (e) => (currentPlayerId && e.playerId === currentPlayerId) || (e as any).viewerHasDeclared,
                );

                // Ordena participantes por Combat Power (CP) decrescente para a Staff
                const sortedEntries = [...entriesList].sort((a, b) => {
                  const cpA = a.player?.combatPower ?? 0;
                  const cpB = b.player?.combatPower ?? 0;
                  return cpB - cpA;
                });

                return (
                  <Card
                    key={post.id}
                    className="overflow-hidden border border-white/10 bg-gradient-to-b from-card to-card/60 shadow-xl"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
                      {/* Coluna do Item: Imagem e Dados (4 colunas) */}
                      <div className="lg:col-span-4 flex flex-col items-center sm:items-start text-center sm:text-left gap-4">
                        <div
                          className="relative h-44 w-44 rounded-xl border border-primary/30 bg-black/40 overflow-hidden flex items-center justify-center p-2 group cursor-zoom-in shadow-inner"
                          onClick={() => imageUrl && setZoomUrl(imageUrl || null)}
                        >
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={post.title}
                              className="h-full w-full object-contain transition-transform group-hover:scale-105"
                            />
                          ) : (
                            <Package className="h-16 w-16 text-muted-foreground/40" />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ZoomIn className="h-6 w-6 text-white" />
                          </div>
                        </div>

                        <div className="space-y-1.5 w-full">
                          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                            {item?.itemTier && (
                              <Badge tone="gold" className="font-bold">
                                {item.itemTier}
                              </Badge>
                            )}
                            <Badge tone={post.mode === 'PvP' ? 'red' : 'blue'}>
                              {post.mode}
                            </Badge>
                            <Badge tone={isClosed ? 'red' : 'green'} className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {timeText}
                            </Badge>
                          </div>

                          <h3 className="font-[var(--font-cinzel)] text-xl font-bold text-foreground">
                            {item ? itemName(item, locale, post.title) : post.title}
                          </h3>

                          {item?.typePt && (
                            <p className="text-xs text-muted-foreground">
                              {locale === 'en' ? item.typeEn : item.typePt}
                            </p>
                          )}

                          {/* Ação do Jogador: Manifestar / Cancelar */}
                          <div className="pt-3">
                            {userHasDeclared ? (
                              <div className="space-y-2">
                                <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-bold text-emerald-400">
                                  <CheckCircle2 className="h-4 w-4" />
                                  {locale === 'en' ? 'Interest Registered' : 'Interesse Registrado'}
                                </div>
                                {!isClosed && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleToggleInterest(post)}
                                    className="text-xs text-muted-foreground hover:text-red-400 block"
                                  >
                                    {locale === 'en' ? 'Remove Interest' : 'Cancelar Interesse'}
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <Button
                                onClick={() => handleToggleInterest(post)}
                                disabled={isClosed || declareInterestMutation.isPending}
                                className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md"
                              >
                                <Award className="h-4 w-4" />
                                {isClosed
                                  ? locale === 'en'
                                    ? 'Closed'
                                    : 'Encerramento Expirado'
                                  : locale === 'en'
                                    ? 'Declare Interest'
                                    : 'Manifestar Interesse'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Coluna dos Interessados / Ranking de CP (8 colunas) */}
                      <div className="lg:col-span-8 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-white/10 pt-4 lg:pt-0 lg:pl-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-amber-400" />
                            <h4 className="text-sm font-bold uppercase tracking-wider text-foreground">
                              {isStaff
                                ? 'Ranking de CP dos Interessados'
                                : locale === 'en'
                                  ? 'Interested Players'
                                  : 'Jogadores Interessados'}
                            </h4>
                          </div>
                          <span className="text-xs font-semibold text-muted-foreground">
                            {sortedEntries.length} {locale === 'en' ? 'participants' : 'participantes'}
                          </span>
                        </div>

                        {sortedEntries.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-xs text-muted-foreground">
                            {locale === 'en'
                              ? 'No players have reacted yet. Be the first to express interest!'
                              : 'Nenhum jogador manifestou interesse ainda. Seja o primeiro a reagir no Discord ou clicar aqui!'}
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                            {sortedEntries.map((entry, index) => {
                              const p = entry.player;
                              const cp = p?.combatPower ?? 0;
                              const stats = (entry as any).lootStats;
                              const sameItemCount = stats?.sameItemDrops ?? 0;
                              const sameTypeCount = stats?.sameTypeDrops ?? 0;
                              const totalDropsCount = stats?.totalDrops ?? 0;

                              return (
                                <div
                                  key={entry.id}
                                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3 transition-all ${
                                    index === 0
                                      ? 'border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-card to-card'
                                      : 'border-white/5 bg-black/20 hover:bg-black/30'
                                  }`}
                                >
                                  {/* Info Jogador */}
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                        index === 0
                                          ? 'bg-amber-500 text-black font-extrabold shadow-md shadow-amber-500/50'
                                          : index === 1
                                            ? 'bg-slate-300 text-black'
                                            : index === 2
                                              ? 'bg-amber-800 text-white'
                                              : 'bg-white/10 text-muted-foreground'
                                      }`}
                                    >
                                      #{index + 1}
                                    </div>

                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-foreground">
                                          {p?.nickname ?? 'Jogador'}
                                        </span>
                                        {p?.guildName && (
                                          <Badge
                                            tone={p.guildName === 'AlcatraZ' ? 'gold' : 'blue'}
                                            className="text-[10px] px-1.5 py-0"
                                          >
                                            {p.guildName}
                                          </Badge>
                                        )}
                                      </div>

                                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                        <span>{playerClassLabel(p?.class, locale)}</span>
                                        {/* Histórico badges */}
                                        {sameItemCount > 0 && (
                                          <Badge tone="red" className="text-[10px] px-1 py-0">
                                            Já tem ({sameItemCount}x)
                                          </Badge>
                                        )}
                                        {sameTypeCount > 0 && (
                                          <Badge tone="gold" className="text-[10px] px-1 py-0">
                                            Categoria ({sameTypeCount}x)
                                          </Badge>
                                        )}
                                        {totalDropsCount === 0 && (
                                          <Badge tone="green" className="text-[10px] px-1 py-0">
                                            1º Drop
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* CP e Ações Staff */}
                                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                                    <div className="text-right">
                                      <p className="font-mono text-sm font-extrabold text-emerald-400">
                                        {cp > 0 ? `${cp.toLocaleString('pt-BR')} CP` : 'Sem CP'}
                                      </p>
                                    </div>

                                    {/* Botões da Staff */}
                                    {isStaff && (
                                      <div className="flex items-center gap-1.5">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          title="Consultar Histórico de Drops deste Jogador"
                                          onClick={() => {
                                            if (p?.id) {
                                              setInspectedPlayerId(p.id);
                                              setInspectedPlayerName(p.nickname);
                                            }
                                          }}
                                          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                                        >
                                          <History className="h-3.5 w-3.5" />
                                        </Button>

                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            setDeliveringPost(post);
                                            setSelectedWinnerEntry(entry);
                                            setDeliveryProofUrl('');
                                          }}
                                          className="h-8 gap-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
                                        >
                                          <Award className="h-3.5 w-3.5" />
                                          Entregar
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Conteúdo da Aba 2: Histórico de Entregas */}
      {activeTab === 'delivered' && (
        <Card className="border border-white/10 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              {locale === 'en' ? 'Delivered Drops & Auction Results' : 'Histórico de Drops & Itens Entregues'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(allDeliveredDrops.data ?? []).length === 0 ? (
              <EmptyState title="Nenhum item entregue registrado ainda">
                Os comprovantes de entrega de drops e leilões confirmados pela Staff aparecerão aqui.
              </EmptyState>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(allDeliveredDrops.data ?? []).map((drop) => {
                  const proof = displayImageUrl(drop.proofImageUrl);
                  const img = displayImageUrl(drop.itemCatalog?.image1Url || drop.itemCatalog?.image2Url);

                  return (
                    <div
                      key={drop.id}
                      className="rounded-xl border border-white/10 bg-black/25 p-4 flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="h-16 w-16 shrink-0 rounded-lg bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center cursor-zoom-in"
                          onClick={() => (proof || img) && setZoomUrl(proof || img || null)}
                        >
                          {proof || img ? (
                            <img src={proof || img} alt={drop.itemName || 'Item'} className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-8 w-8 text-muted-foreground/30" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-sm text-foreground">
                            {drop.itemCatalog ? itemName(drop.itemCatalog, locale, drop.itemName || '') : drop.itemName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Entregue para: <strong className="text-primary">{drop.nicknameIngame || drop.player?.nickname}</strong>
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {drop.deliveredAt ? new Date(drop.deliveredAt).toLocaleDateString('pt-BR') : '-'}
                          </p>
                        </div>
                      </div>

                      {proof && (
                        <a
                          href={proof}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline pt-2 border-t border-white/5"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Ver Comprovante de Entrega
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* MODAL 1: Lançar Novo Drop (Staff) */}
      {isNewDropModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-amber-500/40 bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Plus className="h-5 w-5" />
                <h3 className="text-lg font-bold text-foreground">Lançar Novo Drop para o Clã</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewDropModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Selecione o item do catálogo. O drop será criado no ERP e publicado automaticamente no canal do Discord{' '}
              <strong className="text-amber-300">#loot-distribution-cp</strong> para as reações dos membros.
            </p>

            {/* Busca e Seleção do Item */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">1. Selecionar Item do Catálogo</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Buscar item pelo nome (ex: Espada, Livro, Anel...)"
                  className="pl-9"
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl border border-white/10 bg-black/20 p-2">
                {filteredCatalogItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedCatalogItem(item)}
                    className={`flex items-center justify-between w-full p-2 rounded-lg text-left text-xs transition-colors ${
                      selectedCatalogItem?.id === item.id
                        ? 'bg-primary text-primary-foreground font-bold'
                        : 'hover:bg-white/5 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {item.namePt}
                      </span>
                      {item.itemTier && <Badge tone="gold">{item.itemTier}</Badge>}
                    </div>
                    <span className="text-[11px] opacity-70">{item.typePt}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Item Selecionado Preview */}
            {selectedCatalogItem && (
              <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-black/40 overflow-hidden flex items-center justify-center p-1">
                    {selectedCatalogItem.image1Url ? (
                      <img
                        src={selectedCatalogItem.image1Url}
                        alt={selectedCatalogItem.namePt}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <Package className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground">{selectedCatalogItem.namePt}</p>
                    <p className="text-xs text-muted-foreground">{selectedCatalogItem.typePt}</p>
                  </div>
                </div>
                <Badge tone="green">Item Selecionado</Badge>
              </div>
            )}

            {/* Modo e Duração */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">2. Modo do Drop</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={dropMode === 'PvE' ? 'primary' : 'secondary'}
                    onClick={() => setDropMode('PvE')}
                    className="flex-1 font-bold"
                  >
                    PvE (Boss)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={dropMode === 'PvP' ? 'primary' : 'secondary'}
                    onClick={() => setDropMode('PvP')}
                    className="flex-1 font-bold"
                  >
                    PvP (Guerra)
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">3. Duração do Drop</label>
                <div className="flex gap-2">
                  {[1, 2, 4, 24].map((h) => (
                    <Button
                      key={h}
                      type="button"
                      size="sm"
                      variant={dropDurationHours === h && !customClosesAt ? 'primary' : 'secondary'}
                      onClick={() => {
                        setDropDurationHours(h);
                        setCustomClosesAt('');
                      }}
                      className="flex-1 text-xs px-2"
                    >
                      {h}h
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <Button variant="ghost" onClick={() => setIsNewDropModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreateDrop}
                disabled={!selectedCatalogItem || createDropMutation.isPending}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold gap-2"
              >
                {createDropMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Publicando...
                  </>
                ) : (
                  <>
                    <Flame className="h-4 w-4" /> Publicar Drop no Discord & Site
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Confirmar Entrega do Drop (Staff) */}
      {deliveringPost && selectedWinnerEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-amber-500/40 bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Award className="h-5 w-5" />
                <h3 className="text-lg font-bold text-foreground">Confirmar Entrega do Drop</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeliveringPost(null);
                  setSelectedWinnerEntry(null);
                }}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
              <p className="text-xs text-muted-foreground uppercase font-bold">Item:</p>
              <p className="font-bold text-base text-foreground">{deliveringPost.title}</p>
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">Ganhador:</p>
                  <p className="font-bold text-emerald-400 text-sm">
                    {selectedWinnerEntry.player?.nickname} ({selectedWinnerEntry.player?.combatPower?.toLocaleString('pt-BR')} CP)
                  </p>
                </div>
                {selectedWinnerEntry.player?.class && (
                  <Badge tone="blue">{playerClassLabel(selectedWinnerEntry.player.class, locale)}</Badge>
                )}
              </div>
            </div>

            {/* Anexo de Comprovante */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase flex items-center justify-between">
                <span>Comprovante de Entrega (Print)</span>
                {deliveryProofUrl && <span className="text-emerald-400 font-normal">✓ Anexado</span>}
              </label>

              <div className="flex gap-2">
                <Input
                  value={deliveryProofUrl}
                  onChange={(e) => setDeliveryProofUrl(e.target.value)}
                  placeholder="Cole o link da imagem ou clique em Enviar..."
                  className="text-xs"
                />
                <label className="shrink-0 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadProof}
                    className="hidden"
                    disabled={isUploadingProof}
                  />
                  <div className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 text-xs font-bold text-primary hover:bg-primary/20 transition-colors">
                    {isUploadingProof ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    Upload
                  </div>
                </label>
              </div>

              {deliveryProofUrl && (
                <div className="relative h-24 w-full rounded-lg border border-white/10 overflow-hidden bg-black/40">
                  <img src={deliveryProofUrl} alt="Comprovante" className="h-full w-full object-contain" />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <Button
                variant="ghost"
                onClick={() => {
                  setDeliveringPost(null);
                  setSelectedWinnerEntry(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmDelivery}
                disabled={deliverMutation.isPending || isUploadingProof}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold gap-2"
              >
                {deliverMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Entregando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" /> Concluir e Registrar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Histórico de Drops do Jogador & Lançamento Manual (Staff) */}
      {inspectedPlayerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/20 bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-primary">
                <History className="h-5 w-5" />
                <h3 className="text-lg font-bold text-foreground">
                  Histórico de Drops: {inspectedPlayerName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setInspectedPlayerId(null);
                  setIsAddingManualDrop(false);
                }}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Botão de Lançar Entrega Manual */}
            {isStaff && !isAddingManualDrop && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setIsAddingManualDrop(true)}
                  className="gap-1.5 text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Lançar Entrega Retroativa (Manual)
                </Button>
              </div>
            )}

            {/* Formulário de Lançamento Manual */}
            {isAddingManualDrop && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                <p className="text-xs font-bold text-amber-300 uppercase">
                  Registrar Entrega Passada / Manual
                </p>
                <div className="space-y-2">
                  <Input
                    value={manualItemName}
                    onChange={(e) => setManualItemName(e.target.value)}
                    placeholder="Nome do item entregue (ex: Espada do Dragão...)"
                    className="text-xs"
                  />
                  <Input
                    type="date"
                    value={manualDeliveredAt}
                    onChange={(e) => setManualDeliveredAt(e.target.value)}
                    className="text-xs"
                  />
                  <Input
                    value={manualProofUrl}
                    onChange={(e) => setManualProofUrl(e.target.value)}
                    placeholder="URL do comprovante (opcional)"
                    className="text-xs"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsAddingManualDrop(false)}
                    className="text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveManualDrop}
                    disabled={manualDropMutation.isPending}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
                  >
                    {manualDropMutation.isPending ? 'Salvando...' : 'Salvar Entrega'}
                  </Button>
                </div>
              </div>
            )}

            {/* Lista de Drops do Jogador */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {playerDropsQuery.isLoading ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
                  Carregando histórico...
                </div>
              ) : (playerDropsQuery.data ?? []).length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-white/10 rounded-xl">
                  Este jogador ainda não possui nenhum drop registrado no ERP.
                </div>
              ) : (
                (playerDropsQuery.data ?? []).map((drop) => {
                  const proof = displayImageUrl(drop.proofImageUrl);
                  return (
                    <div
                      key={drop.id}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-black/25 p-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <p className="font-bold text-foreground">
                          {drop.itemCatalog ? itemName(drop.itemCatalog, locale, drop.itemName || '') : drop.itemName}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {drop.deliveredAt ? new Date(drop.deliveredAt).toLocaleDateString('pt-BR') : '-'}
                        </p>
                      </div>

                      {proof && (
                        <a
                          href={proof}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                        >
                          <ExternalLink className="h-3 w-3" /> Ver Comprovante
                        </a>
                      )}
                    </div>
                  );
                })
              )}
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
