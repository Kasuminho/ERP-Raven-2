'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Gem, Gavel, Coins, HeartHandshake, Plus, ArrowRight, ShieldAlert, Sparkles, CheckCircle2, Package } from 'lucide-react';
import { AuctionCard } from '@/components/dashboard/auction-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { notifyToast } from '@/components/ui/toaster';
import { useAuctions } from '@/hooks/use-auctions-api';
import { useDiamondSales } from '@/hooks/use-diamond-sales-api';
import { useDkpSummary } from '@/hooks/use-dkp-api';
import { useItems } from '@/hooks/use-items-api';
import { usePlayerId } from '@/hooks/use-profile-api';
import { useCreateWishlistItem, useMyWishlist, useSetWishlistItemStatus } from '@/hooks/use-wishlist-api';
import { t } from '@/lib/i18n';
import { useAuthStore } from '@/store/auth-store';
import { useLocaleStore } from '@/store/locale-store';
import type { WishlistPriority } from '@/types/api';

const PRIORITIES: WishlistPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function LootHubPage() {
  const locale = useLocaleStore((state) => state.locale);
  const playerId = usePlayerId();
  const hasRole = useAuthStore((state) => state.hasRole);
  const isStaff = hasRole(['STAFF', 'ADMIN']);

  const [activeTab, setActiveTab] = useState<'auctions' | 'diamonds' | 'wishlist'>('auctions');

  // Queries
  const dkp = useDkpSummary(playerId);
  const auctions = useAuctions();
  const diamondSales = useDiamondSales();
  const wishlist = useMyWishlist();
  const items = useItems();

  // Mutations
  const createWishlistItem = useCreateWishlistItem();
  const setStatus = useSetWishlistItemStatus();

  // Wishlist Form State
  const [itemCatalogId, setItemCatalogId] = useState('');
  const [priority, setPriority] = useState<WishlistPriority>('HIGH');
  const [reason, setReason] = useState('');

  const activeAuctionsList = useMemo(() => {
    return (auctions.data ?? []).filter((a) => a.status === 'OPEN');
  }, [auctions.data]);

  const activeItems = useMemo(() => {
    return (items.data ?? []).filter((i) => i.isActive);
  }, [items.data]);

  const totalDiamondsShared = useMemo(() => {
    return (diamondSales.data ?? []).reduce((acc, sale) => acc + (sale.diamondTotal ?? 0), 0);
  }, [diamondSales.data]);

  function handleCreateWish() {
    if (!itemCatalogId || reason.trim().length < 3) {
      notifyToast({ title: 'Selecione um item e informe o motivo do desejo.', tone: 'error' });
      return;
    }

    createWishlistItem.mutate(
      {
        itemCatalogId,
        priority,
        reason: reason.trim(),
      },
      {
        onSuccess: () => {
          setItemCatalogId('');
          setReason('');
          notifyToast({ title: 'Desejo adicionado com sucesso!', tone: 'success' });
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="rounded-xl border border-primary/20 bg-card/60 p-5 shadow-rune backdrop-blur-xl sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="page-kicker">{t(locale, 'hubLoot')}</p>
            <h1 className="page-title mt-1 text-2xl sm:text-3xl">Central de Loot & Economia</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Leilões de drops por DKP, partilha de vendas em Diamantes e lista de desejos prioritários.
            </p>
          </div>
          {isStaff && (
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/staff/storage">
                <Button variant="secondary" className="gap-2 border border-primary/30 text-primary">
                  <Package className="h-4 w-4" />
                  Baú da Guilda
                </Button>
              </Link>
              <Link href="/dashboard/staff/diamond-sales">
                <Button variant="secondary" className="gap-2 border border-primary/30 text-primary">
                  <Coins className="h-4 w-4" />
                  Gerenciar Vendas
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Quick Balance Cards */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-background/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Meu Saldo DKP</span>
              <Gavel className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-1 font-tabular text-2xl font-bold text-primary">
              {dkp.data?.total ?? 0} <span className="text-sm font-normal text-muted-foreground">DKP</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Disponível para lances nos leilões</p>
          </div>

          <div className="rounded-lg border border-white/10 bg-background/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Leilões Abertos</span>
              <Gem className="h-4 w-4 text-amber-400" />
            </div>
            <p className="mt-1 font-tabular text-2xl font-bold text-foreground">
              {activeAuctionsList.length} <span className="text-sm font-normal text-muted-foreground">itens</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Lances silenciosos e imparciais</p>
          </div>

          <div className="rounded-lg border border-white/10 bg-background/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Diamantes Partilhados</span>
              <Coins className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-1 font-tabular text-2xl font-bold text-emerald-400">
              {totalDiamondsShared.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">💎</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Repasse líquido após 9% do mercado</p>
          </div>
        </div>
      </section>

      {/* Tabs Switcher */}
      <div className="flex border-b border-white/10 pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('auctions')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition ${
            activeTab === 'auctions'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Gavel className="h-4 w-4" />
          <span>Leilões Ativos ({activeAuctionsList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('diamonds')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition ${
            activeTab === 'diamonds'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Coins className="h-4 w-4" />
          <span>Vendas em Diamantes ({diamondSales.data?.length ?? 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('wishlist')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition ${
            activeTab === 'wishlist'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <HeartHandshake className="h-4 w-4" />
          <span>Meus Desejos ({wishlist.data?.length ?? 0})</span>
        </button>
      </div>

      {/* TAB 1: AUCTIONS */}
      {activeTab === 'auctions' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-[var(--font-cinzel)] text-xl font-bold">Drops Disponíveis para Lance</h2>
            <Link href="/dashboard/drops" className="text-xs text-primary hover:underline">
              Ver histórico completo de drops &rarr;
            </Link>
          </div>

          {auctions.isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          ) : activeAuctionsList.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {activeAuctionsList.map((auction) => (
                <AuctionCard key={auction.id} auction={auction} />
              ))}
            </div>
          ) : (
            <EmptyState title="Nenhum leilão aberto no momento">
              Assim que um boss for subjugado e itens heroicos droparem, eles aparecerão aqui para lance silencioso por DKP.
            </EmptyState>
          )}
        </section>
      )}

      {/* TAB 2: DIAMOND SALES & COFRE */}
      {activeTab === 'diamonds' && (
        <section className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-background/40 p-4 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Regra de Transparência da Guilda:</p>
            <p className="mt-1">
              Itens que nenhum membro precisa são negociados no Mercado oficial por Diamantes. O valor arrecadado é deduzido da taxa de 9% do Raven 2 e dividido igualitariamente entre os participantes da subjugação (Dividend Split 1/N).
            </p>
          </div>

          {diamondSales.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (diamondSales.data ?? []).length > 0 ? (
            <div className="space-y-3">
              {(diamondSales.data ?? []).map((sale) => (
                <Card key={sale.id} className="border-white/10 bg-card/60">
                  <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-amber-400" />
                        <p className="font-semibold text-foreground">
                          {sale.itemName || 'Item do Cofre'}
                        </p>
                        <Badge tone={sale.status === 'COMPLETED' ? 'green' : 'gold'}>
                          {sale.status === 'COMPLETED' ? 'Distribuído' : 'Pendente de Repasse'}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Responsável pela custódia: <span className="text-foreground">{sale.diamondCustodian}</span> &bull;{' '}
                        {new Date(sale.openedAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-tabular text-lg font-bold text-emerald-400">
                        {sale.diamondTotal.toLocaleString()} 💎
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sale.recipients?.length ?? 0} membros contemplados
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState title="Nenhuma venda de diamantes registrada">
              Quando drops forem vendidos no mercado do Raven 2, a prestação de contas aparecerá aqui.
            </EmptyState>
          )}
        </section>
      )}

      {/* TAB 3: WISHLIST */}
      {activeTab === 'wishlist' && (
        <section className="space-y-6">
          {/* New Wish Form */}
          <Card className="border-primary/20 bg-card/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Adicionar Item aos Desejos da Build</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
                <Select value={itemCatalogId} onChange={(e) => setItemCatalogId(e.target.value)}>
                  <option value="">Selecione o item desejado...</option>
                  {activeItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.namePt}
                    </option>
                  ))}
                </Select>

                <Select value={priority} onChange={(e) => setPriority(e.target.value as WishlistPriority)}>
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      Prioridade: {p}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  placeholder="Motivo / Para qual build esse item é necessário?"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleCreateWish} disabled={createWishlistItem.isPending} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Salvar Desejo
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Active Wishlist Items */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Meus Itens Desejados ({wishlist.data?.length ?? 0}/3)
            </h3>

            {wishlist.isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (wishlist.data ?? []).length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {(wishlist.data ?? []).map((wish) => (
                  <div
                    key={wish.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-background/50 p-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">
                          {wish.itemCatalog?.namePt ?? 'Item'}
                        </p>
                        <Badge tone={wish.priority === 'CRITICAL' || wish.priority === 'HIGH' ? 'gold' : 'blue'}>
                          {wish.priority}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{wish.reason}</p>
                    </div>

                    <Button
                      variant="ghost"
                      onClick={() => setStatus.mutate({ wishlistItemId: wish.id, action: 'remove' })}
                      className="h-7 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    >
                      Remover
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Sua lista de desejos está vazia">
                Indique até 3 itens que fecham sua build para que a liderança saiba de quem é o interesse nos drops.
              </EmptyState>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
