'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Ban,
  CheckCircle2,
  Clock,
  Filter,
  Package,
  Search,
  Send,
  Shield,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { notifyToast } from '@/components/ui/toaster';
import {
  useCancelStorageRequest,
  useCreateStorageRequest,
  useMyStorageRequests,
  useStorageItems,
} from '@/hooks/use-storage-api';
import { useAuthStore } from '@/store/auth-store';
import type { GuildStorageItem, GuildStorageRequest, StorageRequestStatus } from '@/types/api';

const statusConfig: Record<StorageRequestStatus, { label: string; tone: 'gold' | 'green' | 'red' | 'muted'; icon: typeof Clock }> = {
  PENDING: { label: 'Aguardando Staff', tone: 'gold', icon: Clock },
  DELIVERED: { label: 'Entregue', tone: 'green', icon: CheckCircle2 },
  REJECTED: { label: 'Rejeitado', tone: 'red', icon: XCircle },
  CANCELLED: { label: 'Cancelado', tone: 'muted', icon: Ban },
};

const tierColors: Record<string, string> = {
  COMMON: 'text-zinc-400 border-zinc-500/30 bg-zinc-500/10',
  UNCOMMON: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  RARE: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  HEROIC: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
  LEGENDARY: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  MYTHIC: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
};

export default function PlayerStoragePage() {
  const hasRole = useAuthStore((state) => state.hasRole);
  const isStaff = hasRole(['STAFF', 'ADMIN']);

  const [activeTab, setActiveTab] = useState<'catalog' | 'requests'>('catalog');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Request Modal State
  const [requestItem, setRequestItem] = useState<GuildStorageItem | null>(null);
  const [requestQty, setRequestQty] = useState(1);
  const [playerNote, setPlayerNote] = useState('');

  // Cancel Confirmation State
  const [cancelRequestId, setCancelRequestId] = useState<string | null>(null);

  // Queries & Mutations
  const { data: storageData, isLoading: isLoadingStorage } = useStorageItems();
  const { data: myRequestsData, isLoading: isLoadingRequests } = useMyStorageRequests();
  const createRequest = useCreateStorageRequest();
  const cancelRequest = useCancelStorageRequest();

  const activeCount = myRequestsData?.activeCount ?? 0;
  const maxAllowed = myRequestsData?.maxAllowed ?? 5;
  const canRequestMore = myRequestsData?.canRequestMore ?? (activeCount < maxAllowed);

  // Filtered storage items
  const filteredItems = useMemo(() => {
    const items = storageData?.items ?? [];
    return items.filter((item) => {
      if (item.quantity <= 0) return false;
      const matchesSearch = !search.trim() || item.itemName.toLowerCase().includes(search.toLowerCase().trim());
      const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [storageData?.items, search, selectedCategory]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    (storageData?.items ?? []).forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set);
  }, [storageData?.items]);

  function handleOpenRequestModal(item: GuildStorageItem) {
    setRequestItem(item);
    setRequestQty(1);
    setPlayerNote('');
  }

  function handleConfirmRequest() {
    if (!requestItem) return;
    if (!canRequestMore) {
      notifyToast({
        title: 'Limite atingido',
        description: `Você já possui ${maxAllowed} solicitações ativas. Cancele um pedido pendente ou aguarde a Staff.`,
        tone: 'error',
      });
      return;
    }

    createRequest.mutate(
      {
        storageItemId: requestItem.id,
        quantity: requestQty,
        playerNote: playerNote.trim() || undefined,
      },
      {
        onSuccess: () => {
          notifyToast({
            title: 'Solicitação enviada!',
            description: `Seu pedido de ${requestItem.itemName} (${requestQty}x) foi enviado para a Staff no Discord.`,
            tone: 'success',
          });
          setRequestItem(null);
          setActiveTab('requests');
        },
        onError: (err: any) => {
          const message = err?.response?.data?.message || err?.message || 'Falha ao criar solicitação.';
          notifyToast({ title: 'Erro ao solicitar', description: message, tone: 'error' });
        },
      },
    );
  }

  function handleConfirmCancel() {
    if (!cancelRequestId) return;
    cancelRequest.mutate(cancelRequestId, {
      onSuccess: () => {
        notifyToast({
          title: 'Solicitação cancelada',
          description: 'Sua vaga de pedido foi liberada imediatamente.',
          tone: 'success',
        });
        setCancelRequestId(null);
      },
      onError: (err: any) => {
        const message = err?.response?.data?.message || err?.message || 'Falha ao cancelar solicitação.';
        notifyToast({ title: 'Erro', description: message, tone: 'error' });
      },
    });
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="rounded-xl border border-primary/20 bg-card/60 p-5 shadow-rune backdrop-blur-xl sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="page-kicker">Tesouro da Guilda</p>
            <h1 className="page-title mt-1 text-2xl sm:text-3xl">Baú da Guilda & Solicitações</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Solicite itens disponíveis no inventário da guilda para a sua evolução e progressão.
              Cada membro pode manter até <strong>5 solicitações ativas simultâneas</strong>.
            </p>
          </div>
          {isStaff && (
            <Link href="/dashboard/staff/storage">
              <Button variant="secondary" className="gap-2 border border-primary/30 text-primary">
                <Shield className="h-4 w-4" />
                Painel Staff do Baú
              </Button>
            </Link>
          )}
        </div>

        {/* Quota Counter Card */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-primary/20 bg-background/50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Cota de Solicitações:</span>
                <Badge tone={activeCount >= maxAllowed ? 'red' : 'gold'}>
                  {activeCount} / {maxAllowed} ativas
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {canRequestMore
                  ? `Você ainda pode solicitar mais ${maxAllowed - activeCount} item(ns).`
                  : 'Limite atingido. Novas solicitações serão liberadas quando a Staff enviar ou rejeitar.'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'catalog' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setActiveTab('catalog')}
            >
              Itens Disponíveis ({filteredItems.length})
            </Button>
            <Button
              variant={activeTab === 'requests' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setActiveTab('requests')}
            >
              Minhas Solicitações ({myRequestsData?.requests?.length ?? 0})
            </Button>
          </div>
        </div>
      </section>

      {/* Tab: Catalog */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome do item..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                <option value="ALL">Todas as categorias</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Items Grid */}
          {isLoadingStorage ? (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-lg border bg-card/40" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <EmptyState title="Nenhum item encontrado no Baú">
              {search || selectedCategory !== 'ALL'
                ? 'Tente ajustar os filtros de busca ou categoria.'
                : 'O baú da guilda está vazio ou todos os itens estão aguardando nova importação.'}
            </EmptyState>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filteredItems.map((item) => {
                const tierClass = item.itemTier ? tierColors[item.itemTier] || '' : '';
                return (
                  <Card key={item.id} className="flex flex-col justify-between border-white/10 bg-card/60 transition hover:border-primary/40">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base font-semibold leading-tight line-clamp-2">
                          {item.itemName}
                        </CardTitle>
                        {item.itemTier && (
                          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold border ${tierClass}`}>
                            {item.itemTier}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{item.category || 'Geral'}</p>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <div className="flex items-center justify-between border-t border-white/5 pt-3">
                        <div>
                          <span className="text-[11px] text-muted-foreground">Estoque</span>
                          <p className="font-tabular text-lg font-bold text-primary">{item.quantity}</p>
                        </div>
                        <Button
                          size="sm"
                          disabled={!canRequestMore || item.quantity <= 0}
                          onClick={() => handleOpenRequestModal(item)}
                          className="gap-1 text-xs"
                          title={!canRequestMore ? 'Limite de 5 pedidos atingido' : undefined}
                        >
                          <Send className="h-3 w-3" />
                          Solicitar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: My Requests */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {isLoadingRequests ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-lg border bg-card/40" />
              ))}
            </div>
          ) : (myRequestsData?.requests ?? []).length === 0 ? (
            <EmptyState title="Você ainda não fez solicitações">
              Vá para a aba "Itens Disponíveis" e solicite itens do Baú da Guilda para turbinar seu personagem.
            </EmptyState>
          ) : (
            <div className="space-y-3">
              {(myRequestsData?.requests ?? []).map((req) => {
                const config = statusConfig[req.status] || statusConfig.PENDING;
                const Icon = config.icon;
                const isPending = req.status === 'PENDING';

                return (
                  <Card key={req.id} className="border-white/10 bg-card/60">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-foreground text-base">
                              {req.storageItem?.itemName || 'Item do Baú'}
                            </span>
                            <Badge tone="blue">Qtd: {req.quantity}</Badge>
                            <Badge tone={config.tone} className="gap-1">
                              <Icon className="h-3 w-3" />
                              {config.label}
                            </Badge>
                            {req.storageItem?.itemTier && (
                              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${tierColors[req.storageItem.itemTier] || ''}`}>
                                {req.storageItem.itemTier}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground">
                            Solicitado em {new Date(req.createdAt).toLocaleString()}
                            {req.deliveredAt && ` · Despachado em ${new Date(req.deliveredAt).toLocaleString()}`}
                            {req.rejectedAt && ` · Recusado em ${new Date(req.rejectedAt).toLocaleString()}`}
                          </p>

                          {req.playerNote && (
                            <p className="text-xs text-muted-foreground italic">
                              Sua nota: "{req.playerNote}"
                            </p>
                          )}

                          {req.staffNote && (
                            <div className="mt-2 rounded bg-background/60 p-2 text-xs text-primary border border-primary/20">
                              <strong>Resposta da Staff:</strong> {req.staffNote}
                            </div>
                          )}
                        </div>

                        {isPending && (
                          <div className="flex shrink-0 items-center gap-2">
                            <Button
                              variant="danger"
                              size="sm"
                              className="gap-1 text-xs"
                              disabled={cancelRequest.isPending}
                              onClick={() => setCancelRequestId(req.id)}
                            >
                              <Ban className="h-3.5 w-3.5" />
                              Cancelar Pedido
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Request Item Modal */}
      {requestItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-primary/30 bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Solicitar Item do Baú</h3>
              <button
                onClick={() => setRequestItem(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="rounded-lg border border-white/10 bg-background/50 p-3 space-y-1">
              <p className="font-semibold text-primary">{requestItem.itemName}</p>
              <p className="text-xs text-muted-foreground">
                Categoria: {requestItem.category || 'Geral'} · Estoque disponível: {requestItem.quantity}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Quantidade</label>
                <Input
                  type="number"
                  min={1}
                  max={requestItem.quantity}
                  value={requestQty}
                  onChange={(e) => setRequestQty(Math.max(1, Math.min(requestItem.quantity, Number(e.target.value))))}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Nota para a Staff (opcional)
                </label>
                <Input
                  placeholder="Ex: Para fechar build, buff de raid, etc."
                  value={playerNote}
                  onChange={(e) => setPlayerNote(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  O pedido consumirá 1 slot da sua cota de 5 solicitações. A liderança receberá o aviso no canal da Staff e, ao despachar, sua vaga será liberada.
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setRequestItem(null)}>
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmRequest}
                disabled={createRequest.isPending || requestQty < 1}
                className="gap-1"
              >
                <Send className="h-4 w-4" />
                {createRequest.isPending ? 'Enviando...' : 'Confirmar Solicitação'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <ConfirmationDialog
        open={Boolean(cancelRequestId)}
        onClose={() => setCancelRequestId(null)}
        title="Cancelar Solicitação do Baú?"
        description="Ao cancelar esta solicitação pendente, ela será removida da fila da Staff e sua vaga na cota de 5 pedidos será liberada imediatamente."
        confirmLabel="Sim, Cancelar Pedido"
        tone="danger"
        pending={cancelRequest.isPending}
        onConfirm={handleConfirmCancel}
      />
    </div>
  );
}
