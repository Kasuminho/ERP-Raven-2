'use client';

import { useMemo, useState } from 'react';
import { Coins, MinusCircle, PlusCircle, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { notifyToast } from '@/components/ui/toaster';
import { useCreateDkpTransaction, usePlayerHistory, useStaffDkpPlayers } from '@/hooks/use-guild-api';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';

type AdjustmentForm = {
  amount: string;
  reason: string;
};

export default function StaffDkpPage() {
  const locale = useLocaleStore((state) => state.locale);
  const [search, setSearch] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [forms, setForms] = useState<Record<string, AdjustmentForm>>({});
  const players = useStaffDkpPlayers(search);
  const createTransaction = useCreateDkpTransaction();
  const selectedPlayer = useMemo(
    () => (players.data ?? []).find((player) => player.playerId === selectedPlayerId),
    [players.data, selectedPlayerId],
  );
  const history = usePlayerHistory(selectedPlayerId);

  const updateForm = (playerId: string, patch: Partial<AdjustmentForm>) => {
    setForms((current) => ({
      ...current,
      [playerId]: { ...(current[playerId] ?? { amount: '', reason: '' }), ...patch },
    }));
  };

  const submitAdjustment = (playerId: string, direction: 1 | -1) => {
    const form = forms[playerId] ?? { amount: '', reason: '' };
    const rawAmount = Number(form.amount);
    const reason = form.reason.trim();

    if (!Number.isInteger(rawAmount) || rawAmount <= 0) {
      notifyToast({ title: t(locale, 'positiveIntegerRequired'), tone: 'error' });
      return;
    }

    if (!reason) {
      notifyToast({ title: t(locale, 'adjustmentReasonRequired'), tone: 'error' });
      return;
    }

    createTransaction.mutate(
      {
        playerId,
        amount: rawAmount * direction,
        type: 'ADMIN_ADJUSTMENT',
        referenceId: reason,
      },
      {
        onSuccess: () => {
          updateForm(playerId, { amount: '', reason: '' });
          notifyToast({ title: t(locale, 'dkpAdjusted'), tone: 'success' });
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">{t(locale, 'governanceDeck')}</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'staffDkpControl')}</h1>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={t(locale, 'searchPlayerDiscordOrId')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-3">
          {(players.data ?? []).map((player) => {
            const form = forms[player.playerId] ?? { amount: '', reason: '' };

            return (
              <Card key={player.playerId} className={selectedPlayerId === player.playerId ? 'border-primary/70' : undefined}>
                <CardContent className="space-y-4 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <button className="text-left" onClick={() => setSelectedPlayerId(player.playerId)}>
                      <h2 className="text-lg font-semibold">{player.nickname}</h2>
                      <p className="text-sm text-muted-foreground">{player.discordUsername} - {player.discordId}</p>
                      <p className="text-xs text-muted-foreground">{player.class} - {t(locale, 'layer')} {player.dimensionalLayer}</p>
                    </button>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone="gold">{t(locale, 'total')} {player.total}</Badge>
                      <Badge>{t(locale, 'locked')} {player.locked}</Badge>
                      <Badge tone="green">{t(locale, 'available')} {player.available}</Badge>
                    </div>
                  </div>
                  <div className="grid gap-2 md:grid-cols-[120px_1fr_auto_auto]">
                    <Input
                      type="number"
                      min={1}
                      placeholder="DKP"
                      value={form.amount}
                      onChange={(event) => updateForm(player.playerId, { amount: event.target.value })}
                    />
                    <Input
                      placeholder={t(locale, 'adjustmentReason')}
                      value={form.reason}
                      onChange={(event) => updateForm(player.playerId, { reason: event.target.value })}
                    />
                    <Button onClick={() => submitAdjustment(player.playerId, 1)} disabled={createTransaction.isPending}>
                      <PlusCircle className="h-4 w-4" /> {t(locale, 'add')}
                    </Button>
                    <Button variant="danger" onClick={() => submitAdjustment(player.playerId, -1)} disabled={createTransaction.isPending}>
                      <MinusCircle className="h-4 w-4" /> {t(locale, 'remove')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              {t(locale, 'recentLog')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selectedPlayer && <p className="text-sm text-muted-foreground">{t(locale, 'selectPlayerDkpHistory')}</p>}
            {selectedPlayer && (
              <>
                <div>
                  <p className="font-semibold">{selectedPlayer.nickname}</p>
                  <p className="text-sm text-muted-foreground">
                    {t(locale, 'total')} {selectedPlayer.total} - {t(locale, 'locked')} {selectedPlayer.locked} - {t(locale, 'available')} {selectedPlayer.available}
                  </p>
                </div>
                <div className="space-y-2">
                  {(history.data?.transactions ?? []).slice(0, 12).map((transaction) => (
                    <div key={transaction.id} className="rounded-md border bg-background/35 p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className={transaction.amount >= 0 ? 'text-emerald-200' : 'text-red-200'}>
                          {transaction.amount >= 0 ? '+' : ''}{transaction.amount} DKP
                        </span>
                        <span className="text-xs text-muted-foreground">{new Date(transaction.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{transaction.type}</p>
                      {transaction.referenceId && <p className="mt-1 text-xs">{transaction.referenceId}</p>}
                    </div>
                  ))}
                  {selectedPlayer && (history.data?.transactions ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground">{t(locale, 'noDkpTransactionsYet')}</p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
