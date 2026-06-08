'use client';

import Link from 'next/link';
import { AuthGuard } from '@/components/guards/auth-guard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { usePlayers } from '@/hooks/use-guild-api';
import { playerClassLabel } from '@/lib/game-labels';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';

export default function StaffPlayersPage() {
  const locale = useLocaleStore((state) => state.locale);
  const players = usePlayers();

  return (
    <AuthGuard roles={['STAFF', 'ADMIN']}>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase text-primary">{t(locale, 'roster')}</p>
          <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'players')}</h1>
        </div>
        <Card>
          <CardHeader><CardTitle>{t(locale, 'guildProfiles')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(players.data ?? []).map((player) => (
              <Link key={player.id} href={`/dashboard/staff/players/${player.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background/35 p-3 hover:bg-muted">
                <div>
                  <p className="font-semibold">{player.nickname}</p>
                  <p className="text-sm text-muted-foreground">{player.user.discordUsername} - {player.user.discordId}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="blue">{playerClassLabel(player.class, locale)}</Badge>
                  <Badge tone="gold">L{player.dimensionalLayer}</Badge>
                  {player.roles.map((row) => <Badge key={row.role.name}>{row.role.name}</Badge>)}
                </div>
              </Link>
            ))}
            {!players.isLoading && (players.data ?? []).length === 0 && <EmptyState title={t(locale, 'noPlayers')}>{t(locale, 'noPlayersHelp')}</EmptyState>}
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
