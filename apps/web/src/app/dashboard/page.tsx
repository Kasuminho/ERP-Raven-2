'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AuctionCard } from '@/components/dashboard/auction-card';
import { AttendanceCard } from '@/components/dashboard/attendance-card';
import { DKPCard } from '@/components/dashboard/dkp-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { notifyToast } from '@/components/ui/toaster';
import { ArrowRight, CheckCircle2, Sparkles, Swords, Gem, UsersRound, Calendar, ShieldAlert } from 'lucide-react';
import { useAttendanceStats, useMyNotifications, usePlayerId } from '@/hooks/use-profile-api';
import { useAuctions } from '@/hooks/use-auctions-api';
import { useDkpLeaderboard, useDkpSummary } from '@/hooks/use-dkp-api';
import { useEvents } from '@/hooks/use-events-api';
import { usePlayers } from '@/hooks/use-profile-api';
import { t } from '@/lib/i18n';
import { useAuthStore } from '@/store/auth-store';
import { useLocaleStore } from '@/store/locale-store';

export default function DashboardPage() {
  const locale = useLocaleStore((state) => state.locale);
  const playerId = usePlayerId();
  const hasRole = useAuthStore((state) => state.hasRole);
  const isStaff = hasRole(['STAFF', 'ADMIN']);

  const dkp = useDkpSummary(playerId);
  const auctions = useAuctions();
  const attendance = useAttendanceStats(playerId);
  const events = useEvents();
  const leaderboard = useDkpLeaderboard();
  const players = usePlayers();
  const notifications = useMyNotifications();

  const activeAuctions = (auctions.data ?? []).filter((a) => a.status === 'OPEN');

  const upcomingEvents = (events.data ?? [])
    .filter((event) => ['OPEN', 'ATTENDANCE_REGISTRATION'].includes(event.status) && new Date(event.startsAt).getTime() >= Date.now())
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());

  const nextEvent = upcomingEvents[0] ?? null;

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
      {/* Hero Welcome Banner */}
      <section className="rounded-xl border border-primary/25 bg-card/60 p-5 shadow-rune backdrop-blur-xl sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="page-kicker">G3X &bull; ERP Raven 2</p>
            <h1 className="page-title mt-1 text-2xl sm:text-3xl font-bold">Comando & Operação do Dia</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Tudo o que você precisa saber para a jornada de hoje: próximos bosses, leilões ativos e status de presença.
            </p>
          </div>
          {isStaff && (
            <Link href="/dashboard/staff">
              <Button variant="secondary" className="gap-2 border border-primary/40 bg-primary/10 text-primary">
                <ShieldAlert className="h-4 w-4" />
                Painel Staff
              </Button>
            </Link>
          )}
        </div>

        {/* 4 Macro Hubs Quick Access */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Hub 1: Guerra */}
          <Link
            href="/dashboard/events"
            className="group flex flex-col justify-between rounded-lg border border-white/10 bg-background/50 p-4 transition-all hover:border-primary/40 hover:bg-primary/5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground group-hover:text-primary">Guerra & Bosses</span>
              <Swords className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-3">
              <p className="truncate text-base font-bold text-foreground group-hover:text-primary">
                {nextEvent ? nextEvent.name : 'Sem boss hoje'}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {nextEvent ? new Date(nextEvent.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ver cronograma'}
              </p>
            </div>
          </Link>

          {/* Hub 2: Loot */}
          <Link
            href="/dashboard/loot"
            className="group flex flex-col justify-between rounded-lg border border-white/10 bg-background/50 p-4 transition-all hover:border-primary/40 hover:bg-primary/5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground group-hover:text-primary">Loot & Cofre</span>
              <Gem className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mt-3">
              <p className="font-tabular text-xl font-bold text-foreground group-hover:text-primary">
                {activeAuctions.length} <span className="text-xs font-normal text-muted-foreground">leilões</span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">Lances silenciosos</p>
            </div>
          </Link>

          {/* Hub 3: Guilda */}
          <Link
            href="/dashboard/members"
            className="group flex flex-col justify-between rounded-lg border border-white/10 bg-background/50 p-4 transition-all hover:border-primary/40 hover:bg-primary/5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground group-hover:text-primary">Guilda & Roster</span>
              <UsersRound className="h-4 w-4 text-blue-400" />
            </div>
            <div className="mt-3">
              <p className="font-tabular text-xl font-bold text-foreground group-hover:text-primary">
                {players.data?.length ?? 0} <span className="text-xs font-normal text-muted-foreground">membros</span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">Ver classes e CP</p>
            </div>
          </Link>

          {/* Hub 4: DKP */}
          <div className="flex flex-col justify-between rounded-lg border border-white/10 bg-background/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Meu Saldo</span>
              <Sparkles className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-3">
              <p className="font-tabular text-xl font-bold text-emerald-400">
                {dkp.data?.total ?? 0} <span className="text-xs font-normal text-muted-foreground">DKP</span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">Pontuação de presença</p>
            </div>
          </div>
        </div>
      </section>

      {/* DKP & Attendance Cards */}
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        {dkp.isLoading ? <Skeleton className="h-32" /> : <DKPCard {...dkp.data} />}
        {attendance.isLoading ? (
          <Skeleton className="h-32" />
        ) : (
          <AttendanceCard
            percentage={attendance.data?.attendancePercentage}
            participated={attendance.data?.participatedEvents}
            eligible={attendance.data?.eligibleEvents}
          />
        )}
      </div>

      {/* Active Auctions Section */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="page-kicker">Loot de Guilda</p>
            <h2 className="font-[var(--font-cinzel)] text-2xl font-bold">Leilões Ativos</h2>
          </div>
          <Link href="/dashboard/loot" className="text-xs text-primary hover:underline">
            Ver central de loot completa &rarr;
          </Link>
        </div>

        {activeAuctions.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeAuctions.slice(0, 6).map((auction) => (
              <AuctionCard key={auction.id} auction={auction} />
            ))}
          </div>
        ) : (
          <EmptyState title="Nenhum leilão em andamento">
            Itens dropados de bosses de campo e masmorras aparecerão aqui para lances da guilda.
          </EmptyState>
        )}
      </section>

      {/* Bottom Grid: DKP Leaderboard & Upcoming Events */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-white/10 bg-card/70">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-bold">Top DKP da Guilda</CardTitle>
            <Link href="/dashboard/members" className="text-xs text-muted-foreground hover:text-primary">
              Ver todos &rarr;
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {(leaderboard.data ?? []).slice(0, 5).map((row, index) => (
              <div
                key={row.playerId}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-background/40 p-3 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-tabular text-xs font-bold text-primary">#{index + 1}</span>
                  <span className="font-semibold text-foreground">{row.nickname}</span>
                </div>
                <span className="font-tabular font-bold text-primary">{row.total} DKP</span>
              </div>
            ))}
            {!leaderboard.isLoading && (leaderboard.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum registro de DKP encontrado.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-card/70">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-bold">Próximos Eventos</CardTitle>
            <Link href="/dashboard/events" className="text-xs text-muted-foreground hover:text-primary">
              Ver agenda &rarr;
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.slice(0, 5).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-background/40 p-3 text-sm"
                >
                  <div>
                    <p className="font-semibold text-foreground">{event.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.type} &bull; {new Date(event.startsAt).toLocaleString()}
                    </p>
                  </div>
                  <Link href="/dashboard/events">
                    <Button variant="ghost" className="h-7 text-xs">
                      RSVP
                    </Button>
                  </Link>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum evento agendado no momento.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
