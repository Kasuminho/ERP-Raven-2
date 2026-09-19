'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Shield, ShieldAlert, Swords, Search, Users, Trophy, Sparkles, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useCombatRosterMatrix, usePlayers } from '@/hooks/use-profile-api';
import { combatRoleLabel, playerClassLabel } from '@/lib/game-labels';
import { t } from '@/lib/i18n';
import { useAuthStore } from '@/store/auth-store';
import { useLocaleStore } from '@/store/locale-store';
import type { PlayerClass, StaffPlayer } from '@/types/api';

const ALL_CLASSES: PlayerClass[] = [
  'VANGUARD',
  'DIVINE_CASTER',
  'DEATHBRINGER',
  'BERSERKER',
  'GUNSLINGER',
  'NIGHT_RANGER',
  'ELEMENTALIST',
  'ASSASSIN',
  'DESTROYER',
  'WARLORD',
];

function classTone(cls: PlayerClass): 'gold' | 'blue' | 'green' | 'red' | 'muted' {
  switch (cls) {
    case 'VANGUARD':
    case 'WARLORD':
      return 'blue';
    case 'DIVINE_CASTER':
      return 'green';
    case 'DEATHBRINGER':
    case 'ASSASSIN':
      return 'red';
    default:
      return 'gold';
  }
}

export default function GuildMembersPage() {
  const locale = useLocaleStore((state) => state.locale);
  const hasRole = useAuthStore((state) => state.hasRole);
  const isStaff = hasRole(['STAFF', 'ADMIN']);

  const playersQuery = usePlayers();
  const rosterQuery = useCombatRosterMatrix();

  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'cp' | 'attendance' | 'name'>('cp');

  const playersList = useMemo(() => {
    const list = playersQuery.data ?? [];
    return list.filter((p) => p.isActive !== false);
  }, [playersQuery.data]);

  const stats = useMemo(() => {
    const total = playersList.length;
    const totalCp = playersList.reduce((acc, p) => acc + (p.combatPower ?? 0), 0);
    const maxCp = playersList.reduce((max, p) => Math.max(max, p.combatPower ?? 0), 0);
    const avgAttendance = total > 0
      ? Math.round(playersList.reduce((acc, p) => acc + (p.attendancePercentage ?? 0), 0) / total)
      : 0;

    return {
      total,
      avgCp: total > 0 ? Math.round(totalCp / total) : 0,
      maxCp,
      avgAttendance,
    };
  }, [playersList]);

  const filteredPlayers = useMemo(() => {
    return playersList
      .filter((p) => {
        const matchesSearch =
          !search ||
          p.nickname.toLowerCase().includes(search.toLowerCase()) ||
          (p.user?.discordUsername && p.user.discordUsername.toLowerCase().includes(search.toLowerCase()));

        const playerCls = p.combatProfile?.primaryClass ?? p.class;
        const matchesClass = selectedClass === 'ALL' || playerCls === selectedClass;

        return matchesSearch && matchesClass;
      })
      .sort((a, b) => {
        if (sortField === 'cp') {
          return (b.combatPower ?? 0) - (a.combatPower ?? 0);
        }
        if (sortField === 'attendance') {
          return (b.attendancePercentage ?? 0) - (a.attendancePercentage ?? 0);
        }
        return a.nickname.localeCompare(b.nickname);
      });
  }, [playersList, search, selectedClass, sortField]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="rounded-xl border border-primary/20 bg-card/60 p-5 shadow-rune backdrop-blur-xl sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="page-kicker">{t(locale, 'hubGuild')}</p>
            <h1 className="page-title mt-1 text-2xl sm:text-3xl">Roster & Força da Guilda</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Acompanhe os membros da guilda, distribuição de classes, Poder de Combate (CP) e taxa de presença.
            </p>
          </div>
          {isStaff && (
            <Link href="/dashboard/staff/players">
              <Button variant="secondary" className="gap-2 border border-primary/30 text-primary">
                <ShieldAlert className="h-4 w-4" />
                Painel Staff de Membros
              </Button>
            </Link>
          )}
        </div>

        {/* Quick Stats Grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-white/10 bg-background/50 p-3.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-4 w-4 text-primary" />
              <span>Total de Membros</span>
            </div>
            <p className="mt-1 text-2xl font-bold font-tabular text-foreground">{stats.total}</p>
          </div>

          <div className="rounded-lg border border-white/10 bg-background/50 p-3.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Swords className="h-4 w-4 text-primary" />
              <span>Maior CP</span>
            </div>
            <p className="mt-1 text-2xl font-bold font-tabular text-primary">
              {stats.maxCp > 0 ? stats.maxCp.toLocaleString() : '—'}
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-background/50 p-3.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Trophy className="h-4 w-4 text-primary" />
              <span>Média de CP</span>
            </div>
            <p className="mt-1 text-2xl font-bold font-tabular text-foreground">
              {stats.avgCp > 0 ? stats.avgCp.toLocaleString() : '—'}
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-background/50 p-3.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span>Presença Média</span>
            </div>
            <p className="mt-1 text-2xl font-bold font-tabular text-emerald-400">{stats.avgAttendance}%</p>
          </div>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar membro por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Ordenar por:</span>
            <div className="flex rounded-lg border border-white/10 bg-background/50 p-1 text-xs">
              <button
                type="button"
                onClick={() => setSortField('cp')}
                className={`rounded px-2.5 py-1 transition ${sortField === 'cp' ? 'bg-primary/20 font-bold text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                CP
              </button>
              <button
                type="button"
                onClick={() => setSortField('attendance')}
                className={`rounded px-2.5 py-1 transition ${sortField === 'attendance' ? 'bg-primary/20 font-bold text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Presença
              </button>
              <button
                type="button"
                onClick={() => setSortField('name')}
                className={`rounded px-2.5 py-1 transition ${sortField === 'name' ? 'bg-primary/20 font-bold text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Nome
              </button>
            </div>
          </div>
        </div>

        {/* Class Filter Badges */}
        <div className="flex snap-x gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => setSelectedClass('ALL')}
            className={`shrink-0 rounded-md border px-3 py-1 text-xs font-medium transition ${
              selectedClass === 'ALL'
                ? 'border-primary/50 bg-primary/20 text-primary'
                : 'border-white/10 bg-background/40 text-muted-foreground hover:border-white/20 hover:text-foreground'
            }`}
          >
            Todas as Classes ({playersList.length})
          </button>
          {ALL_CLASSES.map((cls) => {
            const count = playersList.filter((p) => (p.combatProfile?.primaryClass ?? p.class) === cls).length;
            if (count === 0 && selectedClass !== cls) return null;
            return (
              <button
                key={cls}
                type="button"
                onClick={() => setSelectedClass(cls)}
                className={`shrink-0 rounded-md border px-3 py-1 text-xs font-medium transition ${
                  selectedClass === cls
                    ? 'border-primary/50 bg-primary/20 text-primary'
                    : 'border-white/10 bg-background/40 text-muted-foreground hover:border-white/20 hover:text-foreground'
                }`}
              >
                {playerClassLabel(cls, locale)} ({count})
              </button>
            );
          })}
        </div>
      </section>

      {/* Roster Table */}
      <Card className="border-white/10 bg-card/70">
        <CardContent className="p-0">
          {playersQuery.isLoading ? (
            <div className="space-y-3 p-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="p-8">
              <EmptyState title="Nenhum membro encontrado">
                Tente ajustar os filtros ou termo de busca acima.
              </EmptyState>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-white/10 bg-background/60 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Membro</th>
                    <th className="px-4 py-3">Classe</th>
                    <th className="px-4 py-3 text-right">Poder (CP)</th>
                    <th className="px-4 py-3 text-center">Camada</th>
                    <th className="px-4 py-3 text-center">Presença</th>
                    <th className="px-4 py-3 text-right">Função</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredPlayers.map((player, index) => {
                    const primaryClass = player.combatProfile?.primaryClass ?? player.class;
                    const role = player.combatProfile?.preferredRole;
                    const attendance = player.attendancePercentage ?? 0;

                    return (
                      <tr key={player.id} className="transition-colors hover:bg-muted/40">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="font-tabular text-xs font-semibold text-muted-foreground">
                              #{index + 1}
                            </span>
                            <div>
                              <p className="font-semibold text-foreground">{player.nickname}</p>
                              {player.user?.discordUsername && (
                                <p className="text-xs text-muted-foreground/80">@{player.user.discordUsername}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <Badge tone={classTone(primaryClass)}>
                            {playerClassLabel(primaryClass, locale)}
                          </Badge>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <span className="font-tabular font-bold text-primary">
                            {player.combatPower ? player.combatPower.toLocaleString() : '—'}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span className="font-tabular text-xs text-muted-foreground">
                            C{player.dimensionalLayer || 1}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-1.5 font-tabular font-medium">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                attendance >= 75
                                  ? 'bg-emerald-400'
                                  : attendance >= 50
                                  ? 'bg-amber-400'
                                  : 'bg-red-400'
                              }`}
                            />
                            <span
                              className={
                                attendance >= 75
                                  ? 'text-emerald-400'
                                  : attendance >= 50
                                  ? 'text-amber-400'
                                  : 'text-red-400'
                              }
                            >
                              {attendance}%
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right">
                          {role ? (
                            <span className="text-xs text-muted-foreground">
                              {combatRoleLabel(role, locale)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
