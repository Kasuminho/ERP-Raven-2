'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardList, Clock3, Play, Radio, Users, XCircle } from 'lucide-react';
import { AuthGuard } from '@/components/guards/auth-guard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { notifyToast } from '@/components/ui/toaster';
import { useEvents } from '@/hooks/use-events-api';
import { usePlayers } from '@/hooks/use-profile-api';
import {
  useCancelWarRoomOperation,
  useCloseWarRoomOperation,
  useCreateWarRoomOperation,
  useCreateWarRoomRosterSlot,
  useCreateWarRoomTimelineEvent,
  useMarkWarRoomAttendance,
  useOpenWarRoomOperation,
  useUpdateWarRoomRosterSlot,
  useWarRoomAfterActionReport,
  useWarRoomLiveDossier,
  useWarRoomOperations,
  useWarRoomRoster,
} from '@/hooks/use-war-room-api';
import { combatRoleLabel, playerClassLabel } from '@/lib/game-labels';
import type { PlayerClass, PlayerCombatRole, WarRoomOperation, WarRoomOperationPriority, WarRoomOperationType, WarRoomRosterSlotStatus, WarRoomTimelineEventType } from '@/types/api';

const operationTypes: WarRoomOperationType[] = ['CLASH', 'ANCIENT_FORTRESS', 'ABYSS', 'GUILD_RAID', 'CUSTOM'];
const priorities: WarRoomOperationPriority[] = ['LOW', 'MEDIUM', 'HIGH'];
const combatRoles: PlayerCombatRole[] = ['FRONTLINE', 'BACKLINE', 'SUPPORT', 'CALLER', 'SCOUT', 'FLEX', 'RESERVE'];
const playerClasses: PlayerClass[] = ['GUNSLINGER', 'BERSERKER', 'DESTROYER', 'DEATHBRINGER', 'ASSASSIN', 'DIVINE_CASTER', 'NIGHT_RANGER', 'VANGUARD', 'ELEMENTALIST', 'WARLORD'];
const attendanceStatuses: WarRoomRosterSlotStatus[] = ['PRESENT', 'ABSENT', 'JUSTIFIED_ABSENCE'];
const timelineTypes: WarRoomTimelineEventType[] = ['NOTE', 'CALL', 'ENGAGE', 'WIPE', 'OBJECTIVE_CAPTURED', 'BOSS', 'TARGET_SWAP', 'SUBSTITUTION', 'CONTRIBUTION', 'RISK', 'CLOSED'];

function toLocalInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function statusTone(status: WarRoomOperation['status'] | WarRoomRosterSlotStatus) {
  if (status === 'ACTIVE' || status === 'CONFIRMED' || status === 'PRESENT') return 'green';
  if (status === 'CLOSED' || status === 'JUSTIFIED_ABSENCE') return 'blue';
  if (status === 'CANCELLED' || status === 'DECLINED' || status === 'ABSENT') return 'red';
  if (status === 'SCHEDULED' || status === 'PENDING') return 'gold';
  return 'muted';
}

export default function StaffWarRoomPage() {
  const operations = useWarRoomOperations();
  const events = useEvents();
  const players = usePlayers();
  const createOperation = useCreateWarRoomOperation();
  const openOperation = useOpenWarRoomOperation();
  const closeOperation = useCloseWarRoomOperation();
  const cancelOperation = useCancelWarRoomOperation();
  const createSlot = useCreateWarRoomRosterSlot();
  const updateSlot = useUpdateWarRoomRosterSlot();
  const markAttendance = useMarkWarRoomAttendance();
  const createTimelineEvent = useCreateWarRoomTimelineEvent();
  const now = new Date();
  const [selectedOperationId, setSelectedOperationId] = useState('');
  const roster = useWarRoomRoster(selectedOperationId);
  const live = useWarRoomLiveDossier(selectedOperationId);
  const afterAction = useWarRoomAfterActionReport(selectedOperationId);
  const [form, setForm] = useState({
    name: '',
    type: 'CLASH' as WarRoomOperationType,
    priority: 'MEDIUM' as WarRoomOperationPriority,
    startsAt: toLocalInputValue(new Date(now.getTime() + 2 * 60 * 60 * 1000)),
    endsAt: toLocalInputValue(new Date(now.getTime() + 3 * 60 * 60 * 1000)),
    mapRegion: '',
    objective: '',
    staffNotes: '',
    eventId: '',
  });
  const [slotForm, setSlotForm] = useState({
    playerId: '',
    role: 'FRONTLINE' as PlayerCombatRole,
    requiredClass: '',
    requiredLayer: '',
    publicInstructionsPt: '',
    publicInstructionsEn: '',
    staffNote: '',
  });
  const [timelineForm, setTimelineForm] = useState({
    type: 'NOTE' as WarRoomTimelineEventType,
    title: '',
    note: '',
  });
  const [closeDraft, setCloseDraft] = useState<{ operationId: string; result: string; score: string; improvementNotes: string } | null>(null);
  const [cancelTarget, setCancelTarget] = useState<WarRoomOperation | null>(null);
  const grouped = useMemo(() => {
    const rows = operations.data ?? [];
    return {
      active: rows.filter((row) => row.status === 'ACTIVE'),
      upcoming: rows.filter((row) => row.status === 'DRAFT' || row.status === 'SCHEDULED'),
      closed: rows.filter((row) => row.status === 'CLOSED' || row.status === 'CANCELLED'),
    };
  }, [operations.data]);

  useEffect(() => {
    if (selectedOperationId || !operations.data?.length) return;
    const firstOpen = operations.data.find((operation) => operation.status === 'ACTIVE' || operation.status === 'SCHEDULED' || operation.status === 'DRAFT');
    setSelectedOperationId(firstOpen?.id ?? operations.data[0].id);
  }, [operations.data, selectedOperationId]);

  function create() {
    createOperation.mutate(
      {
        name: form.name,
        type: form.type,
        priority: form.priority,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        mapRegion: form.mapRegion || undefined,
        objective: form.objective || undefined,
        staffNotes: form.staffNotes || undefined,
        eventId: form.eventId || undefined,
        internalLinks: form.eventId ? [{ label: 'Evento vinculado', href: `/dashboard/admin/events` }] : [],
      },
      {
        onSuccess: (operation) => {
          setSelectedOperationId(operation.id);
          setForm((current) => ({ ...current, name: '', mapRegion: '', objective: '', staffNotes: '', eventId: '' }));
          notifyToast({ title: 'Operacao War Room criada.', tone: 'success' });
        },
      },
    );
  }

  function addSlot() {
    if (!selectedOperationId || !slotForm.playerId) return;
    createSlot.mutate(
      {
        operationId: selectedOperationId,
        playerId: slotForm.playerId,
        role: slotForm.role,
        requiredClass: (slotForm.requiredClass || undefined) as PlayerClass | undefined,
        requiredLayer: slotForm.requiredLayer ? Number(slotForm.requiredLayer) : undefined,
        publicInstructionsPt: slotForm.publicInstructionsPt || undefined,
        publicInstructionsEn: slotForm.publicInstructionsEn || undefined,
        staffNote: slotForm.staffNote || undefined,
      },
      {
        onSuccess: () => {
          setSlotForm((current) => ({ ...current, playerId: '', staffNote: '' }));
          notifyToast({ title: 'Player escalado.', tone: 'success' });
        },
      },
    );
  }

  function addTimelineEvent() {
    if (!selectedOperationId || !timelineForm.title.trim()) return;
    createTimelineEvent.mutate(
      {
        operationId: selectedOperationId,
        type: timelineForm.type,
        title: timelineForm.title,
        note: timelineForm.note || undefined,
      },
      {
        onSuccess: () => {
          setTimelineForm((current) => ({ ...current, title: '', note: '' }));
          notifyToast({ title: 'Evento ao vivo registrado.', tone: 'success' });
        },
      },
    );
  }

  async function copyAfterActionMarkdown() {
    if (!afterAction.data?.markdown || typeof navigator === 'undefined') return;
    try {
      await navigator.clipboard.writeText(afterAction.data.markdown);
      notifyToast({ title: 'Resumo pos-guerra copiado.', tone: 'success' });
    } catch {
      notifyToast({ title: 'Nao consegui copiar.', description: 'O navegador bloqueou o clipboard.', tone: 'error' });
    }
  }

  function OperationCard({ operation }: { operation: WarRoomOperation }) {
    const selected = operation.id === selectedOperationId;
    return (
      <div className={`rounded-md border bg-background/35 p-4 text-sm ${selected ? 'border-primary/70' : ''}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <button type="button" className="min-w-0 text-left" onClick={() => setSelectedOperationId(operation.id)}>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-primary">{operation.name}</p>
              <Badge tone={statusTone(operation.status)}>{operation.status}</Badge>
              <Badge tone={operation.priority === 'HIGH' ? 'red' : operation.priority === 'MEDIUM' ? 'gold' : 'muted'}>{operation.priority}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {operation.type} - {new Date(operation.startsAt).toLocaleString()} ate {new Date(operation.endsAt).toLocaleString()}
            </p>
            <p className="mt-2">{operation.objective || 'Sem objetivo registrado.'}</p>
            {operation.mapRegion && <p className="text-muted-foreground">Mapa/regiao: {operation.mapRegion}</p>}
            {operation.event && <p className="text-muted-foreground">Evento vinculado: {operation.event.name}</p>}
            {operation.result && <p className="mt-2 text-muted-foreground">Resultado: {operation.result}</p>}
          </button>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setSelectedOperationId(operation.id)}>
              <ClipboardList className="h-4 w-4" /> Escala
            </Button>
            {operation.status !== 'ACTIVE' && operation.status !== 'CLOSED' && operation.status !== 'CANCELLED' && (
              <Button type="button" variant="secondary" onClick={() => openOperation.mutate(operation.id, { onSuccess: () => notifyToast({ title: 'Operacao aberta.', tone: 'success' }) })}>
                <Play className="h-4 w-4" /> Abrir
              </Button>
            )}
            {operation.status === 'ACTIVE' && (
              <Button type="button" onClick={() => setCloseDraft({ operationId: operation.id, result: operation.result ?? '', score: operation.score ?? '', improvementNotes: operation.improvementNotes ?? '' })}>
                <CheckCircle2 className="h-4 w-4" /> Encerrar
              </Button>
            )}
            {operation.status !== 'CLOSED' && operation.status !== 'CANCELLED' && (
              <Button type="button" variant="danger" onClick={() => setCancelTarget(operation)}>
                <XCircle className="h-4 w-4" /> Cancelar
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const rosterSlots = roster.data?.slots ?? [];
  const assignedPlayerIds = new Set(rosterSlots.map((slot) => slot.playerId));
  const availablePlayers = (players.data ?? []).filter((player) => !assignedPlayerIds.has(player.id));

  return (
    <AuthGuard roles={['STAFF', 'ADMIN']}>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase text-primary">War Room</p>
          <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">Operacoes competitivas</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Planejamento Staff para Clash/GvG, Abyss, fortress e operacoes custom. Escala aqui, spoiler para player la fora zero.</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Nova operacao</CardTitle></CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-4">
            <Input placeholder="Nome da operacao" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            <Select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as WarRoomOperationType }))}>
              {operationTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </Select>
            <Select value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as WarRoomOperationPriority }))}>
              {priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
            </Select>
            <Select value={form.eventId} onChange={(event) => setForm((current) => ({ ...current, eventId: event.target.value }))}>
              <option value="">Sem evento vinculado</option>
              {(events.data ?? []).slice(0, 80).map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
            </Select>
            <Input type="datetime-local" value={form.startsAt} onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))} />
            <Input type="datetime-local" value={form.endsAt} onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))} />
            <Input placeholder="Mapa/regiao" value={form.mapRegion} onChange={(event) => setForm((current) => ({ ...current, mapRegion: event.target.value }))} />
            <Input placeholder="Objetivo" value={form.objective} onChange={(event) => setForm((current) => ({ ...current, objective: event.target.value }))} />
            <textarea
              className="min-h-24 rounded-md border border-input bg-background/80 px-3 py-2 text-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring lg:col-span-4"
              placeholder="Notas Staff"
              value={form.staffNotes}
              onChange={(event) => setForm((current) => ({ ...current, staffNotes: event.target.value }))}
            />
            <Button className="lg:col-span-2" type="button" disabled={!form.name.trim() || createOperation.isPending} onClick={create}>
              <CalendarClock className="h-4 w-4" /> Criar operacao
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]">
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Ao vivo</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {grouped.active.map((operation) => <OperationCard key={operation.id} operation={operation} />)}
                {!operations.isLoading && grouped.active.length === 0 && <EmptyState title="Nada ao vivo">Quando uma operacao abrir, ela fica aqui.</EmptyState>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Proximas</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {grouped.upcoming.map((operation) => <OperationCard key={operation.id} operation={operation} />)}
                {!operations.isLoading && grouped.upcoming.length === 0 && <EmptyState title="Sem operacoes futuras">Crie uma janela de War Room para preparar a guilda.</EmptyState>}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Escala da operacao</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedOperationId && <EmptyState title="Selecione uma operacao">Abra a escala em uma operacao para montar a comp.</EmptyState>}
              {selectedOperationId && (
                <>
                  <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                    <div className="rounded-md border p-3"><p className="text-muted-foreground">Total</p><p className="text-lg font-semibold">{roster.data?.summary.total ?? 0}</p></div>
                    <div className="rounded-md border p-3"><p className="text-muted-foreground">Confirmados</p><p className="text-lg font-semibold">{roster.data?.summary.confirmed ?? 0}</p></div>
                    <div className="rounded-md border p-3"><p className="text-muted-foreground">Pendentes</p><p className="text-lg font-semibold">{roster.data?.summary.pending ?? 0}</p></div>
                    <div className="rounded-md border p-3"><p className="text-muted-foreground">Reservas</p><p className="text-lg font-semibold">{roster.data?.summary.reserves ?? 0}</p></div>
                  </div>

                  {roster.data?.compositionImpact && (
                    <div className="rounded-md border p-3 text-sm">
                      <p className="font-semibold">Impacto da composicao</p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {roster.data.compositionImpact.roles.map((role) => (
                          <div key={role.role} className="rounded-md bg-background/40 p-2 text-xs">
                            <p className="font-medium">{combatRoleLabel(role.role as PlayerCombatRole, 'pt')}</p>
                            <p className="text-muted-foreground">{role.count}/{role.target} · falta {role.missing}</p>
                          </div>
                        ))}
                      </div>
                      {roster.data.compositionImpact.shortages.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {roster.data.compositionImpact.shortages.map((shortage) => (
                            <p key={shortage.key} className="text-xs text-amber-300">{shortage.detail}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {(roster.data?.suggestions ?? []).length > 0 && (
                    <div className="rounded-md border p-3 text-sm">
                      <p className="font-semibold">Sugestoes explicaveis</p>
                      <div className="mt-2 space-y-2">
                        {(roster.data?.suggestions ?? []).map((suggestion) => (
                          <div key={suggestion.playerId} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-background/40 p-2">
                            <div>
                              <p className="font-medium">{suggestion.nickname} · {combatRoleLabel(suggestion.recommendedRole as PlayerCombatRole, 'pt')}</p>
                              <p className="text-xs text-muted-foreground">{playerClassLabel(suggestion.class, 'pt')} · {suggestion.reasons.slice(0, 3).join(' · ')}</p>
                              {suggestion.warnings.length > 0 && <p className="text-xs text-amber-300">{suggestion.warnings.join(' · ')}</p>}
                            </div>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => setSlotForm((current) => ({
                                ...current,
                                playerId: suggestion.playerId,
                                role: suggestion.recommendedRole as PlayerCombatRole,
                                requiredClass: suggestion.class,
                                requiredLayer: String(suggestion.dimensionalLayer),
                              }))}
                            >
                              Usar
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid gap-2 lg:grid-cols-2">
                    <Select value={slotForm.playerId} onChange={(event) => setSlotForm((current) => ({ ...current, playerId: event.target.value }))}>
                      <option value="">Player</option>
                      {availablePlayers.map((player) => <option key={player.id} value={player.id}>{player.nickname} - {playerClassLabel(player.class, 'pt')}</option>)}
                    </Select>
                    <Select value={slotForm.role} onChange={(event) => setSlotForm((current) => ({ ...current, role: event.target.value as PlayerCombatRole }))}>
                      {combatRoles.map((role) => <option key={role} value={role}>{combatRoleLabel(role, 'pt')}</option>)}
                    </Select>
                    <Select value={slotForm.requiredClass} onChange={(event) => setSlotForm((current) => ({ ...current, requiredClass: event.target.value }))}>
                      <option value="">Classe livre</option>
                      {playerClasses.map((playerClass) => <option key={playerClass} value={playerClass}>{playerClassLabel(playerClass, 'pt')}</option>)}
                    </Select>
                    <Input type="number" min={1} max={10} placeholder="Camada esperada" value={slotForm.requiredLayer} onChange={(event) => setSlotForm((current) => ({ ...current, requiredLayer: event.target.value }))} />
                    <textarea
                      className="min-h-20 rounded-md border border-input bg-background/80 px-3 py-2 text-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring lg:col-span-2"
                      placeholder="Instrucao PT-BR para o player"
                      value={slotForm.publicInstructionsPt}
                      onChange={(event) => setSlotForm((current) => ({ ...current, publicInstructionsPt: event.target.value }))}
                    />
                    <textarea
                      className="min-h-20 rounded-md border border-input bg-background/80 px-3 py-2 text-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring lg:col-span-2"
                      placeholder="Player instruction EN"
                      value={slotForm.publicInstructionsEn}
                      onChange={(event) => setSlotForm((current) => ({ ...current, publicInstructionsEn: event.target.value }))}
                    />
                    <Input className="lg:col-span-2" placeholder="Nota Staff interna" value={slotForm.staffNote} onChange={(event) => setSlotForm((current) => ({ ...current, staffNote: event.target.value }))} />
                    <Button className="lg:col-span-2" type="button" disabled={!slotForm.playerId || createSlot.isPending} onClick={addSlot}>
                      <Users className="h-4 w-4" /> Escalar player
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {rosterSlots.map((slot) => (
                      <div key={slot.id} className="rounded-md border p-3 text-sm">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold">{slot.player?.nickname ?? slot.playerId}</p>
                              <Badge tone={statusTone(slot.status)}>{slot.status}</Badge>
                              <Badge tone={slot.role === 'RESERVE' ? 'muted' : 'blue'}>{combatRoleLabel(slot.role as PlayerCombatRole, 'pt')}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {slot.player ? `${playerClassLabel(slot.player.class, 'pt')} - camada ${slot.player.dimensionalLayer} - presenca ${Math.round(slot.player.attendancePercentage)}%` : 'Player sem resumo carregado'}
                            </p>
                          </div>
                          <Select
                            className="w-48"
                            value={slot.status}
                            onChange={(event) => {
                              const status = event.target.value as WarRoomRosterSlotStatus;
                              if (attendanceStatuses.includes(status)) {
                                markAttendance.mutate({ operationId: selectedOperationId, slotId: slot.id, status });
                              } else {
                                updateSlot.mutate({ operationId: selectedOperationId, slotId: slot.id, status });
                              }
                            }}
                          >
                            {(['PENDING', 'CONFIRMED', 'DECLINED', 'PRESENT', 'ABSENT', 'JUSTIFIED_ABSENCE'] as WarRoomRosterSlotStatus[]).map((status) => <option key={status} value={status}>{status}</option>)}
                          </Select>
                        </div>
                        {slot.conflicts && slot.conflicts.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {slot.conflicts.map((conflict, index) => (
                              <div key={`${slot.id}-${conflict.key}-${index}`} className="flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                                <div>
                                  <p className="font-semibold">{conflict.label}</p>
                                  <p className="text-muted-foreground">{conflict.detail}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {!roster.isLoading && rosterSlots.length === 0 && <EmptyState title="Escala vazia">Adicione os primeiros slots. Sim, a comp nao se monta por telepatia.</EmptyState>}
                  </div>

                  <div className="border-t pt-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="flex items-center gap-2 font-semibold"><Radio className="h-4 w-4 text-primary" /> Painel ao vivo</p>
                        <p className="text-xs text-muted-foreground">Checklist, calls e eventos taticos da janela.</p>
                      </div>
                      {live.data?.generatedAt && <Badge tone="muted">sync {new Date(live.data.generatedAt).toLocaleTimeString()}</Badge>}
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {(live.data?.checklist ?? []).map((item) => (
                        <div key={item.key} className={`rounded-md border p-3 text-xs ${item.ready ? 'border-green-500/30 bg-green-500/10' : 'border-amber-500/30 bg-amber-500/10'}`}>
                          <p className="font-semibold">{item.label}</p>
                          <p className="mt-1 text-muted-foreground">{item.detail}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 grid gap-2">
                      <div className="grid gap-2 md:grid-cols-[180px_1fr]">
                        <Select value={timelineForm.type} onChange={(event) => setTimelineForm((current) => ({ ...current, type: event.target.value as WarRoomTimelineEventType }))}>
                          {timelineTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                        </Select>
                        <Input placeholder="Titulo curto da call/evento" value={timelineForm.title} onChange={(event) => setTimelineForm((current) => ({ ...current, title: event.target.value }))} />
                      </div>
                      <textarea
                        className="min-h-20 rounded-md border border-input bg-background/80 px-3 py-2 text-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring"
                        placeholder="Nota ao vivo, alvo, risco, troca ou contexto"
                        value={timelineForm.note}
                        onChange={(event) => setTimelineForm((current) => ({ ...current, note: event.target.value }))}
                      />
                      <Button type="button" disabled={!timelineForm.title.trim() || createTimelineEvent.isPending} onClick={addTimelineEvent}>
                        <Clock3 className="h-4 w-4" /> Registrar no live
                      </Button>
                    </div>
                    <div className="mt-4 space-y-2">
                      {(live.data?.timeline ?? []).slice().reverse().map((event) => (
                        <div key={event.id} className="rounded-md border bg-background/35 p-3 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge tone={event.type === 'RISK' || event.type === 'WIPE' ? 'red' : event.type === 'OBJECTIVE_CAPTURED' ? 'green' : 'blue'}>{event.type}</Badge>
                              <p className="font-semibold">{event.title}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">{new Date(event.occurredAt).toLocaleTimeString()}</p>
                          </div>
                          {event.note && <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{event.note}</p>}
                          {event.createdBy && <p className="mt-2 text-xs text-muted-foreground">Autor: {event.createdBy.discordNickname || event.createdBy.discordUsername}</p>}
                        </div>
                      ))}
                      {!live.isLoading && (live.data?.timeline ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nenhum evento ao vivo registrado ainda.</p>}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">Pos-guerra</p>
                        <p className="text-xs text-muted-foreground">Comparativo planejado vs realizado e resumo Staff.</p>
                      </div>
                      <Button type="button" variant="secondary" disabled={!afterAction.data?.markdown} onClick={copyAfterActionMarkdown}>
                        <ClipboardList className="h-4 w-4" /> Copiar Markdown
                      </Button>
                    </div>
                    {afterAction.data && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                          <div className="rounded-md border p-3"><p className="text-muted-foreground">Presentes</p><p className="text-lg font-semibold">{afterAction.data.actual.present}</p></div>
                          <div className="rounded-md border p-3"><p className="text-muted-foreground">Ausentes</p><p className="text-lg font-semibold">{afterAction.data.actual.absent}</p></div>
                          <div className="rounded-md border p-3"><p className="text-muted-foreground">Objetivos</p><p className="text-lg font-semibold">{afterAction.data.actual.objectives}</p></div>
                          <div className="rounded-md border p-3"><p className="text-muted-foreground">Wipes</p><p className="text-lg font-semibold">{afterAction.data.actual.wipes}</p></div>
                        </div>
                        <div className="grid gap-2 md:grid-cols-2">
                          {afterAction.data.signals.map((signal) => (
                            <div key={signal.key} className="rounded-md border p-3 text-xs">
                              <p className="font-semibold">{signal.label}</p>
                              <p className="mt-1 text-muted-foreground">{signal.value} - {signal.severity}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Historico</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {grouped.closed.map((operation) => <OperationCard key={operation.id} operation={operation} />)}
            {!operations.isLoading && grouped.closed.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma operacao encerrada ainda.</p>}
          </CardContent>
        </Card>

        <ConfirmationDialog
          open={Boolean(cancelTarget)}
          title="Cancelar operacao?"
          description="Isso marca a operacao como cancelada e registra auditoria. Presenca/DKP de eventos vinculados nao sao alterados por aqui."
          confirmLabel="Cancelar operacao"
          pending={cancelOperation.isPending}
          onClose={() => setCancelTarget(null)}
          onConfirm={() => {
            if (!cancelTarget) return;
            cancelOperation.mutate(cancelTarget.id, {
              onSuccess: () => {
                setCancelTarget(null);
                notifyToast({ title: 'Operacao cancelada.', tone: 'success' });
              },
            });
          }}
        />
        <ConfirmationDialog
          open={Boolean(closeDraft)}
          title="Encerrar operacao?"
          description="Informe um resultado curto para fechar a janela e alimentar o historico Staff."
          confirmLabel="Encerrar"
          tone="primary"
          pending={closeOperation.isPending}
          onClose={() => setCloseDraft(null)}
          onConfirm={() => {
            if (!closeDraft) return;
            closeOperation.mutate(closeDraft, {
              onSuccess: () => {
                setCloseDraft(null);
                notifyToast({ title: 'Operacao encerrada.', tone: 'success' });
              },
            });
          }}
        >
          <div className="space-y-3">
            <Input
              placeholder="Placar livre, ex: 2-1 / Forte defendida"
              value={closeDraft?.score ?? ''}
              onChange={(event) => setCloseDraft((current) => current && ({ ...current, score: event.target.value }))}
            />
            <textarea
              className="min-h-24 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring"
              placeholder="Resultado operacional"
              value={closeDraft?.result ?? ''}
              onChange={(event) => setCloseDraft((current) => current && ({ ...current, result: event.target.value }))}
            />
            <textarea
              className="min-h-24 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring"
              placeholder="Pontos de melhoria para a proxima"
              value={closeDraft?.improvementNotes ?? ''}
              onChange={(event) => setCloseDraft((current) => current && ({ ...current, improvementNotes: event.target.value }))}
            />
          </div>
        </ConfirmationDialog>
      </div>
    </AuthGuard>
  );
}
