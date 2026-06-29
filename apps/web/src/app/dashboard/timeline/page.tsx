'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowRight, CalendarCheck, Clock3, Coins, Filter, Gavel, PackageCheck, ScrollText, Sparkles, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyHistory } from '@/hooks/use-guild-api';
import { cn } from '@/lib/utils';
import { useLocaleStore } from '@/store/locale-store';
import type { PlayerTimelineEntry } from '@/types/api';

type TimelineGroup = 'all' | 'dkp' | 'loot' | 'auctions' | 'progress' | 'requests' | 'codex' | 'events';
type TimelinePeriod = 'all' | '30d' | '90d' | '365d';

const labels = {
  pt: {
    eyebrow: 'Historico do player',
    title: 'Minha timeline',
    help: 'Um feed narrado do que mudou no seu personagem: ganho, gasto, fila, entrega, review e presenca.',
    empty: 'Ainda nao tem historico registrado.',
    updated: 'Atualizado',
    open: 'Abrir',
    filters: 'Filtros',
    period: 'Periodo',
    total: 'Eventos',
    latest: 'Mais recente',
    periods: {
      all: 'Tudo',
      '30d': '30 dias',
      '90d': '90 dias',
      '365d': '1 ano',
    },
    groups: {
      all: 'Tudo',
      dkp: 'DKP',
      loot: 'Loot',
      auctions: 'Leiloes',
      progress: 'Progresso',
      requests: 'Pedidos',
      codex: 'Codex',
      events: 'Eventos',
    },
  },
  en: {
    eyebrow: 'Player history',
    title: 'My timeline',
    help: 'A narrated feed of what changed for your character: gains, spending, queues, deliveries, reviews, and attendance.',
    empty: 'No history has been registered yet.',
    updated: 'Updated',
    open: 'Open',
    filters: 'Filters',
    period: 'Period',
    total: 'Events',
    latest: 'Latest',
    periods: {
      all: 'All',
      '30d': '30 days',
      '90d': '90 days',
      '365d': '1 year',
    },
    groups: {
      all: 'All',
      dkp: 'DKP',
      loot: 'Loot',
      auctions: 'Auctions',
      progress: 'Progress',
      requests: 'Requests',
      codex: 'Codex',
      events: 'Events',
    },
  },
} as const;

const groupTypes: Record<TimelineGroup, string[]> = {
  all: [],
  dkp: ['DKP'],
  loot: ['DROP_DELIVERED'],
  auctions: ['AUCTION_BID'],
  progress: ['PROGRESS'],
  requests: ['ITEM_REQUEST', 'DAOSHI'],
  codex: ['CODEX'],
  events: ['ATTENDANCE'],
};

const groupOrder: TimelineGroup[] = ['all', 'dkp', 'loot', 'auctions', 'progress', 'requests', 'codex', 'events'];
const periodOrder: TimelinePeriod[] = ['all', '30d', '90d', '365d'];

const groupIcons: Record<TimelineGroup, typeof Activity> = {
  all: Activity,
  dkp: Coins,
  loot: PackageCheck,
  auctions: Gavel,
  progress: Trophy,
  requests: ScrollText,
  codex: Sparkles,
  events: CalendarCheck,
};

function groupForType(type: string): TimelineGroup {
  return groupOrder.find((group) => group !== 'all' && groupTypes[group].includes(type)) ?? 'all';
}

function localizedEntry(entry: PlayerTimelineEntry, locale: string) {
  const usePt = locale === 'pt';
  return {
    title: usePt ? entry.title : entry.titleEn ?? entry.title,
    description: usePt ? entry.description : entry.descriptionEn ?? entry.description,
  };
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'pt' ? 'pt-BR' : 'en-US', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function TimelinePage() {
  const locale = useLocaleStore((state) => state.locale);
  const copy = locale === 'pt' ? labels.pt : labels.en;
  const history = useMyHistory();
  const [activeGroup, setActiveGroup] = useState<TimelineGroup>('all');
  const [activePeriod, setActivePeriod] = useState<TimelinePeriod>('all');
  const timeline = history.data?.timeline ?? [];

  const periodTimeline = useMemo(() => {
    if (activePeriod === 'all') return timeline;
    const days = activePeriod === '30d' ? 30 : activePeriod === '90d' ? 90 : 365;
    const minimumTime = Date.now() - days * 24 * 60 * 60 * 1000;
    return timeline.filter((entry) => new Date(entry.createdAt).getTime() >= minimumTime);
  }, [activePeriod, timeline]);

  const counts = useMemo(() => {
    return periodTimeline.reduce<Record<TimelineGroup, number>>(
      (acc, entry) => {
        acc.all += 1;
        acc[groupForType(entry.type)] += 1;
        return acc;
      },
      { all: 0, dkp: 0, loot: 0, auctions: 0, progress: 0, requests: 0, codex: 0, events: 0 },
    );
  }, [periodTimeline]);

  const filteredTimeline = useMemo(() => {
    if (activeGroup === 'all') return periodTimeline;
    return periodTimeline.filter((entry) => groupTypes[activeGroup].includes(entry.type));
  }, [activeGroup, periodTimeline]);

  const latestEntry = timeline[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase text-primary">{copy.eyebrow}</p>
          <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{copy.title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{copy.help}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
          <div className="rounded-md border bg-background/45 px-4 py-3">
            <p className="text-xs uppercase text-muted-foreground">{copy.total}</p>
            <p className="text-2xl font-bold">{timeline.length}</p>
          </div>
          <div className="rounded-md border bg-background/45 px-4 py-3">
            <p className="text-xs uppercase text-muted-foreground">{copy.latest}</p>
            <p className="text-sm font-semibold">{latestEntry ? formatDate(latestEntry.createdAt, locale) : '-'}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            {copy.filters}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase text-muted-foreground">{copy.period}</span>
            {periodOrder.map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setActivePeriod(period)}
                className={cn(
                  'min-h-10 rounded-md border px-3 text-sm font-semibold transition hover:border-primary/45 focus:outline-none focus:ring-2 focus:ring-ring',
                  activePeriod === period ? 'border-primary/55 bg-primary/15 text-primary' : 'border-white/10 bg-background/45 text-foreground',
                )}
              >
                {copy.periods[period]}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
            {groupOrder.map((group) => {
              const Icon = groupIcons[group];
              const isActive = activeGroup === group;
              return (
                <button
                  key={group}
                  type="button"
                  onClick={() => setActiveGroup(group)}
                  className={cn(
                    'flex min-h-12 items-center justify-between gap-2 rounded-md border px-3 text-left text-sm font-semibold transition hover:border-primary/45 focus:outline-none focus:ring-2 focus:ring-ring',
                    isActive ? 'border-primary/55 bg-primary/15 text-primary' : 'border-white/10 bg-background/45 text-foreground',
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{copy.groups[group]}</span>
                  </span>
                  <span className="rounded-sm bg-background/70 px-1.5 py-0.5 text-xs text-muted-foreground">{counts[group]}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-primary" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {history.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : null}

          {!history.isLoading && filteredTimeline.map((entry) => {
            const group = groupForType(entry.type);
            const Icon = groupIcons[group];
            const localized = localizedEntry(entry, locale);

            return (
              <div key={`${entry.type}-${entry.id}`} className="grid gap-3 rounded-md border bg-background/35 p-4 text-sm transition hover:border-primary/25 md:grid-cols-[180px_1fr_auto] md:items-start">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Icon className="h-4 w-4 text-primary" />
                  <span>{formatDate(entry.createdAt, locale)}</span>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{localized.title}</p>
                    <Badge tone={entry.tone ?? 'muted'}>{copy.groups[group]}</Badge>
                  </div>
                  <p className="mt-2 text-muted-foreground">{localized.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{copy.updated}: {new Date(entry.createdAt).toLocaleString(locale === 'pt' ? 'pt-BR' : 'en-US')}</p>
                </div>
                {entry.href ? (
                  <Link href={entry.href} className="md:justify-self-end">
                    <Button variant="secondary" className="w-full md:w-auto">
                      {copy.open}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                ) : null}
              </div>
            );
          })}

          {!history.isLoading && filteredTimeline.length === 0 && <EmptyState title={copy.empty}>{copy.help}</EmptyState>}
        </CardContent>
      </Card>
    </div>
  );
}
