'use client';

import { useMemo, useState } from 'react';
import { AuthGuard } from '@/components/guards/auth-guard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { notifyToast } from '@/components/ui/toaster';
import { useCancelEvent, useCreateEvent, useCreateEventSeries, useEventAttendance, useEventBatchPanel, useEventFinalizationChecklist, useEventReadiness, useEventRsvpStaffSummary, useEventSeries, useEvents, useFinalizeEvent, useMarkEventChecklistItem, usePromoteEventReserve, useRegisterAttendance, useRemoveAttendance, useRemoveEventReserve, useSetEventSeriesPaused, useUpdateEventCompositionTargets, useUpdateEventSeriesExceptions, useUpsertEventReserve } from '@/hooks/use-events-api';
import { usePlayers } from '@/hooks/use-profile-api';
import { playerClassLabel } from '@/lib/game-labels';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';
import type { EventCompositionTarget, EventOperationalCategory, EventOperationalPriority, EventType, PlayerClass } from '@/types/api';

const eventTypes: EventType[] = [
  'LUNOS',
  'RIGRETO',
  'GARDRON',
  'MELKAR',
  'VARGAS',
  'BELLAMONICA',
  'SION',
  'ISTERIA',
  'NIDROK',
  'MORGON',
  'GUILD_DUNGEON',
  'SATURDAY_EVENT',
  'ABYSS_1',
  'ABYSS_1_2',
  'FLOUD',
  'KRATERIUS',
  'T3_ROTATION',
];

const operationalCategories: EventOperationalCategory[] = ['BOSS', 'ABYSS', 'GUILD_RAID', 'FARM', 'TRAINING', 'CLASH', 'CUSTOM'];
const priorities: EventOperationalPriority[] = ['LOW', 'MEDIUM', 'HIGH'];
const combatRoles = ['FRONTLINE', 'BACKLINE', 'SUPPORT', 'CALLER', 'SCOUT', 'FLEX', 'RESERVE'];
const playerClasses: PlayerClass[] = ['GUNSLINGER', 'BERSERKER', 'DESTROYER', 'DEATHBRINGER', 'ASSASSIN', 'DIVINE_CASTER', 'NIGHT_RANGER', 'VANGUARD', 'ELEMENTALIST', 'WARLORD'];

export default function AdminEventsPage() {
  const events = useEvents();
  const eventSeries = useEventSeries();
  const locale = useLocaleStore((state) => state.locale);
  const players = usePlayers();
  const createEvent = useCreateEvent();
  const createEventSeries = useCreateEventSeries();
  const setSeriesPaused = useSetEventSeriesPaused();
  const updateSeriesExceptions = useUpdateEventSeriesExceptions();
  const updateCompositionTargets = useUpdateEventCompositionTargets();
  const upsertReserve = useUpsertEventReserve();
  const removeReserve = useRemoveEventReserve();
  const promoteReserve = usePromoteEventReserve();
  const registerAttendance = useRegisterAttendance();
  const removeAttendance = useRemoveAttendance();
  const finalizeEvent = useFinalizeEvent();
  const cancelEvent = useCancelEvent();
  const markChecklistItem = useMarkEventChecklistItem();
  const [name, setName] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [eventType, setEventType] = useState<EventType>('LUNOS');
  const [operationalCategory, setOperationalCategory] = useState<EventOperationalCategory>('BOSS');
  const [priority, setPriority] = useState<EventOperationalPriority>('MEDIUM');
  const [operationalNotes, setOperationalNotes] = useState('');
  const [seriesName, setSeriesName] = useState('');
  const [seriesStartsAt, setSeriesStartsAt] = useState('');
  const [seriesDuration, setSeriesDuration] = useState(120);
  const [seriesInterval, setSeriesInterval] = useState(1);
  const [seriesTimezone, setSeriesTimezone] = useState('America/Sao_Paulo');
  const [seriesExceptions, setSeriesExceptions] = useState<Record<string, string>>({});
  const [targetRole, setTargetRole] = useState('');
  const [targetClass, setTargetClass] = useState('');
  const [targetMinimum, setTargetMinimum] = useState(1);
  const [reservePlayerId, setReservePlayerId] = useState('');
  const [reservePosition, setReservePosition] = useState(1);
  const [reserveReason, setReserveReason] = useState('');
  const [reserveAction, setReserveAction] = useState<{ type: 'promote' | 'remove'; playerId: string; nickname: string }>();
  const [selectedEventId, setSelectedEventId] = useState('');
  const [hideFinalized, setHideFinalized] = useState(true);
  const [confirmation, setConfirmation] = useState<'finalize' | 'cancel'>();
  const [cancelReason, setCancelReason] = useState('');
  const attendance = useEventAttendance(selectedEventId);
  const finalizationChecklist = useEventFinalizationChecklist(selectedEventId);
  const readiness = useEventReadiness(selectedEventId);
  const rsvpSummary = useEventRsvpStaffSummary(selectedEventId);
  const selectedEvent = attendance.data ?? events.data?.find((event) => event.id === selectedEventId);
  const selectedBatchId = selectedEvent?.attendanceBatchId ?? '';
  const batchPanel = useEventBatchPanel(selectedBatchId);
  const visibleEvents = useMemo(
    () => (events.data ?? []).filter((event) => !hideFinalized || !['FINALIZED', 'CANCELLED'].includes(event.status)),
    [events.data, hideFinalized],
  );
  const presentPlayerIds = useMemo(
    () => new Set((attendance.data?.attendances ?? []).filter((row) => row.attended).map((row) => row.playerId)),
    [attendance.data?.attendances],
  );
  const activePlayers = useMemo(() => (players.data ?? []).filter((player) => player.isActive), [players.data]);
  const isFinalized = selectedEvent?.status === 'FINALIZED';
  const isCancelled = selectedEvent?.status === 'CANCELLED';
  const isClosed = isFinalized || isCancelled;
  const absentCount = Math.max(0, activePlayers.length - presentPlayerIds.size);
  const totalDkp = (selectedEvent?.dkpReward ?? 0) * presentPlayerIds.size;

  function create() {
    if (!name.trim() || !startsAt) return;
    createEvent.mutate(
      {
        name,
        type: eventType,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
        operationalCategory,
        priority,
        operationalNotes: operationalNotes.trim() || undefined,
      },
      {
        onSuccess: (event: { id: string }) => {
          setSelectedEventId(event.id);
          setName('');
          setStartsAt('');
          setEndsAt('');
          setOperationalNotes('');
          notifyToast({ title: t(locale, 'eventCreated'), tone: 'success' });
        },
      },
    );
  }

  function createSeries() {
    if (!seriesName.trim() || !seriesStartsAt) return;
    createEventSeries.mutate({
      name: seriesName.trim(),
      type: eventType,
      firstStartsAt: new Date(seriesStartsAt).toISOString(),
      durationMinutes: seriesDuration,
      intervalWeeks: seriesInterval,
      timezone: seriesTimezone,
      operationalCategory,
      priority,
    }, {
      onSuccess: () => {
        setSeriesName('');
        setSeriesStartsAt('');
        notifyToast({ title: 'Série criada e instâncias materializadas.', tone: 'success' });
      },
    });
  }

  function addCompositionTarget() {
    if (!selectedEventId || (!targetRole && !targetClass)) return;
    const next: EventCompositionTarget[] = [
      ...(rsvpSummary.data?.compositionTargets ?? []).map(({ confirmed: _confirmed, gap: _gap, ...target }) => target),
      { role: targetRole || null, playerClass: targetClass || null, minimum: targetMinimum },
    ];
    updateCompositionTargets.mutate({ eventId: selectedEventId, targets: next }, {
      onSuccess: () => {
        setTargetRole('');
        setTargetClass('');
        setTargetMinimum(1);
        notifyToast({ title: 'Alvo de composição atualizado.', tone: 'success' });
      },
    });
  }

  function toggleAttendance(playerId: string) {
    if (!selectedEventId || isCancelled) return;

    if (presentPlayerIds.has(playerId)) {
      removeAttendance.mutate({ eventId: selectedEventId, playerId }, { onSuccess: () => notifyToast({ title: t(locale, 'attendanceRemoved'), tone: 'success' }) });
      return;
    }

    registerAttendance.mutate({ eventId: selectedEventId, playerId }, { onSuccess: () => notifyToast({ title: t(locale, 'attendanceMarked'), tone: 'success' }) });
  }

  function cancelSelectedEvent() {
    if (!selectedEvent) return;

    cancelEvent.mutate(
      { eventId: selectedEvent.id, reason: cancelReason.trim() || undefined },
      { onSuccess: () => {
        setConfirmation(undefined);
        setCancelReason('');
        notifyToast({ title: t(locale, 'eventCancelledRefunded'), tone: 'success' });
      } },
    );
  }

  function finalizeSelectedEvent() {
    if (!selectedEvent) return;

    finalizeEvent.mutate(selectedEvent.id, {
      onSuccess: (result) => {
        setConfirmation(undefined);
        if (!result.nextEvent) {
          notifyToast({ title: 'Evento finalizado. Esse era o ultimo boss do lote.', tone: 'success' });
          return;
        }

        setSelectedEventId(result.nextEvent.id);

        if (result.attendanceCopyStatus === 'NEXT_EVENT_NOT_EMPTY') {
          notifyToast({ title: `Evento finalizado. ${result.nextEvent.name} ja tinha presencas e foi aberto sem sobrescrever nada.`, tone: 'success' });
          return;
        }

        notifyToast({ title: `Evento finalizado. ${result.copiedAttendanceCount} presencas copiadas para ${result.nextEvent.name}; revise e confirme.`, tone: 'success' });
      },
    });
  }

  function openBatchAction() {
    const nextEvent = batchPanel.data?.nextActionEvent;
    if (!nextEvent) return;

    if (nextEvent.id !== selectedEventId) {
      setSelectedEventId(nextEvent.id);
      return;
    }

    if (nextEvent.presentCount > 0) {
      setConfirmation('finalize');
    }
  }

  return (
    <AuthGuard roles={['STAFF', 'ADMIN']}>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase text-primary">{t(locale, 'todaysOperations')}</p>
          <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'eventManagement')}</h1>
        </div>

        <Card>
          <CardHeader><CardTitle>{t(locale, 'createEvent')}</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_180px_180px_180px_180px_auto]">
            <Input placeholder={t(locale, 'eventName')} value={name} onChange={(event) => setName(event.target.value)} />
            <Select value={eventType} onChange={(event) => setEventType(event.target.value as EventType)}>
              {eventTypes.map((value) => <option key={value}>{value}</option>)}
            </Select>
            <Select value={operationalCategory} onChange={(event) => setOperationalCategory(event.target.value as EventOperationalCategory)}>
              {operationalCategories.map((value) => <option key={value}>{value}</option>)}
            </Select>
            <Select value={priority} onChange={(event) => setPriority(event.target.value as EventOperationalPriority)}>
              {priorities.map((value) => <option key={value}>{value}</option>)}
            </Select>
            <Input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
            <Button onClick={create} disabled={!name.trim() || !startsAt || createEvent.isPending}>{t(locale, 'create')}</Button>
            <Input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
            <Input className="xl:col-span-4" placeholder="Notas operacionais" value={operationalNotes} onChange={(event) => setOperationalNotes(event.target.value)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Séries recorrentes</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_180px_180px_140px_140px_200px_auto]">
              <Input placeholder="Nome da série" value={seriesName} onChange={(event) => setSeriesName(event.target.value)} />
              <Select value={eventType} onChange={(event) => setEventType(event.target.value as EventType)}>
                {eventTypes.map((value) => <option key={value}>{value}</option>)}
              </Select>
              <Input type="datetime-local" value={seriesStartsAt} onChange={(event) => setSeriesStartsAt(event.target.value)} />
              <Input type="number" min={15} max={1440} value={seriesDuration} onChange={(event) => setSeriesDuration(Number(event.target.value))} title="Duração em minutos" />
              <Input type="number" min={1} max={12} value={seriesInterval} onChange={(event) => setSeriesInterval(Number(event.target.value))} title="Intervalo em semanas" />
              <Input value={seriesTimezone} onChange={(event) => setSeriesTimezone(event.target.value)} placeholder="Timezone IANA" />
              <Button onClick={createSeries} disabled={!seriesName.trim() || !seriesStartsAt || createEventSeries.isPending}>Criar série</Button>
            </div>
            <p className="text-xs text-muted-foreground">Duração em minutos, intervalo em semanas e timezone IANA. O cron mantém o horizonte futuro materializado; pausa impede novas instâncias.</p>
            <div className="grid gap-3 xl:grid-cols-2">
              {(eventSeries.data ?? []).map((series) => {
                const exceptions = seriesExceptions[series.id] ?? (series.exceptionDates ?? []).join(', ');
                return (
                  <div key={series.id} className="space-y-3 rounded-md border bg-background/35 p-3 text-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{series.name}</p>
                        <p className="text-xs text-muted-foreground">{series.type} · a cada {series.intervalWeeks} semana(s) · {series.timezone} · {series._count?.events ?? 0} instância(s)</p>
                        <p className="text-xs text-muted-foreground">Materializado até {series.materializedThrough ? new Date(series.materializedThrough).toLocaleString() : '-'}</p>
                      </div>
                      <Button
                        variant={series.pausedAt ? 'primary' : 'secondary'}
                        className="h-8 px-3 text-xs"
                        disabled={setSeriesPaused.isPending}
                        onClick={() => setSeriesPaused.mutate({ seriesId: series.id, paused: !series.pausedAt }, { onSuccess: () => notifyToast({ title: series.pausedAt ? 'Série retomada.' : 'Série pausada.', tone: 'success' }) })}
                      >
                        {series.pausedAt ? 'Retomar' : 'Pausar'}
                      </Button>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        className="flex-1"
                        placeholder="Exceções YYYY-MM-DD, separadas por vírgula"
                        value={exceptions}
                        onChange={(event) => setSeriesExceptions((current) => ({ ...current, [series.id]: event.target.value }))}
                      />
                      <Button
                        variant="secondary"
                        disabled={updateSeriesExceptions.isPending}
                        onClick={() => updateSeriesExceptions.mutate({
                          seriesId: series.id,
                          exceptionDates: exceptions.split(',').map((value) => value.trim()).filter(Boolean),
                        }, { onSuccess: () => notifyToast({ title: 'Exceções aplicadas às instâncias futuras.', tone: 'success' }) })}
                      >Salvar exceções</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>{t(locale, 'events')}</CardTitle>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={hideFinalized}
                    onChange={(event) => setHideFinalized(event.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  {t(locale, 'hideFinalized')}
                </label>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {visibleEvents.map((event) => (
                <button
                  key={event.id}
                  className={`w-full rounded-md border p-3 text-left text-sm transition hover:border-primary ${selectedEventId === event.id ? 'border-primary bg-primary/10' : 'bg-background/35'}`}
                  onClick={() => setSelectedEventId(event.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{event.name}</p>
                      <p className="text-muted-foreground">{event.type} - {event.dkpReward} DKP</p>
                      <p className="text-xs text-muted-foreground">{new Date(event.startsAt).toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge tone={event.status === 'FINALIZED' ? 'green' : event.status === 'CANCELLED' ? 'red' : 'gold'}>{event.status}</Badge>
                      <Badge tone={event.priority === 'HIGH' ? 'red' : event.priority === 'LOW' ? 'muted' : 'blue'}>{event.operationalCategory}</Badge>
                    </div>
                  </div>
                </button>
              ))}
              {!events.isLoading && visibleEvents.length === 0 && (
                <p className="rounded-md border bg-background/35 p-3 text-sm text-muted-foreground">
                  {t(locale, 'noEventsForFilter')}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>{selectedEvent?.name ?? t(locale, 'selectEvent')}</CardTitle>
                {selectedEvent && (
                  <div className="flex items-center gap-2">
                    <Badge tone="blue">{presentPlayerIds.size} {t(locale, 'presentPlayers')}</Badge>
                    <Button
                      onClick={() => setConfirmation('finalize')}
                      disabled={isClosed || presentPlayerIds.size === 0 || finalizeEvent.isPending || finalizationChecklist.isLoading}
                    >
                      {t(locale, 'finalize')}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => setConfirmation('cancel')}
                      disabled={isCancelled || cancelEvent.isPending}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedEventId ? (
                <p className="text-sm text-muted-foreground">{t(locale, 'openEventAttendance')}</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-2 rounded-md border bg-background/35 p-3 text-sm sm:grid-cols-4">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">DKP por pessoa</p>
                      <p className="text-lg font-semibold">{selectedEvent?.dkpReward ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">DKP total</p>
                      <p className="text-lg font-semibold">{totalDkp}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Presentes</p>
                      <p className="text-lg font-semibold">{presentPlayerIds.size}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Faltantes</p>
                      <p className="text-lg font-semibold">{absentCount}</p>
                    </div>
                  </div>
                  <div className="grid gap-2 rounded-md border bg-background/35 p-3 text-sm md:grid-cols-4">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Categoria</p>
                      <p className="font-semibold">{selectedEvent?.operationalCategory ?? 'BOSS'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Prioridade</p>
                      <p className="font-semibold">{selectedEvent?.priority ?? 'MEDIUM'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Janela</p>
                      <p className="font-semibold">{selectedEvent?.endsAt ? new Date(selectedEvent.endsAt).toLocaleTimeString() : '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Responsavel</p>
                      <p className="truncate font-semibold">{selectedEvent?.responsibleUserId ?? '-'}</p>
                    </div>
                  </div>
                  {rsvpSummary.data && (
                    <div className="space-y-3 rounded-md border bg-background/35 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase text-muted-foreground">RSVP e composição prevista</p>
                          <p className="text-xs text-muted-foreground">Previsão não marca presença e não concede DKP.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge tone="green">{rsvpSummary.data.counts.CONFIRMED} confirmados</Badge>
                          <Badge tone="gold">{rsvpSummary.data.counts.TENTATIVE} talvez</Badge>
                          <Badge tone="red">{rsvpSummary.data.counts.DECLINED} não vão</Badge>
                          <Badge tone="red">{rsvpSummary.data.counts.UNAVAILABLE_BY_ABSENCE} em ausência</Badge>
                          <Badge tone="muted">{rsvpSummary.data.counts.UNANSWERED} sem resposta</Badge>
                        </div>
                      </div>
                      <div className="grid gap-2 text-xs md:grid-cols-3">
                        <div className="rounded border bg-background/45 p-2">
                          <p className="uppercase text-muted-foreground">Classes confirmadas</p>
                          <p>{Object.entries(rsvpSummary.data.confirmedComposition.byClass).map(([key, value]) => `${key}: ${value}`).join(' · ') || '-'}</p>
                        </div>
                        <div className="rounded border bg-background/45 p-2">
                          <p className="uppercase text-muted-foreground">Roles confirmadas</p>
                          <p>{Object.entries(rsvpSummary.data.confirmedComposition.byRole).map(([key, value]) => `${key}: ${value}`).join(' · ') || '-'}</p>
                        </div>
                        <div className="rounded border bg-background/45 p-2">
                          <p className="uppercase text-muted-foreground">Camadas confirmadas</p>
                          <p>{Object.entries(rsvpSummary.data.confirmedComposition.byLayer).map(([key, value]) => `${key}: ${value}`).join(' · ') || '-'}</p>
                        </div>
                      </div>
                      <div className="space-y-3 rounded border bg-background/45 p-3">
                        <div className="flex flex-wrap items-end gap-2">
                          <label className="min-w-40 flex-1 space-y-1 text-xs text-muted-foreground">
                            <span>Role alvo</span>
                            <Select value={targetRole} onChange={(event) => setTargetRole(event.target.value)}>
                              <option value="">Qualquer role</option>
                              {combatRoles.map((role) => <option key={role}>{role}</option>)}
                            </Select>
                          </label>
                          <label className="min-w-40 flex-1 space-y-1 text-xs text-muted-foreground">
                            <span>Classe alvo</span>
                            <Select value={targetClass} onChange={(event) => setTargetClass(event.target.value)}>
                              <option value="">Qualquer classe</option>
                              {playerClasses.map((playerClass) => <option key={playerClass}>{playerClass}</option>)}
                            </Select>
                          </label>
                          <label className="w-28 space-y-1 text-xs text-muted-foreground">
                            <span>Mínimo</span>
                            <Input type="number" min={1} max={100} value={targetMinimum} onChange={(event) => setTargetMinimum(Number(event.target.value))} />
                          </label>
                          <Button className="h-10" onClick={addCompositionTarget} disabled={(!targetRole && !targetClass) || updateCompositionTargets.isPending}>Adicionar alvo</Button>
                        </div>
                        <p className="text-xs text-muted-foreground">Alvos descrevem a necessidade; nunca selecionam pessoas automaticamente.</p>
                        <div className="flex flex-wrap gap-2">
                          {rsvpSummary.data.compositionTargets.map((target, index) => (
                            <div key={`${target.role}-${target.playerClass}-${index}`} className="flex items-center gap-2 rounded border px-2 py-1 text-xs">
                              <span>{target.label || [target.role, target.playerClass].filter(Boolean).join(' + ')}: {target.confirmed}/{target.minimum}</span>
                              <Badge tone={target.gap > 0 ? 'red' : 'green'}>{target.gap > 0 ? `gap ${target.gap}` : 'coberto'}</Badge>
                              <button
                                type="button"
                                className="text-red-300 hover:text-red-200"
                                aria-label="Remover alvo"
                                onClick={() => updateCompositionTargets.mutate({
                                  eventId: selectedEventId,
                                  targets: rsvpSummary.data.compositionTargets
                                    .filter((_item, itemIndex) => itemIndex !== index)
                                    .map(({ confirmed: _confirmed, gap: _gap, ...item }) => item),
                                })}
                              >×</button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3 rounded border bg-background/45 p-3">
                        <div className="grid gap-2 md:grid-cols-[1fr_100px_2fr_auto]">
                          <Select value={reservePlayerId} onChange={(event) => setReservePlayerId(event.target.value)}>
                            <option value="">Player para reserva</option>
                            {activePlayers.map((player) => <option key={player.id} value={player.id}>{player.nickname}</option>)}
                          </Select>
                          <Input type="number" min={1} max={999} value={reservePosition} onChange={(event) => setReservePosition(Number(event.target.value))} />
                          <Input value={reserveReason} onChange={(event) => setReserveReason(event.target.value)} placeholder="Motivo Staff-only obrigatório" />
                          <Button
                            disabled={!reservePlayerId || reserveReason.trim().length < 3 || upsertReserve.isPending}
                            onClick={() => upsertReserve.mutate({ eventId: selectedEventId, playerId: reservePlayerId, position: reservePosition, reason: reserveReason.trim() }, {
                              onSuccess: () => {
                                setReservePlayerId('');
                                setReserveReason('');
                                notifyToast({ title: 'Reserva registrada com motivo interno.', tone: 'success' });
                              },
                            })}
                          >Salvar reserva</Button>
                        </div>
                        <p className="text-xs text-muted-foreground">A ordem e o motivo ficam auditados e Staff-only. Promoção sempre pede confirmação ao player.</p>
                        <div className="space-y-2">
                          {rsvpSummary.data.reserveEntries.map((entry) => (
                            <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2 text-xs">
                              <div>
                                <p className="font-semibold">#{entry.position} · {entry.nickname} · {entry.playerClass} · C{entry.dimensionalLayer}</p>
                                <p className="text-muted-foreground">{entry.status} · {entry.reason}</p>
                              </div>
                              <div className="flex gap-2">
                                {entry.status === 'RESERVE' && <Button className="h-8 px-3 text-xs" onClick={() => setReserveAction({ type: 'promote', playerId: entry.playerId, nickname: entry.nickname })}>Oferecer vaga</Button>}
                                {!['PROMOTED', 'REMOVED'].includes(entry.status) && <Button variant="danger" className="h-8 px-3 text-xs" onClick={() => setReserveAction({ type: 'remove', playerId: entry.playerId, nickname: entry.nickname })}>Remover</Button>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {rsvpSummary.data.scheduleConflicts.length > 0 && (
                        <div className="rounded border border-amber-400/30 bg-amber-500/10 p-3 text-xs">
                          <p className="mb-2 uppercase text-muted-foreground">Conflitos de horário no timezone do player</p>
                          {rsvpSummary.data.scheduleConflicts.map((conflict) => (
                            <p key={`${conflict.playerId}-${conflict.conflictingEventId}`}><strong>{conflict.nickname}</strong> ({conflict.timezone}): atual {conflict.currentEventLocal} × {conflict.conflictingEventName} {conflict.conflictingEventLocal}</p>
                          ))}
                        </div>
                      )}
                      {rsvpSummary.data.noShows.length > 0 && (
                        <div className="rounded border border-amber-400/30 bg-amber-500/10 p-3 text-xs">
                          <p className="mb-2 uppercase text-muted-foreground">Confirmou, mas não esteve presente</p>
                          <p className="mb-2 text-muted-foreground">Contexto operacional apenas: uma falta isolada não pune nem gera risk flag automaticamente.</p>
                          <div className="space-y-2">
                            {rsvpSummary.data.noShows.map((noShow) => (
                              <div key={noShow.playerId}>
                                <p className="font-semibold">{noShow.nickname} · detectado {new Date(noShow.detectedAt).toLocaleString()}</p>
                                <p>{noShow.justification || 'Aguardando justificativa do player.'}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {rsvpSummary.data.responses.length > 0 && (
                        <div className="grid gap-2 md:grid-cols-2">
                          {rsvpSummary.data.responses.map((response) => (
                            <div key={response.id} className="rounded border bg-background/45 p-2 text-xs">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-semibold">{response.nickname} · {response.playerClass} · C{response.dimensionalLayer}</p>
                                <Badge tone={response.unavailableByAbsence ? 'red' : response.status === 'CONFIRMED' ? 'green' : response.status === 'DECLINED' ? 'red' : 'gold'}>{response.unavailableByAbsence ? 'AUSÊNCIA' : response.status}</Badge>
                              </div>
                              <p className="text-muted-foreground">{response.preferredRole ?? 'SEM_ROLE'} · atualizado {new Date(response.updatedAt).toLocaleString()}</p>
                              {response.note ? <p className="mt-1">{response.note} <span className="text-muted-foreground">({response.noteVisibility === 'STAFF_ONLY' ? 'privada' : 'pública'})</span></p> : null}
                            </div>
                          ))}
                        </div>
                      )}
                      {rsvpSummary.data.absenceImpacts.length > 0 && (
                        <div className="rounded border border-red-400/25 bg-red-500/10 p-3 text-xs">
                          <p className="mb-2 uppercase text-muted-foreground">Ausências que cobrem este evento</p>
                          <div className="space-y-2">
                            {rsvpSummary.data.absenceImpacts.map((absence) => (
                              <div key={absence.id}>
                                <p className="font-semibold">{absence.nickname} · {new Date(absence.startsAt).toLocaleString()} — {new Date(absence.endsAt).toLocaleString()}</p>
                                <p>{absence.reason || 'Motivo não informado'} <span className="text-muted-foreground">({absence.reasonVisibility === 'STAFF_ONLY' ? 'privado para Staff' : 'público para players'})</span></p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {(selectedEvent?.checklist ?? []).length > 0 ? (
                    <div className="space-y-3 rounded-md border bg-background/35 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs uppercase text-muted-foreground">Checklist do conteudo</p>
                        <Badge tone={(selectedEvent?.checklist ?? []).every((item) => item.checked) ? 'green' : 'gold'}>
                          {(selectedEvent?.checklist ?? []).filter((item) => item.checked).length}/{selectedEvent?.checklist.length ?? 0}
                        </Badge>
                      </div>
                      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                        {(selectedEvent?.checklist ?? []).map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            disabled={isClosed || markChecklistItem.isPending}
                            onClick={() => markChecklistItem.mutate({
                              eventId: selectedEventId,
                              key: item.key,
                              checked: !item.checked,
                            }, { onSuccess: () => notifyToast({ title: 'Checklist atualizado.', tone: 'success' }) })}
                            className={`rounded-md border p-3 text-left text-sm transition disabled:opacity-60 ${item.checked ? 'border-emerald-400/45 bg-emerald-500/10' : 'bg-background/45 hover:border-primary'}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold">{item.label}</p>
                              <Badge tone={item.checked ? 'green' : 'muted'}>{item.checked ? 'ok' : 'pendente'}</Badge>
                            </div>
                            {item.detail ? <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p> : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {selectedBatchId && (
                    <div className="space-y-3 rounded-md border bg-background/35 p-3">
                      {batchPanel.isLoading || !batchPanel.data ? (
                        <p className="text-sm text-muted-foreground">Carregando trilha do lote...</p>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase text-muted-foreground">Lote de bosses</p>
                              <h3 className="font-[var(--font-cinzel)] text-lg font-semibold">{batchPanel.data.title}</h3>
                              <p className="text-xs text-muted-foreground">
                                {batchPanel.data.finalizedEvents}/{batchPanel.data.totalEvents} finalizados - {batchPanel.data.cancelledEvents} cancelados - {batchPanel.data.totalDkpDistributed} DKP distribuido
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge tone={batchPanel.data.pendingEvents > 0 ? 'gold' : 'green'}>
                                {batchPanel.data.pendingEvents > 0 ? `${batchPanel.data.pendingEvents} pendente(s)` : 'Lote encerrado'}
                              </Badge>
                              {batchPanel.data.nextActionEvent && (
                                <Button className="h-8 px-3 text-xs" onClick={openBatchAction}>
                                  {batchPanel.data.nextActionEvent.id === selectedEventId && batchPanel.data.nextActionEvent.presentCount > 0
                                    ? 'Finalizar proximo'
                                    : batchPanel.data.nextActionEvent.actionPt}
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="grid gap-2 xl:grid-cols-2">
                            {batchPanel.data.events.map((batchEvent) => (
                              <button
                                key={batchEvent.id}
                                onClick={() => setSelectedEventId(batchEvent.id)}
                                className={`rounded-md border p-3 text-left transition hover:border-primary ${batchEvent.id === selectedEventId ? 'border-primary bg-primary/10' : batchEvent.isNextAction ? 'border-amber-400/45 bg-amber-500/10' : 'bg-background/45'}`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-xs uppercase text-muted-foreground">#{(batchEvent.batchOrder ?? 0) + 1} - {batchEvent.type}</p>
                                    <p className="font-semibold">{batchEvent.name}</p>
                                  </div>
                                  <Badge tone={batchEvent.status === 'FINALIZED' ? 'green' : batchEvent.status === 'CANCELLED' ? 'red' : batchEvent.isNextAction ? 'gold' : 'muted'}>
                                    {batchEvent.isNextAction ? 'PROXIMO' : batchEvent.status}
                                  </Badge>
                                </div>
                                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                                  <span>{batchEvent.presentCount} presentes</span>
                                  <span>{batchEvent.absentCount} ausentes</span>
                                  <span>{batchEvent.totalDkp} DKP</span>
                                </div>
                                <div className="mt-2 h-1.5 overflow-hidden rounded bg-muted">
                                  <div
                                    className={`h-full ${batchEvent.status === 'FINALIZED' ? 'bg-emerald-400' : batchEvent.status === 'CANCELLED' ? 'bg-red-400' : 'bg-primary'}`}
                                    style={{ width: `${Math.min(100, Math.round((batchEvent.presentCount / Math.max(batchPanel.data.activePlayerCount, 1)) * 100))}%` }}
                                  />
                                </div>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  <div className="space-y-3 rounded-md border bg-background/35 p-3">
                    {readiness.isLoading || !readiness.data ? (
                      <p className="text-sm text-muted-foreground">Carregando prontidao do boss...</p>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase text-muted-foreground">Prontidao da guilda</p>
                            <h3 className="font-[var(--font-cinzel)] text-lg font-semibold">{readiness.data.presentCount}/{readiness.data.activePlayerCount} presentes ativos</h3>
                            <p className="text-xs text-muted-foreground">
                              CP medio aprovado {readiness.data.cpSummary.averageCombatPower.toLocaleString('pt-BR')} - {readiness.data.cpSummary.withoutCombatPower} sem CP aprovado
                            </p>
                          </div>
                          <Badge tone={readiness.data.roleGaps.some((gap) => gap.missing) ? 'red' : 'green'}>
                            {readiness.data.roleGaps.some((gap) => gap.missing) ? 'Com gaps' : 'Base ok'}
                          </Badge>
                        </div>

                        <div className="grid gap-2 md:grid-cols-3">
                          {readiness.data.roleGaps.map((gap) => (
                            <div key={gap.role} className={`rounded-md border p-3 ${gap.missing ? 'border-red-400/35 bg-red-500/10' : 'bg-background/45'}`}>
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-semibold">{gap.labelPt}</p>
                                <Badge tone={gap.missing ? 'red' : 'green'}>{gap.present}/{gap.required}</Badge>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">{gap.notePt}</p>
                              {gap.backup > 0 && <p className="mt-1 text-xs text-amber-100">{gap.backup} apoio(s) fora da funcao principal</p>}
                            </div>
                          ))}
                        </div>

                        <div className="grid gap-3 xl:grid-cols-2">
                          <div className="rounded-md border bg-background/45 p-3">
                            <p className="mb-2 text-xs uppercase text-muted-foreground">Camadas ativas</p>
                            <div className="space-y-2">
                              {readiness.data.activeByLayer.map((layer) => (
                                <div key={layer.layer} className="grid grid-cols-[64px_1fr_auto] items-center gap-2 text-xs">
                                  <span className="font-semibold">L{layer.layer}</span>
                                  <div className="h-2 overflow-hidden rounded bg-muted">
                                    <div
                                      className="h-full bg-primary"
                                      style={{ width: `${Math.min(100, Math.round((layer.presentCount / Math.max(layer.activeCount, 1)) * 100))}%` }}
                                    />
                                  </div>
                                  <span className="text-muted-foreground">{layer.presentCount}/{layer.activeCount}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="rounded-md border bg-background/45 p-3">
                            <p className="mb-2 text-xs uppercase text-muted-foreground">Classes presentes</p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {readiness.data.classPresence.map((row) => (
                                <div key={row.class} className="rounded border bg-background/40 p-2 text-xs">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold">{playerClassLabel(row.class, locale)}</span>
                                    <Badge tone={row.presentCount > 0 ? 'blue' : 'muted'}>{row.presentCount}/{row.activeCount}</Badge>
                                  </div>
                                  <p className="mt-1 text-muted-foreground">
                                    {row.role === 'TANK' ? 'Tank' : row.role === 'HEALER' ? 'Healer' : row.role === 'SUPPORT' ? 'Suporte' : 'DPS'} - L{row.maxLayer || '-'} - CP {row.averageCombatPower.toLocaleString('pt-BR')}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-3 xl:grid-cols-2">
                          <div className="rounded-md border bg-background/45 p-3">
                            <p className="mb-2 text-xs uppercase text-muted-foreground">Top CP aprovado</p>
                            <div className="space-y-2">
                              {readiness.data.cpSummary.topPlayers.slice(0, 6).map((player) => (
                                <div key={player.id} className="flex items-center justify-between gap-2 rounded border bg-background/40 px-2 py-1.5 text-xs">
                                  <span className="font-medium">{player.nickname}</span>
                                  <span className="text-muted-foreground">{player.combatPower.toLocaleString('pt-BR')} CP {player.isPresent ? '- presente' : '- fora'}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="rounded-md border bg-background/45 p-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <p className="text-xs uppercase text-muted-foreground">Status desatualizado</p>
                              <Badge tone={readiness.data.staleStatusPlayers.length > 0 ? 'gold' : 'green'}>{readiness.data.staleStatusPlayers.length}</Badge>
                            </div>
                            <div className="max-h-36 space-y-2 overflow-y-auto">
                              {readiness.data.staleStatusPlayers.slice(0, 12).map((player) => (
                                <div key={player.id} className="flex items-center justify-between gap-2 rounded border bg-background/40 px-2 py-1.5 text-xs">
                                  <span className="font-medium">{player.nickname}</span>
                                  <span className="text-muted-foreground">{player.daysSinceStatus === null ? 'sem STATUS' : `${player.daysSinceStatus}d`} {player.isPresent ? '- presente' : ''}</span>
                                </div>
                              ))}
                              {readiness.data.staleStatusPlayers.length === 0 && (
                                <p className="text-xs text-muted-foreground">Todo mundo com STATUS recente. Milagre auditavel.</p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {readiness.data.notesPt.map((note) => (
                            <p key={note} className="rounded-md border bg-background/45 p-2 text-xs text-muted-foreground">{note}</p>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {readiness.data.actionLinks.map((link) => (
                            <a key={link.href} href={link.href} className="rounded-md border border-cyan-400/25 bg-secondary/80 px-3 py-2 text-xs font-semibold hover:border-cyan-300/45" title={link.reason}>
                              {link.label}
                            </a>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {activePlayers.map((player) => {
                      const present = presentPlayerIds.has(player.id);
                      return (
                        <button
                          key={player.id}
                          disabled={isCancelled || registerAttendance.isPending || removeAttendance.isPending}
                          onClick={() => toggleAttendance(player.id)}
                          className={`rounded-md border p-3 text-left text-sm transition disabled:opacity-60 ${present ? 'border-emerald-400/50 bg-emerald-500/15' : 'bg-background/35 hover:border-primary'}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold">{player.nickname}</p>
                              <p className="text-xs text-muted-foreground">{playerClassLabel(player.class, locale)} - {t(locale, 'layer')} {player.dimensionalLayer}</p>
                            </div>
                            <Badge tone={present ? 'green' : 'muted'}>{present ? t(locale, 'present') : t(locale, 'absent')}</Badge>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <ConfirmationDialog
          open={confirmation === 'finalize'}
          title="Checklist de finalizacao"
          description="Revise boss, chamada, DKP e copia do lote antes de finalizar. Depois do clique, o Aristolfo nao aceita choro em caps lock."
          confirmLabel={t(locale, 'finalize')}
          pending={finalizeEvent.isPending}
          tone="primary"
          onClose={() => setConfirmation(undefined)}
          onConfirm={finalizeSelectedEvent}
        >
          {finalizationChecklist.isLoading || !finalizationChecklist.data ? (
            <p className="rounded-md border bg-background/35 p-3 text-sm text-muted-foreground">Carregando checklist...</p>
          ) : (
            <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1 text-sm">
              <div className="grid gap-2 rounded-md border bg-background/35 p-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Boss atual</p>
                  <p className="font-semibold">{finalizationChecklist.data.currentBoss.name}</p>
                  <p className="text-xs text-muted-foreground">{new Date(finalizationChecklist.data.currentBoss.startsAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Proximo boss do lote</p>
                  <p className="font-semibold">{finalizationChecklist.data.nextBatchEvent?.name ?? 'Sem proximo boss ativo'}</p>
                  <p className="text-xs text-muted-foreground">
                    {finalizationChecklist.data.nextBatchEvent
                      ? `${finalizationChecklist.data.nextBatchEvent.existingAttendanceCount} presenca(s) ja registradas`
                      : 'Nada para copiar depois deste evento'}
                  </p>
                </div>
              </div>

              <div className="grid gap-2 rounded-md border bg-background/35 p-3 sm:grid-cols-4">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Presentes</p>
                  <p className="text-lg font-semibold">{finalizationChecklist.data.presentCount}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Ausentes</p>
                  <p className="text-lg font-semibold">{finalizationChecklist.data.absentCount}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">DKP por pessoa</p>
                  <p className="text-lg font-semibold">{finalizationChecklist.data.dkpPerPlayer}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">DKP total</p>
                  <p className="text-lg font-semibold">{finalizationChecklist.data.totalDkp}</p>
                </div>
              </div>

              <div className="rounded-md border bg-background/35 p-3">
                <p className="text-xs uppercase text-muted-foreground">Copia de presenca</p>
                <p className="mt-1 font-medium">{finalizationChecklist.data.attendanceCopy.messagePt}</p>
              </div>

              {finalizationChecklist.data.warnings.length > 0 && (
                <div className="space-y-2">
                  {finalizationChecklist.data.warnings.map((warning) => (
                    <div
                      key={warning.messagePt}
                      className={`rounded-md border p-3 ${warning.tone === 'danger' ? 'border-red-400/50 bg-red-500/15 text-red-100' : warning.tone === 'warning' ? 'border-amber-400/50 bg-amber-500/15 text-amber-100' : 'border-blue-400/40 bg-blue-500/10 text-blue-100'}`}
                    >
                      {warning.messagePt}
                    </div>
                  ))}
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-md border bg-background/35 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs uppercase text-muted-foreground">Presentes</p>
                    <Badge tone="green">{finalizationChecklist.data.presentPlayers.length}</Badge>
                  </div>
                  <div className="max-h-44 space-y-2 overflow-y-auto">
                    {finalizationChecklist.data.presentPlayers.map((player) => (
                      <div key={player.id} className="flex items-center justify-between gap-2 rounded border bg-background/45 px-2 py-1.5">
                        <span className="font-medium">{player.nickname}</span>
                        <span className="text-xs text-muted-foreground">{playerClassLabel(player.class, locale)} - {t(locale, 'layer')} {player.dimensionalLayer}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-md border bg-background/35 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs uppercase text-muted-foreground">Ausentes ativos</p>
                    <Badge tone="red">{finalizationChecklist.data.absentPlayers.length}</Badge>
                  </div>
                  <div className="max-h-44 space-y-2 overflow-y-auto">
                    {finalizationChecklist.data.absentPlayers.map((player) => (
                      <div key={player.id} className="flex items-center justify-between gap-2 rounded border bg-background/45 px-2 py-1.5">
                        <span className="font-medium">{player.nickname}</span>
                        <span className="text-xs text-muted-foreground">{playerClassLabel(player.class, locale)} - {t(locale, 'layer')} {player.dimensionalLayer}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </ConfirmationDialog>
        <ConfirmationDialog
          open={confirmation === 'cancel'}
          title="Cancelar evento?"
          description="O evento sera encerrado e os efeitos associados serao revertidos conforme as regras atuais. Informe o motivo para a auditoria."
          confirmLabel="Cancelar evento"
          pending={cancelEvent.isPending}
          onClose={() => setConfirmation(undefined)}
          onConfirm={cancelSelectedEvent}
        >
          <label className="space-y-1 text-sm">
            <span className="text-xs uppercase text-muted-foreground">Motivo</span>
            <Input value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder={t(locale, 'eventCancelReasonPrompt')} />
          </label>
        </ConfirmationDialog>
        <ConfirmationDialog
          open={Boolean(reserveAction)}
          title={reserveAction?.type === 'promote' ? 'Oferecer vaga da reserva?' : 'Remover da reserva?'}
          description={reserveAction?.type === 'promote'
            ? `${reserveAction?.nickname ?? 'Player'} receberá uma solicitação e precisará confirmar antes de entrar na composição.`
            : `A entrada de ${reserveAction?.nickname ?? 'player'} será marcada como removida, preservando o histórico auditável.`}
          confirmLabel={reserveAction?.type === 'promote' ? 'Enviar oferta' : 'Remover reserva'}
          pending={promoteReserve.isPending || removeReserve.isPending}
          onClose={() => setReserveAction(undefined)}
          onConfirm={() => {
            if (!reserveAction || !selectedEventId) return;
            const mutation = reserveAction.type === 'promote' ? promoteReserve : removeReserve;
            mutation.mutate({ eventId: selectedEventId, playerId: reserveAction.playerId }, {
              onSuccess: () => {
                notifyToast({ title: reserveAction.type === 'promote' ? 'Oferta enviada ao player.' : 'Reserva removida com histórico preservado.', tone: 'success' });
                setReserveAction(undefined);
              },
            });
          }}
        />
      </div>
    </AuthGuard>
  );
}
