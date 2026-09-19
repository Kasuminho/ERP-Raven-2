'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Swords, Calendar, Clock, ShieldCheck, CheckCircle2, XCircle, AlertCircle, ShieldAlert, ArrowRight, Check, X } from 'lucide-react';
import { AttendanceCard } from '@/components/dashboard/attendance-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { notifyToast } from '@/components/ui/toaster';
import { useEvents, useMyEventCommitments, useRespondEventRsvp } from '@/hooks/use-events-api';
import { useAttendanceStats, usePlayerAttendanceHistory, usePlayerId } from '@/hooks/use-profile-api';
import { t } from '@/lib/i18n';
import { useAuthStore } from '@/store/auth-store';
import { useLocaleStore } from '@/store/locale-store';
import type { EventRecord, EventRsvpStatus } from '@/types/api';

function eventTypeTone(type: string): 'gold' | 'blue' | 'red' | 'green' | 'muted' {
  switch (type) {
    case 'WORLD_BOSS':
    case 'FIELD_BOSS':
      return 'red';
    case 'GUILD_DUNGEON':
      return 'blue';
    case 'ANCIENT_FORTRESS':
    case 'CLASH':
      return 'gold';
    default:
      return 'muted';
  }
}

export default function EventsWarHubPage() {
  const locale = useLocaleStore((state) => state.locale);
  const playerId = usePlayerId();
  const hasRole = useAuthStore((state) => state.hasRole);
  const isStaff = hasRole(['STAFF', 'ADMIN']);

  const [activeTab, setActiveTab] = useState<'schedule' | 'history'>('schedule');

  // Queries
  const events = useEvents();
  const stats = useAttendanceStats(playerId);
  const commitments = useMyEventCommitments();
  const history = usePlayerAttendanceHistory(playerId);

  // Mutations
  const respondRsvp = useRespondEventRsvp();

  const activeOrUpcomingEvents = useMemo(() => {
    const list = events.data ?? [];
    return list
      .filter((e) => ['OPEN', 'ATTENDANCE_REGISTRATION'].includes(e.status))
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [events.data]);

  const nextBoss = useMemo(() => {
    return activeOrUpcomingEvents[0] ?? null;
  }, [activeOrUpcomingEvents]);

  const pastEvents = useMemo(() => {
    return (history.data ?? []).filter((h) => h.status !== 'CANCELLED').slice(0, 10);
  }, [history.data]);

  function handleRsvp(eventId: string, status: EventRsvpStatus) {
    respondRsvp.mutate(
      { eventId, status },
      {
        onSuccess: () => {
          notifyToast({
            title: status === 'CONFIRMED' ? 'Presença confirmada!' : 'Ausência informada.',
            tone: status === 'CONFIRMED' ? 'success' : 'info',
          });
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
            <p className="page-kicker">{t(locale, 'hubWar')}</p>
            <h1 className="page-title mt-1 text-2xl sm:text-3xl">Guerra, Bosses & Presença</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Cronograma de Field Bosses, Masmorra de Guilda, Fissura e chamadas de presença rápida.
            </p>
          </div>
          {isStaff && (
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/staff/events">
                <Button variant="secondary" className="gap-2 border border-primary/30 text-primary">
                  <ShieldAlert className="h-4 w-4" />
                  Gerenciar Eventos Staff
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Highlight Banner: Next Boss */}
        {nextBoss && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-primary/30 bg-primary/10 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20 text-primary">
                <Swords className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Badge tone={eventTypeTone(nextBoss.type)}>{nextBoss.type}</Badge>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Próximo Objetivo</p>
                </div>
                <h3 className="mt-0.5 text-lg font-bold text-foreground">{nextBoss.name}</h3>
                <p className="text-xs text-muted-foreground">
                  Início: {new Date(nextBoss.startsAt).toLocaleString()} &bull; Recompensa e presença da guilda
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleRsvp(nextBoss.id, 'CONFIRMED')}
                disabled={respondRsvp.isPending}
                className="h-8 gap-1.5 px-3 text-xs bg-emerald-600 hover:bg-emerald-500"
              >
                <Check className="h-4 w-4" />
                Vou Participar
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleRsvp(nextBoss.id, 'DECLINED')}
                disabled={respondRsvp.isPending}
                className="h-8 gap-1.5 px-3 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
                Não Posso
              </Button>
            </div>
          </div>
        )}

        {/* Quick Discipline Card */}
        <div className="mt-6">
          <AttendanceCard
            percentage={stats.data?.attendancePercentage}
            participated={stats.data?.participatedEvents}
            eligible={stats.data?.eligibleEvents}
          />
        </div>
      </section>

      {/* Tabs */}
      <div className="flex border-b border-white/10 pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition ${
            activeTab === 'schedule'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Próximos Bosses ({activeOrUpcomingEvents.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition ${
            activeTab === 'history'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Meu Histórico de Presença</span>
        </button>

        <Link
          href="/dashboard/attendance"
          className="ml-auto flex items-center gap-1.5 px-3 py-3 text-xs text-muted-foreground hover:text-primary"
        >
          <span>Justificar Ausências</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* TAB 1: SCHEDULE */}
      {activeTab === 'schedule' && (
        <section className="space-y-4">
          {events.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : activeOrUpcomingEvents.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {activeOrUpcomingEvents.map((event) => {
                const commitment = commitments.data?.find((c) => c.event.id === event.id);
                const isConfirmed = commitment?.myRsvp?.status === 'CONFIRMED';
                const isDeclined = commitment?.myRsvp?.status === 'DECLINED';

                return (
                  <div
                    key={event.id}
                    className="flex flex-col justify-between rounded-xl border border-white/10 bg-card/70 p-4 transition-all hover:border-primary/30"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <Badge tone={eventTypeTone(event.type)}>{event.type}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {event.status === 'ATTENDANCE_REGISTRATION' ? '⚡ Presença Aberta' : 'Agendado'}
                        </span>
                      </div>
                      <h3 className="mt-2 text-base font-bold text-foreground">{event.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(event.startsAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                      <div className="text-xs">
                        {isConfirmed && (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Confirmado
                          </span>
                        )}
                        {isDeclined && (
                          <span className="inline-flex items-center gap-1 text-red-400">
                            <XCircle className="h-3.5 w-3.5" /> Ausente
                          </span>
                        )}
                        {!isConfirmed && !isDeclined && (
                          <span className="text-muted-foreground">Sem resposta</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant={isConfirmed ? 'secondary' : 'ghost'}
                          onClick={() => handleRsvp(event.id, 'CONFIRMED')}
                          disabled={respondRsvp.isPending}
                          className="h-8 gap-1 text-xs hover:bg-emerald-500/20 hover:text-emerald-300"
                        >
                          <Check className="h-3 w-3" /> Sim
                        </Button>
                        <Button
                          variant={isDeclined ? 'secondary' : 'ghost'}
                          onClick={() => handleRsvp(event.id, 'DECLINED')}
                          disabled={respondRsvp.isPending}
                          className="h-8 gap-1 text-xs text-muted-foreground hover:bg-red-500/20 hover:text-red-300"
                        >
                          <X className="h-3 w-3" /> Não
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState title="Nenhum evento futuro agendado">
              A liderança publicará aqui os próximos horários de Field Bosses e Masmorras de Guilda.
            </EmptyState>
          )}
        </section>
      )}

      {/* TAB 2: HISTORY */}
      {activeTab === 'history' && (
        <section className="space-y-4">
          {history.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : pastEvents.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-card/60">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-white/10 bg-background/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Evento</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {pastEvents.map((row) => (
                    <tr key={row.eventId} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-semibold text-foreground">{row.name}</td>
                      <td className="px-4 py-3">
                        <Badge tone={eventTypeTone(row.type)}>{row.type}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(row.startsAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge tone={row.attendanceStatus === 'PRESENT' ? 'green' : row.attendanceStatus === 'ABSENT' ? 'red' : 'gold'}>
                          {row.attendanceStatus === 'PRESENT' ? 'Presente' : row.attendanceStatus === 'ABSENT' ? 'Ausente' : 'Pendente'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="Nenhum histórico de evento recente">
              Suas presenças confirmadas e participação em bosses aparecerão aqui.
            </EmptyState>
          )}
        </section>
      )}
    </div>
  );
}
