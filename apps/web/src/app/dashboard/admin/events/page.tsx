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
import { useCancelEvent, useCreateEvent, useEventAttendance, useEventFinalizationChecklist, useEvents, useFinalizeEvent, usePlayers, useRegisterAttendance, useRemoveAttendance } from '@/hooks/use-guild-api';
import { playerClassLabel } from '@/lib/game-labels';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';
import type { EventType } from '@/types/api';

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

export default function AdminEventsPage() {
  const events = useEvents();
  const locale = useLocaleStore((state) => state.locale);
  const players = usePlayers();
  const createEvent = useCreateEvent();
  const registerAttendance = useRegisterAttendance();
  const removeAttendance = useRemoveAttendance();
  const finalizeEvent = useFinalizeEvent();
  const cancelEvent = useCancelEvent();
  const [name, setName] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [eventType, setEventType] = useState<EventType>('LUNOS');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [hideFinalized, setHideFinalized] = useState(true);
  const [confirmation, setConfirmation] = useState<'finalize' | 'cancel'>();
  const [cancelReason, setCancelReason] = useState('');
  const attendance = useEventAttendance(selectedEventId);
  const finalizationChecklist = useEventFinalizationChecklist(selectedEventId);
  const selectedEvent = attendance.data ?? events.data?.find((event) => event.id === selectedEventId);
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
      { name, type: eventType, startsAt: new Date(startsAt).toISOString() },
      {
        onSuccess: (event: { id: string }) => {
          setSelectedEventId(event.id);
          setName('');
          setStartsAt('');
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

  return (
    <AuthGuard roles={['STAFF', 'ADMIN']}>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase text-primary">{t(locale, 'todaysOperations')}</p>
          <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'eventManagement')}</h1>
        </div>

        <Card>
          <CardHeader><CardTitle>{t(locale, 'createEvent')}</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-[1fr_220px_220px_auto]">
            <Input placeholder={t(locale, 'eventName')} value={name} onChange={(event) => setName(event.target.value)} />
            <Select value={eventType} onChange={(event) => setEventType(event.target.value as EventType)}>
              {eventTypes.map((value) => <option key={value}>{value}</option>)}
            </Select>
            <Input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
            <Button onClick={create} disabled={!name.trim() || !startsAt || createEvent.isPending}>{t(locale, 'create')}</Button>
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
                    <Badge tone={event.status === 'FINALIZED' ? 'green' : event.status === 'CANCELLED' ? 'red' : 'gold'}>{event.status}</Badge>
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
