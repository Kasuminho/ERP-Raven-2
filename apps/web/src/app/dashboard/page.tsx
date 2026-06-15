'use client';

import { useEffect } from 'react';
import { AuctionCard } from '@/components/dashboard/auction-card';
import { AttendanceCard } from '@/components/dashboard/attendance-card';
import { DKPCard } from '@/components/dashboard/dkp-card';
import { OperationTaskList } from '@/components/dashboard/operation-task-list';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { notifyToast } from '@/components/ui/toaster';
import { useAttendanceStats, useAuctions, useDkpLeaderboard, useDkpSummary, useEvents, useItemRequests, usePlayerId, usePlayerOperations } from '@/hooks/use-guild-api';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';

function isBossRequest(request: { itemCatalog?: { category?: string | null } | null }): boolean {
  return request.itemCatalog?.category === 'creature';
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
