'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, Clock3, PackageCheck, ShieldAlert, Trash2, TrendingDown } from 'lucide-react';
import { AuthGuard } from '@/components/guards/auth-guard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FileUploadButton } from '@/components/ui/file-upload-button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { notifyToast } from '@/components/ui/toaster';
import { useApproveItemRequestUpdate, useCreateItemRequest, useCreateMyItemRequest, useDeleteItemRequest, useDeliverItemRequest, useDropItemRequestRank, useItemRequestRankings, useItemRequests, usePlayerUpdateItemRequest, useStaffItemRequests, useUpdateItemRequest } from '@/hooks/use-requests-api';
import { usePlayers, useUploadImage } from '@/hooks/use-profile-api';
import { useRequestableItems } from '@/hooks/use-items-api';
import { displayImageUrl } from '@/lib/images';
import { itemName } from '@/lib/game-labels';
import { t } from '@/lib/i18n';
import { useAuthStore } from '@/store/auth-store';
import { useLocaleStore } from '@/store/locale-store';
import type { ItemRequest } from '@/types/api';

function categoryLabel(locale: ReturnType<typeof useLocaleStore.getState>['locale'], category?: string): string {
  if (category === 'relic') return t(locale, 'relics');
  if (category === 'blueprint') return t(locale, 'heroicBlueprints');
  if (category === 'creature') return t(locale, 'creatures');
  return category ?? 'item';
}

function isBossRequest(request: { itemCatalog?: { category?: string | null } | null }): boolean {
  return request.itemCatalog?.category === 'creature';
}

function smartQueueLabel(locale: ReturnType<typeof useLocaleStore.getState>['locale'], request: ItemRequest): { label: string; tone: 'green' | 'gold' | 'red' | 'blue' | 'muted' } {
  if (isBossRequest(request)) return { label: t(locale, 'queueBossManual'), tone: 'blue' };
  if (request.warned4d || request.warned3d) return { label: t(locale, 'queueBlockedByUpdate'), tone: 'red' };
  if (request.rankPosition === 1) return { label: t(locale, 'queueNextLikely'), tone: 'gold' };
  return { label: t(locale, 'queueNoUpdateNeeded'), tone: 'green' };
}

function queueForecastText(locale: ReturnType<typeof useLocaleStore.getState>['locale'], request: ItemRequest): string {
  if (!request.queueForecast) return '';
  return locale === 'pt' ? request.queueForecast.summaryPt : request.queueForecast.summaryEn;
}

function QueueForecastPanel({ request, staff = false }: { request: ItemRequest; staff?: boolean }) {
  const locale = useLocaleStore((state) => state.locale);
  const forecast = request.queueForecast;

  if (!forecast) {
    return null;
  }

  return (
    <div className="grid gap-2 rounded-md border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm md:grid-cols-[1fr_auto]">
      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Clock3 className="h-4 w-4 text-cyan-200" />
          <p className="font-semibold text-cyan-100">{t(locale, 'queueForecast')}</p>
          <Badge tone={forecast.isNext ? 'gold' : forecast.needsUpdate ? 'red' : 'blue'}>#{forecast.position}/{forecast.queueSize}</Badge>
        </div>
        <p className="text-muted-foreground">{queueForecastText(locale, request)}</p>
        {staff ? <p className="mt-1 text-xs text-muted-foreground">{forecast.staffSummaryPt}</p> : null}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs sm:min-w-72">
        <div className="rounded-sm border bg-background/45 p-2">
          <p className="uppercase text-muted-foreground">{t(locale, 'requestsAhead')}</p>
          <p className="text-lg font-semibold">{forecast.requestsAhead}</p>
        </div>
        <div className="rounded-sm border bg-background/45 p-2">
          <p className="uppercase text-muted-foreground">{t(locale, 'unitsAhead')}</p>
          <p className="text-lg font-semibold">{forecast.unitsAhead}</p>
        </div>
        <div className="rounded-sm border bg-background/45 p-2">
          <p className="uppercase text-muted-foreground">{t(locale, 'updateAge')}</p>
          <p className="font-semibold">{forecast.daysSinceUpdate}d</p>
        </div>
        <div className="rounded-sm border bg-background/45 p-2">
          <p className="uppercase text-muted-foreground">{t(locale, 'lastDelivery')}</p>
          <p className="font-semibold">{forecast.lastDeliveryAt ? new Date(forecast.lastDeliveryAt).toLocaleDateString(locale === 'pt' ? 'pt-BR' : 'en-US') : t(locale, 'noRecentDelivery')}</p>
        </div>
      </div>
    </div>
  );
}

function SwapSuggestionsPanel({ request }: { request: ItemRequest }) {
  const locale = useLocaleStore((state) => state.locale);
  const suggestions = request.swapSuggestions ?? [];

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="rounded-md border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-emerald-100">{t(locale, 'swapSuggestions')}</p>
        <Badge tone="green">{suggestions.length}</Badge>
      </div>
      <div className="grid gap-2 lg:grid-cols-3">
        {suggestions.map((suggestion) => (
          <div key={suggestion.itemCatalogId} className="rounded-sm border bg-background/45 p-3">
            <p className="font-semibold">{locale === 'pt' ? suggestion.itemNamePt : suggestion.itemNameEn}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t(locale, 'estimatedPosition')} #{suggestion.estimatedPosition} - {suggestion.unitsInQueue} {t(locale, 'unitsInQueue')}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{locale === 'pt' ? suggestion.tradeoffPt : suggestion.tradeoffEn}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MaterialPriorityPanel({ request, staff = false }: { request: ItemRequest; staff?: boolean }) {
  const locale = useLocaleStore((state) => state.locale);
  const priority = request.materialPriority;

  if (!priority || priority.reason === 'NONE') {
    return null;
  }

  const isBlocked = priority.affected;
  const text = staff ? priority.staffSummaryPt : locale === 'pt' ? priority.summaryPt : priority.summaryEn;

  if (!text) {
    return null;
  }

  return (
    <div className={`rounded-md border p-3 text-sm ${isBlocked ? 'border-amber-400/30 bg-amber-500/10' : 'border-violet-400/20 bg-violet-500/10'}`}>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <ShieldAlert className={`h-4 w-4 ${isBlocked ? 'text-amber-200' : 'text-violet-200'}`} />
        <p className={`font-semibold ${isBlocked ? 'text-amber-100' : 'text-violet-100'}`}>{t(locale, 'materialPriority')}</p>
        <Badge tone={isBlocked ? 'gold' : 'blue'}>{isBlocked ? t(locale, 'quintessenceBehindT3') : t(locale, 't3CraftPriority')}</Badge>
      </div>
      <p className="text-muted-foreground">{text}</p>
      {staff && priority.materialKey ? <p className="mt-1 text-xs text-muted-foreground">{t(locale, 'material')}: {priority.materialKey}</p> : null}
    </div>
  );
}

function groupRequestsByItem(requests: ItemRequest[] = []) {
  const groups = new Map<string, ItemRequest[]>();

  for (const request of requests) {
    const list = groups.get(request.itemName) ?? [];
    list.push(request);
    groups.set(request.itemName, list);
  }

  return Array.from(groups.entries()).map(([itemName, rows]) => ({
    itemName,
    item: rows[0]?.itemCatalog,
    rows: rows.sort((a, b) => a.rankPosition - b.rankPosition),
  }));
}

export default function ItemRequestsPage() {
  const hasRole = useAuthStore((state) => state.hasRole);
  const isStaff = hasRole(['STAFF', 'ADMIN']);
  const locale = useLocaleStore((state) => state.locale);
  const [view, setView] = useState<'player' | 'staff'>('player');

  return (
    <AuthGuard>
      <div className="space-y-4">
        {isStaff && (
          <div className="flex flex-wrap gap-2 rounded-md border bg-background/45 p-2">
            <Button variant={view === 'player' ? 'primary' : 'secondary'} onClick={() => setView('player')}>
              {t(locale, 'myRequests')}
            </Button>
            <Button variant={view === 'staff' ? 'primary' : 'secondary'} onClick={() => setView('staff')}>
              {t(locale, 'staffTools')}
            </Button>
          </div>
        )}
        {isStaff && view === 'staff' ? <StaffItemRequestsPanel /> : <PlayerItemRequestsPanel />}
      </div>
    </AuthGuard>
  );
}

function PlayerItemRequestsPanel() {
  const locale = useLocaleStore((state) => state.locale);
  const items = useRequestableItems();
  const requests = useItemRequests();
  const rankings = useItemRequestRankings();
  const createRequest = useCreateMyItemRequest();
  const updateRequest = usePlayerUpdateItemRequest();
  const uploadImage = useUploadImage();
  const [form, setForm] = useState({ itemCatalogId: '', quantity: 1, imageUrl: '' });
  const [updateProofs, setUpdateProofs] = useState<Record<string, string>>({});
  const selectedItem = (items.data ?? []).find((item) => item.id === form.itemCatalogId);
  const groupedRankings = useMemo(() => groupRequestsByItem(rankings.data ?? []), [rankings.data]);

  function requestStatus(request: ItemRequest): { label: string; tone: 'green' | 'gold' | 'red' } {
    if (isBossRequest(request)) return { label: t(locale, 'requestUpToDate'), tone: 'green' };
    if (request.updateProofStatus === 'PENDING') return { label: t(locale, 'updatePendingStaffReview'), tone: 'gold' };
    if (request.warned4d) return { label: t(locale, 'requestLastWarning'), tone: 'red' };
    if (request.warned3d) return { label: t(locale, 'requestUpdateNeeded'), tone: 'gold' };
    return { label: t(locale, 'requestUpToDate'), tone: 'green' };
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">{t(locale, 'lootQueue')}</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'myRequests')}</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{t(locale, 'itemRequestsHelp')}</p>
      </div>

      <Card>
        <CardHeader><CardTitle>{t(locale, 'newItemRequest')}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_120px]">
            <Select value={form.itemCatalogId} onChange={(event) => setForm((current) => ({ ...current, itemCatalogId: event.target.value }))}>
              <option value="">{t(locale, 'selectRequestableItem')}</option>
              {(items.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {itemName(item, locale)} - {categoryLabel(locale, item.category)}
                </option>
              ))}
            </Select>
            <Input type="number" min={1} value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: Number(event.target.value) }))} />
          </div>
          <FileUploadButton
            label={t(locale, 'attachImage')}
            onFileSelect={(files) => {
              const file = files?.[0];
              if (file) uploadImage.mutate(file, { onSuccess: (data) => setForm((current) => ({ ...current, imageUrl: data.url })) });
            }}
          />
          {form.imageUrl && <p className="text-center text-xs text-primary">{t(locale, 'printAttached')}</p>}
          <Button
            onClick={() => createRequest.mutate(
              { itemCatalogId: form.itemCatalogId, quantity: Number(form.quantity), imageUrl: form.imageUrl },
              {
                onSuccess: () => {
                  setForm({ itemCatalogId: '', quantity: 1, imageUrl: '' });
                  notifyToast({ title: t(locale, 'itemRequestSent'), tone: 'success' });
                },
              },
            )}
            disabled={!form.itemCatalogId || !form.imageUrl || createRequest.isPending || uploadImage.isPending}
          >
            <ClipboardList className="h-4 w-4" /> {t(locale, 'request')}
          </Button>
          {selectedItem && (
            <div className="rounded-md border bg-background/45 p-3 text-sm">
              <span className="text-muted-foreground">{t(locale, 'category')}: </span>
              <span className="font-semibold">{categoryLabel(locale, selectedItem.category)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t(locale, 'myQueue')}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(requests.data ?? []).map((request) => (
            <div key={request.id} className="space-y-3 rounded-md border bg-background/45 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  {request.imageUrl && <img className="h-16 w-16 rounded-md border object-cover" src={displayImageUrl(request.imageUrl)} alt={request.itemName} />}
                  <div>
                    <p className="font-semibold">{itemName(request.itemCatalog ?? undefined, locale, request.itemName)}</p>
                    <p className="text-sm text-muted-foreground">{t(locale, 'rank')} #{request.rankPosition} - {t(locale, 'remaining')} {request.remainingQuantity}/{request.totalQuantity}</p>
                    <p className="text-xs text-muted-foreground">{t(locale, 'lastUpdate')}: {request.legacyUpdatedAt ? new Date(request.legacyUpdatedAt).toLocaleString() : new Date(request.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={requestStatus(request).tone}>{requestStatus(request).label}</Badge>
                  <Badge tone={request.rankPosition === 1 ? 'gold' : 'blue'}>{categoryLabel(locale, request.itemCatalog?.category)}</Badge>
                </div>
              </div>
              <QueueForecastPanel request={request} />
              <MaterialPriorityPanel request={request} />
              <SwapSuggestionsPanel request={request} />
              {!isBossRequest(request) && request.updateProofImageUrl && (
                <div className="flex items-center gap-3 rounded-md border bg-background/35 p-2 text-sm">
                  <img className="h-14 w-14 rounded-md border object-cover" src={displayImageUrl(request.updateProofImageUrl)} alt={t(locale, 'newUpdateProof')} />
                  <span className="text-muted-foreground">{t(locale, 'newUpdateProof')}</span>
                </div>
              )}
              {!isBossRequest(request) && (
                <div className="space-y-2 rounded-md border border-primary/25 bg-primary/10 p-3">
                  <p className="text-sm text-primary">{t(locale, 'updateRequestProofHelp')}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <FileUploadButton
                      className="max-w-xs"
                      label={t(locale, 'attachImage')}
                      onFileSelect={(files) => {
                        const file = files?.[0];
                        if (file) uploadImage.mutate(file, { onSuccess: (data) => setUpdateProofs((current) => ({ ...current, [request.id]: data.url })) });
                      }}
                    />
                    {updateProofs[request.id] && <span className="text-xs text-primary">{t(locale, 'printAttached')}</span>}
                    <Button
                      variant="secondary"
                      disabled={!updateProofs[request.id] || updateRequest.isPending || uploadImage.isPending}
                      onClick={() => updateRequest.mutate(
                        { id: request.id, imageUrl: updateProofs[request.id] },
                        {
                          onSuccess: () => {
                            setUpdateProofs((current) => ({ ...current, [request.id]: '' }));
                            notifyToast({ title: t(locale, 'requestUpToDate'), tone: 'success' });
                          },
                        },
                      )}
                    >
                      <CheckCircle2 className="h-4 w-4" /> {t(locale, 'updateRequest')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!requests.isLoading && (requests.data ?? []).length === 0 && (
            <EmptyState title={t(locale, 'activeRequestsEmpty')}>{t(locale, 'activeRequestsEmptyHelp')}</EmptyState>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t(locale, 'requestRankingTitle')}</CardTitle>
          <p className="text-sm text-muted-foreground">{t(locale, 'requestRankingHelp')}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {groupedRankings.map((group) => (
            <div key={group.itemName} className="rounded-md border bg-background/35 p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold capitalize">{itemName(group.item ?? undefined, locale, group.itemName)}</p>
                <span className="flex flex-wrap gap-2">
                  {group.item?.category ? <Badge tone="blue">{categoryLabel(locale, group.item.category)}</Badge> : null}
                  <Badge tone="gold">{group.rows.length} {t(locale, 'inQueue')}</Badge>
                </span>
              </div>
              <div className="space-y-2">
                {group.rows.map((request) => (
                  <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background/45 p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Badge tone={request.rankPosition === 1 ? 'gold' : 'muted'}>#{request.rankPosition}</Badge>
                      {request.imageUrl && <img className="h-11 w-11 rounded-md border object-cover" src={displayImageUrl(request.imageUrl)} alt={request.itemName} />}
                      <div className="min-w-0">
                        <p className="font-semibold">{request.player?.nickname ?? request.playerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {t(locale, 'remaining')} {request.remainingQuantity}/{request.totalQuantity}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t(locale, 'lastUpdate')}: {request.legacyUpdatedAt ? new Date(request.legacyUpdatedAt).toLocaleString() : new Date(request.updatedAt).toLocaleString()}
                    </p>
                    <Badge tone={smartQueueLabel(locale, request).tone}>{smartQueueLabel(locale, request).label}</Badge>
                    <div className="w-full">
                      <QueueForecastPanel request={request} />
                      <div className="mt-2">
                        <MaterialPriorityPanel request={request} />
                      </div>
                      <div className="mt-2">
                        <SwapSuggestionsPanel request={request} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!rankings.isLoading && groupedRankings.length === 0 && (
            <EmptyState title={t(locale, 'activeRequestsEmpty')}>{t(locale, 'staffRequestsEmptyHelp')}</EmptyState>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StaffItemRequestsPanel() {
  const locale = useLocaleStore((state) => state.locale);
  const items = useRequestableItems();
  const players = usePlayers();
  const requests = useStaffItemRequests();
  const createRequest = useCreateItemRequest();
  const updateRequest = useUpdateItemRequest();
  const approveUpdate = useApproveItemRequestUpdate();
  const deliverRequest = useDeliverItemRequest();
  const dropRank = useDropItemRequestRank();
  const deleteRequest = useDeleteItemRequest();
  const uploadImage = useUploadImage();
  const [form, setForm] = useState({ itemCatalogId: '', playerId: '', quantity: 1, imageUrl: '' });
  const [deliveryQty, setDeliveryQty] = useState<Record<string, number>>({});
  const [reviewRemaining, setReviewRemaining] = useState<Record<string, number>>({});
  const [confirmation, setConfirmation] = useState<{ kind: 'deliver' | 'delete'; requestId: string; quantity?: number }>();

  const grouped = useMemo(() => groupRequestsByItem(requests.data ?? []), [requests.data]);
  const pendingUpdates = useMemo(
    () => (requests.data ?? []).filter((request) => !isBossRequest(request) && request.updateProofStatus === 'PENDING' && request.updateProofImageUrl),
    [requests.data],
  );

  const selectedItem = (items.data ?? []).find((item) => item.id === form.itemCatalogId);
  const selectedPlayer = (players.data ?? []).find((player) => player.id === form.playerId);

  function submit() {
    createRequest.mutate(
      { ...form, quantity: Number(form.quantity) },
      {
        onSuccess: () => {
          setForm({ itemCatalogId: '', playerId: '', quantity: 1, imageUrl: '' });
          notifyToast({ title: t(locale, 'itemRequestSent'), tone: 'success' });
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">{t(locale, 'lootQueue')}</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'itemRequestsTitle')}</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{t(locale, 'staffItemRequestsHelp')}</p>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>{t(locale, 'newPlayerItemRequest')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_120px]">
            <Select value={form.playerId} onChange={(event) => setForm((current) => ({ ...current, playerId: event.target.value }))}>
              <option value="">{t(locale, 'selectPlayer')}</option>
              {(players.data ?? []).map((player) => (
                <option key={player.id} value={player.id}>
                  {player.nickname} - {player.user.discordUsername}
                </option>
              ))}
            </Select>
            <Select value={form.itemCatalogId} onChange={(event) => setForm((current) => ({ ...current, itemCatalogId: event.target.value }))}>
              <option value="">{t(locale, 'selectRequestableItem')}</option>
              {(items.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {itemName(item, locale)} - {categoryLabel(locale, item.category)}
                </option>
              ))}
            </Select>
            <Input type="number" min={1} value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: Number(event.target.value) }))} />
          </div>
          <FileUploadButton
            label={t(locale, 'attachImage')}
            onFileSelect={(files) => {
              const file = files?.[0];
              if (file) uploadImage.mutate(file, { onSuccess: (data) => setForm((current) => ({ ...current, imageUrl: data.url })) });
            }}
          />
          {form.imageUrl && <p className="text-center text-xs text-primary">{t(locale, 'printAttached')}</p>}
          <Button onClick={submit} disabled={createRequest.isPending || uploadImage.isPending || !form.itemCatalogId || !form.playerId || !form.imageUrl}>
            <ClipboardList className="h-4 w-4" /> {t(locale, 'save')}
          </Button>
          {(selectedItem || selectedPlayer) && (
            <div className="grid gap-3 rounded-md border bg-background/45 p-3 text-sm md:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Player</p>
                <p className="font-semibold">{selectedPlayer?.nickname ?? t(locale, 'noSelection')}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">{t(locale, 'itemCategory')}</p>
                <p className="font-semibold">{selectedItem ? categoryLabel(locale, selectedItem.category) : t(locale, 'noSelection')}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t(locale, 'pendingRequestUpdates')}</CardTitle>
          <p className="text-sm text-muted-foreground">{t(locale, 'pendingRequestUpdatesHelp')}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingUpdates.map((request) => {
            const remainingValue = reviewRemaining[request.id] ?? request.remainingQuantity;

            return (
              <div key={request.id} className="grid gap-3 rounded-md border bg-background/45 p-3 xl:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="gold">{t(locale, 'updatePendingStaffReview')}</Badge>
                    <p className="font-semibold">{request.player?.nickname ?? request.playerName}</p>
                    <span className="text-sm text-muted-foreground">{request.player?.user?.discordUsername ?? request.discordId}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {itemName(request.itemCatalog ?? undefined, locale, request.itemName)} - {t(locale, 'remaining')} {request.remainingQuantity}/{request.totalQuantity}
                  </p>
                  {request.updateProofNote && <p className="mt-1 text-sm">{request.updateProofNote}</p>}
                  <div className="mt-3 flex flex-wrap gap-3">
                    {request.imageUrl && (
                      <a href={request.imageUrl} target="_blank" rel="noreferrer">
                        <img className="h-20 w-20 rounded-md border object-cover" src={displayImageUrl(request.imageUrl)} alt={request.itemName} />
                      </a>
                    )}
                    {!isBossRequest(request) && request.updateProofImageUrl && (
                      <a href={request.updateProofImageUrl} target="_blank" rel="noreferrer">
                        <img className="h-20 w-20 rounded-md border object-cover" src={displayImageUrl(request.updateProofImageUrl)} alt={t(locale, 'newUpdateProof')} />
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:min-w-56">
                  <label className="text-xs uppercase text-muted-foreground">{t(locale, 'remainingAfterReview')}</label>
                  <Input
                    type="number"
                    min={1}
                    max={request.totalQuantity}
                    value={remainingValue}
                    onChange={(event) => setReviewRemaining((current) => ({ ...current, [request.id]: Number(event.target.value) }))}
                  />
                  <Button
                    onClick={() => approveUpdate.mutate(
                      { id: request.id, remainingQuantity: remainingValue },
                      {
                        onSuccess: () => {
                          setReviewRemaining((current) => {
                            const next = { ...current };
                            delete next[request.id];
                            return next;
                          });
                          notifyToast({ title: t(locale, 'playerUpdateApproved'), tone: 'success' });
                        },
                      },
                    )}
                    disabled={approveUpdate.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4" /> {t(locale, 'approveUpdate')}
                  </Button>
                </div>
              </div>
            );
          })}
          {!requests.isLoading && pendingUpdates.length === 0 && (
            <EmptyState title={t(locale, 'noPendingRequestUpdates')}>{t(locale, 'pendingRequestUpdatesHelp')}</EmptyState>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {grouped.map((group) => (
          <Card key={group.itemName} className="overflow-hidden">
            <CardHeader className="border-b bg-muted/25">
              <CardTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="capitalize">{itemName(group.item ?? undefined, locale, group.itemName)}</span>
                <span className="flex flex-wrap gap-2">
                  {group.item?.category ? <Badge tone="blue">{categoryLabel(locale, group.item.category)}</Badge> : null}
                  <Badge tone="gold">{group.rows.length} {t(locale, 'inQueue')}</Badge>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-5">
              {group.rows.map((request) => {
                const qty = deliveryQty[request.id] ?? 1;
                const priorityBlocksDelivery = Boolean(request.materialPriority?.affected);
                return (
                  <div key={request.id} className="grid gap-3 rounded-md border bg-background/45 p-3 xl:grid-cols-[1fr_auto]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={request.rankPosition === 1 ? 'gold' : 'muted'}>#{request.rankPosition}</Badge>
                        <p className="font-semibold">{request.player?.nickname ?? request.playerName}</p>
                        <span className="text-sm text-muted-foreground">{request.player?.user?.discordUsername ?? request.discordId}</span>
                      </div>
                      <div className="mt-2 flex gap-3">
                        {request.imageUrl && <img className="h-16 w-16 rounded-md border object-cover" src={displayImageUrl(request.imageUrl)} alt={request.itemName} />}
                        {!isBossRequest(request) && request.updateProofImageUrl && <img className="h-16 w-16 rounded-md border object-cover" src={displayImageUrl(request.updateProofImageUrl)} alt={t(locale, 'newUpdateProof')} />}
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {t(locale, 'remaining')} {request.remainingQuantity}/{request.totalQuantity}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t(locale, 'lastUpdate')}: {request.legacyUpdatedAt ? new Date(request.legacyUpdatedAt).toLocaleString() : new Date(request.updatedAt).toLocaleString()}
                            {!isBossRequest(request) && request.warned3d ? ' - 3d' : ''}
                            {!isBossRequest(request) && request.warned4d ? ' - 4d' : ''}
                          </p>
                          {!isBossRequest(request) && request.updateProofStatus === 'PENDING' && (
                            <p className="mt-1 text-xs text-primary">{t(locale, 'updatePendingStaffReview')}</p>
                          )}
                        </div>
                      </div>
                      <QueueForecastPanel request={request} staff />
                      <div className="mt-2">
                        <MaterialPriorityPanel request={request} staff />
                      </div>
                      <div className="mt-2">
                        <SwapSuggestionsPanel request={request} />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={request.remainingQuantity}
                        value={qty}
                        onChange={(event) => setDeliveryQty((current) => ({ ...current, [request.id]: Number(event.target.value) }))}
                        className="w-24"
                      />
                      <Button
                        variant="secondary"
                        disabled={deliverRequest.isPending || priorityBlocksDelivery}
                        onClick={() => setConfirmation({ kind: 'deliver', requestId: request.id, quantity: qty })}
                      >
                        <PackageCheck className="h-4 w-4" /> {t(locale, 'deliver')}
                      </Button>
                      {!isBossRequest(request) && (
                        <Button
                          variant="secondary"
                          onClick={() => updateRequest.mutate(request.id, { onSuccess: () => notifyToast({ title: t(locale, 'requestUpToDate'), tone: 'success' }) })}
                        >
                          <CheckCircle2 className="h-4 w-4" /> {t(locale, 'update')}
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        onClick={() => dropRank.mutate(request.id, { onSuccess: () => notifyToast({ title: t(locale, 'dropRank'), tone: 'success' }) })}
                      >
                        <TrendingDown className="h-4 w-4" /> {t(locale, 'dropRank')}
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={deleteRequest.isPending}
                        onClick={() => setConfirmation({ kind: 'delete', requestId: request.id })}
                        title={t(locale, 'removeRequestTitle')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
        {!requests.isLoading && grouped.length === 0 && (
          <EmptyState title={t(locale, 'activeRequestsEmpty')}>{t(locale, 'staffRequestsEmptyHelp')}</EmptyState>
        )}
      </div>
      <ConfirmationDialog
        open={Boolean(confirmation)}
        title={confirmation?.kind === 'deliver' ? 'Confirmar entrega do request?' : t(locale, 'removeRequestTitle')}
        description={confirmation?.kind === 'deliver'
          ? `A entrega de ${confirmation.quantity ?? 0} unidade(s) sera registrada e podera concluir ou reduzir o request.`
          : 'O request sera removido da fila. Esta acao nao entrega item e nao deve ser usada como atalho para concluir a solicitacao.'}
        confirmLabel={confirmation?.kind === 'deliver' ? t(locale, 'deliver') : t(locale, 'removeRequestTitle')}
        pending={deliverRequest.isPending || deleteRequest.isPending}
        tone={confirmation?.kind === 'deliver' ? 'primary' : 'danger'}
        onClose={() => setConfirmation(undefined)}
        onConfirm={() => {
          if (!confirmation) return;
          if (confirmation.kind === 'deliver') {
            deliverRequest.mutate(
              { id: confirmation.requestId, quantity: confirmation.quantity ?? 1 },
              { onSuccess: () => {
                setConfirmation(undefined);
                notifyToast({ title: t(locale, 'delivered'), tone: 'success' });
              } },
            );
            return;
          }
          deleteRequest.mutate(confirmation.requestId, { onSuccess: () => {
            setConfirmation(undefined);
            notifyToast({ title: t(locale, 'removeRequestTitle'), tone: 'success' });
          } });
        }}
      />
    </div>
  );
}
