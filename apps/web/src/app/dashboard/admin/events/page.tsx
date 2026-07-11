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
import { useCancelEvent, useCreateEvent, useEventAttendance, useEventBatchPanel, useEventFinalizationChecklist, useEventReadiness, useEvents, useFinalizeEvent, useMarkEventChecklistItem, useRegisterAttendance, useRemoveAttendance } from '@/hooks/use-events-api';
import { usePlayers } from '@/hooks/use-profile-api';
import { playerClassLabel } from '@/lib/game-labels';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';
import type { EventOperationalCategory, EventOperationalPriority, EventType } from '@/types/api';

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

export default function AdminEventsPage() {
  const events = useEvents();
  const locale = useLocaleStore((state) => state.locale);
  const players = usePlayers();
  const createEvent = useCreateEvent();
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
  const [selectedEventId, setSelectedEventId] = useState('');
  const [hideFinalized, setHideFinalized] = useState(true);
  const [confirmation, setConfirmation] = useState<'finalize' | 'cancel'>();
  const [cancelReason, setCancelReason] = useState('');
  const attendance = useEventAttendance(selectedEventId);
  const finalizationChecklist = useEventFinalizationChecklist(selectedEventId);
  const readiness = useEventReadiness(selectedEventId);
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
      </div>
    </AuthGuard>
  );
}
