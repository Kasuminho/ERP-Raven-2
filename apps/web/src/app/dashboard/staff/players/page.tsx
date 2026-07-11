'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Clipboard, Filter, Save, Swords, UserCheck, XCircle } from 'lucide-react';
import { AuthGuard } from '@/components/guards/auth-guard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { notifyToast } from '@/components/ui/toaster';
import { useCombatProfileRequests, useCombatRosterMatrix, usePlayers, useReviewCombatProfileRequest, useUpdateCombatProfile } from '@/hooks/use-profile-api';
import { combatAvailabilityLabel, combatRoleLabel, playerClassLabel } from '@/lib/game-labels';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';
import type { PlayerClass, PlayerCombatAvailability, PlayerCombatRole, StaffPlayer } from '@/types/api';

const playerClasses: PlayerClass[] = ['GUNSLINGER', 'BERSERKER', 'DESTROYER', 'DEATHBRINGER', 'ASSASSIN', 'DIVINE_CASTER', 'NIGHT_RANGER', 'VANGUARD', 'ELEMENTALIST', 'WARLORD'];
const combatRoles: PlayerCombatRole[] = ['FRONTLINE', 'BACKLINE', 'SUPPORT', 'CALLER', 'SCOUT', 'FLEX', 'RESERVE'];
const availabilityOptions: PlayerCombatAvailability[] = ['UNSET', 'WEEKDAYS', 'WEEKENDS', 'DAILY', 'FLEX', 'LOW'];

type CombatForm = {
  primaryClass: PlayerClass;
  secondaryClass: '' | PlayerClass;
  declaredBuild: string;
  preferredRole: '' | PlayerCombatRole;
  acceptedRoles: PlayerCombatRole[];
  availability: PlayerCombatAvailability;
  publicNote: string;
  staffNote: string;
};

type AttendanceFilter = 'ALL' | 'LOW' | 'OK';
type StatusFilter = 'ALL' | 'STALE' | 'RECENT';

function formFromPlayer(player: StaffPlayer): CombatForm {
  return {
    primaryClass: player.combatProfile?.primaryClass ?? player.class,
    secondaryClass: player.combatProfile?.secondaryClass ?? '',
    declaredBuild: player.combatProfile?.declaredBuild ?? '',
    preferredRole: player.combatProfile?.preferredRole ?? '',
    acceptedRoles: player.combatProfile?.acceptedRoles ?? [],
    availability: player.combatProfile?.availability ?? 'UNSET',
    publicNote: player.combatProfile?.publicNote ?? '',
    staffNote: player.combatProfile?.staffNote ?? '',
  };
}

export default function StaffPlayersPage() {
  const locale = useLocaleStore((state) => state.locale);
  const players = usePlayers();
  const roster = useCombatRosterMatrix();
  const requests = useCombatProfileRequests();
  const updateCombatProfile = useUpdateCombatProfile();
  const approveRequest = useReviewCombatProfileRequest('approve');
  const rejectRequest = useReviewCombatProfileRequest('reject');
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [combatForm, setCombatForm] = useState<CombatForm | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    playerClass: 'ALL' as 'ALL' | PlayerClass,
    role: 'ALL' as 'ALL' | PlayerCombatRole | 'UNSET',
    availability: 'ALL' as 'ALL' | PlayerCombatAvailability,
    minLayer: '',
    attendance: 'ALL' as AttendanceFilter,
    status: 'ALL' as StatusFilter,
  });
  const rosterRows = roster.data?.rows ?? [];
  const filteredRosterRows = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const minLayer = filters.minLayer ? Number(filters.minLayer) : undefined;

    return rosterRows.filter((row) => {
      if (search && !row.nickname.toLowerCase().includes(search)) return false;
      if (filters.playerClass !== 'ALL' && row.primaryClass !== filters.playerClass) return false;
      if (filters.role !== 'ALL' && (row.preferredRole ?? 'UNSET') !== filters.role) return false;
      if (filters.availability !== 'ALL' && row.availability !== filters.availability) return false;
      if (minLayer !== undefined && row.dimensionalLayer < minLayer) return false;
      if (filters.attendance === 'LOW' && row.attendancePercentage >= 50) return false;
      if (filters.attendance === 'OK' && row.attendancePercentage < 50) return false;
      if (filters.status === 'STALE' && !row.signals.includes('SEM_STATUS_RECENTE')) return false;
      if (filters.status === 'RECENT' && row.signals.includes('SEM_STATUS_RECENTE')) return false;
      return true;
    });
  }, [filters, rosterRows]);
  const rosterSummary = useMemo(() => {
    const totals = roster.data?.totals;
    if (totals) {
      return {
        total: totals.activePlayers,
        withBuild: totals.mappedProfiles,
        frontline: totals.frontline,
        support: totals.support,
        pending: requests.data?.length ?? 0,
      };
    }

    const rows = players.data ?? [];
    return {
      total: rows.length,
      withBuild: rows.filter((player) => Boolean(player.combatProfile?.declaredBuild)).length,
      frontline: rows.filter((player) => player.combatProfile?.preferredRole === 'FRONTLINE').length,
      support: rows.filter((player) => player.combatProfile?.preferredRole === 'SUPPORT').length,
      pending: requests.data?.length ?? 0,
    };
  }, [players.data, requests.data, roster.data]);

  function startEdit(player: StaffPlayer) {
    setEditingPlayerId(player.id);
    setCombatForm(formFromPlayer(player));
  }

  function toggleRole(role: PlayerCombatRole) {
    setCombatForm((current) => {
      if (!current) return current;
      const acceptedRoles = current.acceptedRoles.includes(role)
        ? current.acceptedRoles.filter((value) => value !== role)
        : [...current.acceptedRoles, role];
      return { ...current, acceptedRoles };
    });
  }

  function saveCombatProfile(playerId: string) {
    if (!combatForm) return;

    updateCombatProfile.mutate(
      {
        playerId,
        primaryClass: combatForm.primaryClass,
        secondaryClass: combatForm.secondaryClass || undefined,
        declaredBuild: combatForm.declaredBuild || undefined,
        preferredRole: combatForm.preferredRole || undefined,
        acceptedRoles: combatForm.acceptedRoles,
        availability: combatForm.availability,
        publicNote: combatForm.publicNote || undefined,
        staffNote: combatForm.staffNote || undefined,
        reason: 'Atualizacao do roster Staff',
      },
      {
        onSuccess: () => {
          setEditingPlayerId(null);
          setCombatForm(null);
          notifyToast({ title: 'Perfil de combate salvo.', tone: 'success' });
        },
      },
    );
  }

  async function copyRosterMarkdown() {
    if (!roster.data?.markdown) return;

    try {
      await navigator.clipboard.writeText(roster.data.markdown);
      notifyToast({ title: 'Matriz copiada.', description: 'Markdown Staff pronto para a reuniao.', tone: 'success' });
    } catch {
      notifyToast({ title: 'Nao consegui copiar.', description: 'O navegador bloqueou o clipboard.', tone: 'error' });
    }
  }

  function shortDate(value?: string | null) {
    return value ? new Date(value).toLocaleDateString() : '-';
  }

  return (
    <AuthGuard roles={['STAFF', 'ADMIN']}>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase text-primary">{t(locale, 'roster')}</p>
          <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'players')}</h1>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ['Players', rosterSummary.total],
            ['Build mapeada', rosterSummary.withBuild],
            ['Frontline', rosterSummary.frontline],
            ['Suporte', rosterSummary.support],
            ['Pedidos', rosterSummary.pending],
          ].map(([label, value]) => (
            <Card key={String(label)}>
              <CardContent className="flex items-center justify-between p-4">
                <span className="text-sm text-muted-foreground">{label}</span>
                <Badge tone={Number(value) > 0 ? 'gold' : 'muted'}>{value}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>Matriz de composicao</CardTitle>
                <Button type="button" variant="secondary" onClick={() => void copyRosterMarkdown()} disabled={!roster.data?.markdown}>
                  <Clipboard className="h-4 w-4" /> Copiar Markdown
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                {[
                  ['Sem build', roster.data?.totals.missingBuild ?? 0],
                  ['STATUS antigo', roster.data?.totals.staleStatus ?? 0],
                  ['Presenca baixa', roster.data?.totals.lowAttendance ?? 0],
                  ['Reservas', roster.data?.totals.reserve ?? 0],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-md border bg-background/35 p-3">
                    <p className="text-xs uppercase text-muted-foreground">{label}</p>
                    <p className="mt-1 text-xl font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 lg:grid-cols-4">
                {[
                  ['Classes', roster.data?.counts.byClass],
                  ['Roles', roster.data?.counts.byRole],
                  ['Camadas', roster.data?.counts.byLayer],
                  ['Disponibilidade', roster.data?.counts.byAvailability],
                ].map(([title, rows]) => (
                  <div key={String(title)} className="rounded-md border bg-background/35 p-3">
                    <p className="mb-2 text-xs uppercase text-muted-foreground">{title as string}</p>
                    <div className="space-y-1">
                      {((rows ?? []) as Array<{ key: string; count: number }>).filter((row) => row.count > 0).slice(0, 8).map((row) => (
                        <div key={row.key} className="flex justify-between gap-2 text-xs">
                          <span className="truncate">{row.key}</span>
                          <span className="font-semibold">{row.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-md border bg-background/35 p-3">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Filter className="h-4 w-4 text-primary" /> Filtros de roster
                </div>
                <div className="grid gap-2 md:grid-cols-4">
                  <Input placeholder="Buscar player" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
                  <Select value={filters.playerClass} onChange={(event) => setFilters((current) => ({ ...current, playerClass: event.target.value as 'ALL' | PlayerClass }))}>
                    <option value="ALL">Todas as classes</option>
                    {playerClasses.map((playerClass) => <option key={playerClass} value={playerClass}>{playerClassLabel(playerClass, locale)}</option>)}
                  </Select>
                  <Select value={filters.role} onChange={(event) => setFilters((current) => ({ ...current, role: event.target.value as 'ALL' | PlayerCombatRole | 'UNSET' }))}>
                    <option value="ALL">Todos os roles</option>
                    <option value="UNSET">Sem role</option>
                    {combatRoles.map((role) => <option key={role} value={role}>{combatRoleLabel(role, locale)}</option>)}
                  </Select>
                  <Select value={filters.availability} onChange={(event) => setFilters((current) => ({ ...current, availability: event.target.value as 'ALL' | PlayerCombatAvailability }))}>
                    <option value="ALL">Toda disponibilidade</option>
                    {availabilityOptions.map((availability) => <option key={availability} value={availability}>{combatAvailabilityLabel(availability, locale)}</option>)}
                  </Select>
                  <Input type="number" min={1} max={10} placeholder="Camada minima" value={filters.minLayer} onChange={(event) => setFilters((current) => ({ ...current, minLayer: event.target.value }))} />
                  <Select value={filters.attendance} onChange={(event) => setFilters((current) => ({ ...current, attendance: event.target.value as AttendanceFilter }))}>
                    <option value="ALL">Toda presenca</option>
                    <option value="LOW">Presenca baixa</option>
                    <option value="OK">Presenca ok</option>
                  </Select>
                  <Select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as StatusFilter }))}>
                    <option value="ALL">Todo STATUS</option>
                    <option value="STALE">STATUS antigo</option>
                    <option value="RECENT">STATUS recente</option>
                  </Select>
                  <Button type="button" variant="secondary" onClick={() => setFilters({ search: '', playerClass: 'ALL', role: 'ALL', availability: 'ALL', minLayer: '', attendance: 'ALL', status: 'ALL' })}>
                    Limpar filtros
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[980px] text-left text-xs">
                  <thead className="border-b bg-muted/30 text-muted-foreground">
                    <tr>
                      <th className="p-2 font-semibold">Player</th>
                      <th className="p-2 font-semibold">Classe</th>
                      <th className="p-2 font-semibold">Role</th>
                      <th className="p-2 font-semibold">Camada</th>
                      <th className="p-2 font-semibold">Presenca</th>
                      <th className="p-2 font-semibold">Disponibilidade</th>
                      <th className="p-2 font-semibold">Ultimo STATUS</th>
                      <th className="p-2 font-semibold">Sinais</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRosterRows.map((row) => (
                      <tr key={row.playerId} className="border-b last:border-0">
                        <td className="p-2 font-semibold text-primary">{row.nickname}</td>
                        <td className="p-2">{playerClassLabel(row.primaryClass, locale)}</td>
                        <td className="p-2">{combatRoleLabel(row.preferredRole, locale)}</td>
                        <td className="p-2">C{row.dimensionalLayer}</td>
                        <td className="p-2">{Math.round(row.attendancePercentage)}%</td>
                        <td className="p-2">{combatAvailabilityLabel(row.availability, locale)}</td>
                        <td className="p-2">{shortDate(row.lastStatusAt)}</td>
                        <td className="p-2">{row.signals.length > 0 ? row.signals.join(', ') : 'ok'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!roster.isLoading && filteredRosterRows.length === 0 && <p className="text-sm text-muted-foreground">Nenhum player combina com os filtros atuais.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Alertas de composicao</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(roster.data?.alerts ?? []).map((alert) => (
                <div key={alert.key} className="rounded-md border bg-background/35 p-3 text-sm">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="font-semibold">{alert.title}</p>
                    <Badge tone={alert.severity === 'high' ? 'red' : alert.severity === 'medium' ? 'gold' : 'blue'}>{alert.severity}</Badge>
                  </div>
                  <p className="text-muted-foreground">{alert.description}</p>
                  {alert.playerIds?.length ? <p className="mt-2 text-xs text-primary">{alert.playerIds.length} player(s) afetado(s)</p> : null}
                </div>
              ))}
              {!roster.isLoading && (roster.data?.alerts ?? []).length === 0 && <p className="text-sm text-muted-foreground">Sem alerta de composicao agora.</p>}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader><CardTitle>Pedidos de perfil de combate</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(requests.data ?? []).map((request) => (
              <div key={request.id} className="rounded-md border bg-background/35 p-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{request.player?.nickname ?? 'Player'}</p>
                    <p className="text-xs text-muted-foreground">{new Date(request.createdAt).toLocaleString()}</p>
                    <p className="mt-2">
                      {request.primaryClass ? playerClassLabel(request.primaryClass, locale) : 'Classe atual'} / {combatRoleLabel(request.preferredRole, locale)} / {combatAvailabilityLabel(request.availability, locale)}
                    </p>
                    {request.declaredBuild && <p className="text-muted-foreground">Build: {request.declaredBuild}</p>}
                    {request.note && <p className="text-muted-foreground">Nota: {request.note}</p>}
                    {request.proofImageUrl && <a className="text-primary" href={request.proofImageUrl} target="_blank" rel="noreferrer">Abrir print</a>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      disabled={approveRequest.isPending}
                      onClick={() => approveRequest.mutate({ requestId: request.id }, { onSuccess: () => notifyToast({ title: 'Pedido aprovado.', tone: 'success' }) })}
                    >
                      <UserCheck className="h-4 w-4" /> Aprovar
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={rejectRequest.isPending}
                      onClick={() => rejectRequest.mutate({ requestId: request.id, reviewNote: 'Rejeitado pela Staff no roster.' }, { onSuccess: () => notifyToast({ title: 'Pedido rejeitado.', tone: 'success' }) })}
                    >
                      <XCircle className="h-4 w-4" /> Rejeitar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {!requests.isLoading && (requests.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nenhum pedido pendente de perfil de combate.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Roster de combate</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(players.data ?? []).map((player) => {
              const profile = player.combatProfile;
              const isEditing = editingPlayerId === player.id && combatForm;

              return (
              <div key={player.id} className="rounded-md border bg-background/35 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <Link href={`/dashboard/staff/players/${player.id}`} className="min-w-0 hover:text-primary">
                    <p className="font-semibold">{player.nickname}</p>
                    <p className="text-sm text-muted-foreground">{player.user.discordUsername} - {player.user.discordId}</p>
                  </Link>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="blue">{playerClassLabel(profile?.primaryClass ?? player.class, locale)}</Badge>
                    <Badge tone="gold">L{player.dimensionalLayer}</Badge>
                    <Badge>{combatRoleLabel(profile?.preferredRole, locale)}</Badge>
                    <Badge tone="muted">{combatAvailabilityLabel(profile?.availability, locale)}</Badge>
                    {player.roles.map((row) => <Badge key={row.role.name}>{row.role.name}</Badge>)}
                  </div>
                </div>
                <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                  <p><span className="text-muted-foreground">Build:</span> {profile?.declaredBuild ?? '-'}</p>
                  <p><span className="text-muted-foreground">Roles aceitos:</span> {(profile?.acceptedRoles ?? []).map((role) => combatRoleLabel(role, locale)).join(', ') || '-'}</p>
                  <p><span className="text-muted-foreground">Nota:</span> {profile?.publicNote ?? '-'}</p>
                </div>
                {isEditing ? (
                  <div className="mt-4 grid gap-3 rounded-md border bg-background/45 p-3 md:grid-cols-2">
                    <Select value={combatForm.primaryClass} onChange={(event) => setCombatForm((current) => current && ({ ...current, primaryClass: event.target.value as PlayerClass }))}>
                      {playerClasses.map((playerClass) => <option key={playerClass} value={playerClass}>{playerClassLabel(playerClass, locale)}</option>)}
                    </Select>
                    <Select value={combatForm.secondaryClass} onChange={(event) => setCombatForm((current) => current && ({ ...current, secondaryClass: event.target.value as PlayerClass | '' }))}>
                      <option value="">Sem secundaria</option>
                      {playerClasses.map((playerClass) => <option key={playerClass} value={playerClass}>{playerClassLabel(playerClass, locale)}</option>)}
                    </Select>
                    <Input placeholder="Build declarada" value={combatForm.declaredBuild} onChange={(event) => setCombatForm((current) => current && ({ ...current, declaredBuild: event.target.value }))} />
                    <Select value={combatForm.preferredRole} onChange={(event) => setCombatForm((current) => current && ({ ...current, preferredRole: event.target.value as PlayerCombatRole | '' }))}>
                      <option value="">Sem papel preferido</option>
                      {combatRoles.map((role) => <option key={role} value={role}>{combatRoleLabel(role, locale)}</option>)}
                    </Select>
                    <Select value={combatForm.availability} onChange={(event) => setCombatForm((current) => current && ({ ...current, availability: event.target.value as PlayerCombatAvailability }))}>
                      {availabilityOptions.map((availability) => <option key={availability} value={availability}>{combatAvailabilityLabel(availability, locale)}</option>)}
                    </Select>
                    <Input placeholder="Nota publica para operacao" value={combatForm.publicNote} onChange={(event) => setCombatForm((current) => current && ({ ...current, publicNote: event.target.value }))} />
                    <Input className="md:col-span-2" placeholder="Nota interna Staff" value={combatForm.staffNote} onChange={(event) => setCombatForm((current) => current && ({ ...current, staffNote: event.target.value }))} />
                    <div className="md:col-span-2 flex flex-wrap gap-2">
                      {combatRoles.map((role) => (
                        <Button key={role} type="button" variant={combatForm.acceptedRoles.includes(role) ? 'primary' : 'secondary'} onClick={() => toggleRole(role)}>
                          {combatRoleLabel(role, locale)}
                        </Button>
                      ))}
                    </div>
                    <div className="md:col-span-2 flex flex-wrap gap-2">
                      <Button type="button" disabled={updateCombatProfile.isPending} onClick={() => saveCombatProfile(player.id)}>
                        <Save className="h-4 w-4" /> Salvar roster
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => { setEditingPlayerId(null); setCombatForm(null); }}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button type="button" variant="secondary" className="mt-3" onClick={() => startEdit(player)}>
                    <Swords className="h-4 w-4" /> Editar perfil de combate
                  </Button>
                )}
              </div>
              );
            })}
            {!players.isLoading && (players.data ?? []).length === 0 && <EmptyState title={t(locale, 'noPlayers')}>{t(locale, 'noPlayersHelp')}</EmptyState>}
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
