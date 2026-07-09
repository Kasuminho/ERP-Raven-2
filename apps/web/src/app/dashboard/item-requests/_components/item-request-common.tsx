'use client';

import { Clock3, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { itemName } from '@/lib/game-labels';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';
import type { ItemRequest } from '@/types/api';

export function categoryLabel(locale: ReturnType<typeof useLocaleStore.getState>['locale'], category?: string): string {
  if (category === 'relic') return t(locale, 'relics');
  if (category === 'blueprint') return t(locale, 'heroicBlueprints');
  if (category === 'creature') return t(locale, 'creatures');
  return category ?? 'item';
}

export function isBossRequest(request: { itemCatalog?: { category?: string | null } | null }): boolean {
  return request.itemCatalog?.category === 'creature';
}

export function smartQueueLabel(locale: ReturnType<typeof useLocaleStore.getState>['locale'], request: ItemRequest): { label: string; tone: 'green' | 'gold' | 'red' | 'blue' | 'muted' } {
  if (isBossRequest(request)) return { label: t(locale, 'queueBossManual'), tone: 'blue' };
  if (request.warned4d || request.warned3d) return { label: t(locale, 'queueBlockedByUpdate'), tone: 'red' };
  if (request.rankPosition === 1) return { label: t(locale, 'queueNextLikely'), tone: 'gold' };
  return { label: t(locale, 'queueNoUpdateNeeded'), tone: 'green' };
}

function queueForecastText(locale: ReturnType<typeof useLocaleStore.getState>['locale'], request: ItemRequest): string {
  if (!request.queueForecast) return '';
  return locale === 'pt' ? request.queueForecast.summaryPt : request.queueForecast.summaryEn;
}

export function QueueForecastPanel({ request, staff = false }: { request: ItemRequest; staff?: boolean }) {
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

export function SwapSuggestionsPanel({ request }: { request: ItemRequest }) {
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

export function MaterialPriorityPanel({ request, staff = false }: { request: ItemRequest; staff?: boolean }) {
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

export function groupRequestsByItem(requests: ItemRequest[] = []) {
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
