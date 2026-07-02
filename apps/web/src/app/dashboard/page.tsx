'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AuctionCard } from '@/components/dashboard/auction-card';
import { AttendanceCard } from '@/components/dashboard/attendance-card';
import { DKPCard } from '@/components/dashboard/dkp-card';
import { OperationTaskList } from '@/components/dashboard/operation-task-list';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { notifyToast } from '@/components/ui/toaster';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { useAttendanceStats, useMyNotifications, usePlayerActionPlan, usePlayerId, usePlayerOperations } from '@/hooks/use-profile-api';
import { useAuctions } from '@/hooks/use-auctions-api';
import { useDkpLeaderboard, useDkpSummary } from '@/hooks/use-dkp-api';
import { useEvents } from '@/hooks/use-events-api';
import { useItemRequests } from '@/hooks/use-requests-api';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';
import type { PlayerActionPlan } from '@/types/api';

function isBossRequest(request: { itemCatalog?: { category?: string | null } | null }): boolean {
  return request.itemCatalog?.category === 'creature';
}

const actionTone = {
  high: 'red',
  medium: 'gold',
  low: 'blue',
} as const;

function ActionPlanPanel({ plan }: { plan?: PlayerActionPlan }) {
  if (!plan) {
    return <Skeleton className="h-44" />;
  }

  return (
    <Card className="border-primary/25 bg-card/70">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle>{plan.headline}</CardTitle>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{plan.summary}</p>
          </div>
          <p className="text-xs text-muted-foreground">{new Date(plan.generatedAt).toLocaleString()}</p>
        </div>
      </CardHeader>
      <CardContent>
        {plan.cards.length ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {plan.cards.map((card) => (
              <div key={`${card.type}-${card.id}`} className="rounded-lg border border-white/10 bg-background/45 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{card.title}</p>
                      <Badge tone={actionTone[card.priority]}>{card.priority}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{card.description}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Motivo: {card.reason}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Impacto: {card.impact}</p>
                    {card.dueAt ? <p className="mt-1 text-xs text-muted-foreground">Prazo: {new Date(card.dueAt).toLocaleString()}</p> : null}
                  </div>
                  <Link href={card.href} className="shrink-0">
                    <Button variant="secondary" className="gap-2">
                      {card.actionLabel}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-200" />
            Sem acao urgente agora. Da ate para respirar antes do proximo boss.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const locale = useLocaleStore((state) => state.locale);
  const playerId = usePlayerId();
  const dkp = useDkpSummary(playerId);
  const auctions = useAuctions();
  const attendance = useAttendanceStats(playerId);
  const events = useEvents();
  const leaderboard = useDkpLeaderboard();
  const itemRequests = useItemRequests();
  const operations = usePlayerOperations();
  const actionPlan = usePlayerActionPlan();
  const notifications = useMyNotifications();
  const requestsNeedingUpdate = (itemRequests.data ?? []).filter((request) => !isBossRequest(request) && request.rankPosition === 1 && (request.warned3d || request.warned4d));
  const upcomingEvents = (events.data ?? [])
    .filter((event) => ['OPEN', 'ATTENDANCE_REGISTRATION'].includes(event.status) && new Date(event.startsAt).getTime() >= Date.now())
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime())
    .slice(0, 3);

  useEffect(() => {
    if (requestsNeedingUpdate.length === 0) {
      return;
    }

    const key = `request-update-toast-${requestsNeedingUpdate.map((request) => request.id).sort().join('-')}`;
    if (sessionStorage.getItem(key)) {
      return;
    }

    sessionStorage.setItem(key, '1');
    notifyToast({
      title: t(locale, 'requestUpdateToastTitle'),
      description: t(locale, 'requestUpdateToastDescription'),
      tone: 'info',
    });
  }, [locale, requestsNeedingUpdate]);

  useEffect(() => {
    const unread = (notifications.data ?? []).filter((notification) => !notification.readAt);
    if (unread.length === 0) return;

    const key = `internal-notifications-toast-${unread.map((notification) => notification.id).sort().join('-')}`;
    if (sessionStorage.getItem(key)) return;

    sessionStorage.setItem(key, '1');
    notifyToast({
      title: t(locale, 'internalNotifications'),
      description: `${unread.length} ${t(locale, 'unread')}`,
      tone: 'info',
    });
  }, [locale, notifications.data]);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-primary/15 bg-card/55 p-4 shadow-rune backdrop-blur-xl sm:p-6">
        <p className="page-kicker">{t(locale, 'guildCommand')}</p>
        <h1 className="page-title mt-2">{t(locale, 'todaysOperations')}</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          {t(locale, 'guildOperationsDeck')}
        </p>
      </section>
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        {dkp.isLoading ? <Skeleton className="h-32" /> : <DKPCard {...dkp.data} />}
        {attendance.isLoading ? <Skeleton className="h-32" /> : (
          <AttendanceCard percentage={attendance.data?.attendancePercentage} participated={attendance.data?.participatedEvents} eligible={attendance.data?.eligibleEvents} />
        )}
      </div>
      <ActionPlanPanel plan={actionPlan.data} />
      {requestsNeedingUpdate.length > 0 && (
        <Card className="border-primary/45 bg-primary/10">
          <CardHeader><CardTitle>{t(locale, 'requestUpdateToastTitle')}</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-primary">
            <p>{t(locale, 'requestUpdateToastDescription')}</p>
            {requestsNeedingUpdate.map((request) => (
              <p key={request.id} className="font-semibold">{request.itemName} - {request.warned4d ? t(locale, 'requestLastWarning') : t(locale, 'requestUpdateNeeded')}</p>
            ))}
          </CardContent>
        </Card>
      )}
      <OperationTaskList
        title={t(locale, 'myPendingTasks')}
        tasks={operations.data?.tasks ?? []}
        emptyText={t(locale, 'myPendingTasksEmpty')}
        ownerLabel={locale === 'pt' ? 'Voce' : 'You'}
      />
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="page-kicker">{t(locale, 'auctions')}</p>
            <h2 className="font-[var(--font-cinzel)] text-2xl font-bold">{t(locale, 'activeAuctions')}</h2>
          </div>
        </div>
        {auctions.data?.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {auctions.data.slice(0, 6).map((auction) => <AuctionCard key={auction.id} auction={auction} />)}
          </div>
        ) : <EmptyState title={t(locale, 'noActiveAuctions')}>{t(locale, 'noActiveAuctionsHelp')}</EmptyState>}
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t(locale, 'dkpRank')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(leaderboard.data ?? []).map((row, index) => (
              <div key={row.playerId} className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-background/38 p-3 text-sm">
                <span className="min-w-0 truncate font-semibold">#{index + 1} {row.nickname}</span>
                <span className="shrink-0 text-primary">{row.total} DKP</span>
              </div>
            ))}
            {!leaderboard.isLoading && (leaderboard.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">{t(locale, 'noDkpYet')}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t(locale, 'upcomingEvents')}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {upcomingEvents.length > 0 ? upcomingEvents.map((event) => (
              <div key={event.id} className="rounded-md border border-white/10 bg-background/38 p-3 text-sm">
                <p className="font-semibold">{event.name}</p>
                <p className="text-xs text-muted-foreground">{event.type} - {new Date(event.startsAt).toLocaleString()}</p>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">{t(locale, 'noUpcomingEvents')}</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
