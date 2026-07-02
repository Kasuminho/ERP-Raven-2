'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, ExternalLink, Gift, HandCoins, XCircle } from 'lucide-react';
import { AuthGuard } from '@/components/guards/auth-guard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { notifyToast } from '@/components/ui/toaster';
import { useApproveDaoshiReceipt, useCreateManualDaoshiReceipt, useRejectDaoshiReceipt, useRunDaoshiRaffle, useStaffDaoshiReceipts, useStaffDaoshiSummary } from '@/hooks/use-daoshi-api';
import { usePlayers } from '@/hooks/use-profile-api';
import { displayImageUrl } from '@/lib/images';
import type { DaoshiReceiptStatus } from '@/types/api';

const statusTone = {
  PENDING: 'gold',
  APPROVED: 'green',
  REJECTED: 'red',
} as const;

function money(cents = 0): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export default function StaffDaoshiPage() {
  const [month, setMonth] = useState(currentMonth());
  const [status, setStatus] = useState<DaoshiReceiptStatus | ''>('PENDING');
  const receipts = useStaffDaoshiReceipts(status || undefined, month);
  const summary = useStaffDaoshiSummary(month);
  const approve = useApproveDaoshiReceipt();
  const reject = useRejectDaoshiReceipt();
  const runRaffle = useRunDaoshiRaffle();
  const players = usePlayers();
  const createManual = useCreateManualDaoshiReceipt();
  const [review, setReview] = useState<Record<string, { amount: string; note: string }>>({});
  const [confirmRaffle, setConfirmRaffle] = useState(false);
  const [receiptToReject, setReceiptToReject] = useState<string>();
  const [manual, setManual] = useState({ playerId: '', amount: '', date: new Date().toISOString().slice(0, 10), note: '' });
  const winner = useMemo(
    () => summary.data?.entries.find((entry) => entry.playerId === summary.data?.raffle?.winnerPlayerId),
    [summary.data],
  );
  const progress = summary.data ? Math.min(100, Math.round((summary.data.totalApprovedCents / summary.data.targetCents) * 100)) : 0;

  function reviewState(id: string, fallbackCents: number) {
    return review[id] ?? { amount: String((fallbackCents / 100).toFixed(2)), note: '' };
  }

  return (
    <AuthGuard roles={['STAFF', 'ADMIN']}>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase text-primary">Daoshi / AACD</p>
          <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">Cash Daoshi</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Aprove comprovantes, corrija valores pelo extrato da Daoshi e rode o sorteio mensal de $50 quando a meta da guild bater R$10.000.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Resumo do mes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
                <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value as DaoshiReceiptStatus | '')}>
                  <option value="">Todos status</option>
                  <option value="PENDING">Pendentes</option>
                  <option value="APPROVED">Aprovados</option>
                  <option value="REJECTED">Rejeitados</option>
                </select>
                <Badge tone={summary.data?.raffleEnabled ? 'green' : 'gold'}>
                  {summary.data?.raffleEnabled ? 'Sorteio habilitado' : 'Meta em andamento'}
                </Badge>
              </div>
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span>{money(summary.data?.totalApprovedCents ?? 0)}</span>
                  <span>{money(summary.data?.targetCents ?? 1_000_000)}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-md border bg-background/45 p-3">
                  <p className="text-xs text-muted-foreground">Cupons totais</p>
                  <p className="text-2xl font-bold">{summary.data?.totalCoupons ?? 0}</p>
                </div>
                <div className="rounded-md border bg-background/45 p-3">
                  <p className="text-xs text-muted-foreground">Participantes</p>
                  <p className="text-2xl font-bold">{summary.data?.entries.length ?? 0}</p>
                </div>
                <div className="rounded-md border bg-background/45 p-3">
                  <p className="text-xs text-muted-foreground">Premio</p>
                  <p className="text-2xl font-bold">$50</p>
                </div>
              </div>
              {summary.data?.raffle ? (
                <div className="rounded-md border border-emerald-400/30 bg-emerald-500/10 p-3">
                  <p className="font-semibold">Sorteio ja executado</p>
                  <p className="text-sm text-muted-foreground">
                    Vencedor: {winner?.nickname ?? summary.data.raffle.winnerPlayerId} - Cupom #{summary.data.raffle.winnerCoupon}
                  </p>
                </div>
              ) : (
                <Button
                  disabled={!summary.data?.raffleEnabled || runRaffle.isPending}
                  onClick={() => setConfirmRaffle(true)}
                >
                  <Gift className="h-4 w-4" /> Rodar sorteio do mes
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cupons por player</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[390px] space-y-2 overflow-auto">
              {(summary.data?.entries ?? []).map((entry) => (
                <div key={entry.playerId} className="rounded-md border bg-background/45 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{entry.nickname}</p>
                    <Badge tone="blue">#{entry.couponStart}-{entry.couponEnd}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{money(entry.approvedCents)} - {entry.coupons} cupom(ns)</p>
                </div>
              ))}
              {!summary.isLoading && (summary.data?.entries ?? []).length === 0 && (
                <EmptyState title="Sem cupons no mes">Aprovacoes acima de R$200 aparecem aqui.</EmptyState>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><HandCoins className="h-5 w-5 text-primary" /> Lancamento manual sem comprovante</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 xl:grid-cols-[1.2fr_0.5fr_0.5fr_1fr_auto]">
            <Select value={manual.playerId} onChange={(event) => setManual((current) => ({ ...current, playerId: event.target.value }))}>
              <option value="">Selecione o player</option>
              {(players.data ?? []).map((player) => (
                <option key={player.id} value={player.id}>{player.nickname} - {player.user.discordUsername}</option>
              ))}
            </Select>
            <Input type="number" min="0" step="0.01" placeholder="Valor R$" value={manual.amount} onChange={(event) => setManual((current) => ({ ...current, amount: event.target.value }))} />
            <Input type="date" value={manual.date} onChange={(event) => setManual((current) => ({ ...current, date: event.target.value }))} />
            <Input placeholder="Motivo / extrato Daoshi" value={manual.note} onChange={(event) => setManual((current) => ({ ...current, note: event.target.value }))} />
            <Button
              disabled={createManual.isPending || !manual.playerId || !Number(manual.amount)}
              onClick={() => createManual.mutate(
                { playerId: manual.playerId, purchaseAmount: Number(manual.amount), purchaseDate: `${manual.date}T12:00:00.000Z`, reviewNote: manual.note || undefined },
                {
                  onSuccess: () => {
                    notifyToast({ title: 'Lancamento manual aprovado.', tone: 'success' });
                    setManual({ playerId: '', amount: '', date: new Date().toISOString().slice(0, 10), note: '' });
                  },
                },
              )}
            >
              Lancar
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="font-[var(--font-cinzel)] text-2xl font-bold">Comprovantes</h2>
          {(receipts.data ?? []).map((receipt) => {
            const state = reviewState(receipt.id, receipt.approvedCents ?? receipt.purchaseCents);

            return (
              <Card key={receipt.id}>
                <CardContent className="grid gap-4 p-4 xl:grid-cols-[160px_1fr_360px]">
                  {receipt.proofImageUrl ? (
                    <img className="aspect-video w-full rounded-md border object-cover xl:aspect-square" src={displayImageUrl(receipt.proofImageUrl)} alt="Comprovante Daoshi" />
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center rounded-md border border-dashed bg-background/35 text-center text-xs text-muted-foreground xl:aspect-square">
                      Lancamento manual sem print
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={statusTone[receipt.status]}>{receipt.status}</Badge>
                      <Badge tone="muted">AACD</Badge>
                      <span className="text-sm text-muted-foreground">{new Date(receipt.purchaseDate).toLocaleDateString()}</span>
                    </div>
                    <p className="text-lg font-semibold">{receipt.player?.nickname}</p>
                    <p className="text-sm text-muted-foreground">{receipt.player?.user.discordUsername} / {receipt.player?.user.discordId}</p>
                    <p>Informado: <strong>{money(receipt.purchaseCents)}</strong></p>
                    {receipt.approvedCents ? <p className="text-primary">Aprovado: <strong>{money(receipt.approvedCents)}</strong></p> : null}
                    {receipt.playerNote ? <p className="text-sm text-muted-foreground">Player: {receipt.playerNote}</p> : null}
                    {receipt.reviewNote ? <p className="text-sm text-muted-foreground">Staff: {receipt.reviewNote}</p> : null}
                    {receipt.proofImageUrl && (
                      <a
                        href={receipt.proofImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border bg-secondary px-3 py-2 text-sm font-semibold transition hover:bg-muted"
                      >
                        <ExternalLink className="h-4 w-4" /> Abrir comprovante
                      </a>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={state.amount}
                      onChange={(event) => setReview((current) => ({ ...current, [receipt.id]: { ...state, amount: event.target.value } }))}
                      placeholder="Valor aprovado em R$"
                    />
                    <Input
                      value={state.note}
                      onChange={(event) => setReview((current) => ({ ...current, [receipt.id]: { ...state, note: event.target.value } }))}
                      placeholder="Nota da staff / motivo"
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button
                        disabled={approve.isPending}
                        onClick={() => approve.mutate(
                          { id: receipt.id, approvedAmount: Number(state.amount), reviewNote: state.note || undefined },
                          { onSuccess: () => notifyToast({ title: 'Comprovante aprovado/corrigido.', tone: 'success' }) },
                        )}
                      >
                        <CheckCircle2 className="h-4 w-4" /> Aprovar
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={reject.isPending || !state.note.trim()}
                        onClick={() => setReceiptToReject(receipt.id)}
                      >
                        <XCircle className="h-4 w-4" /> Rejeitar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {!receipts.isLoading && (receipts.data ?? []).length === 0 && (
            <EmptyState title="Nenhum comprovante encontrado">Troque o filtro de status ou mes para buscar outros envios.</EmptyState>
          )}
        </div>
        <ConfirmationDialog
          open={confirmRaffle}
          title="Rodar sorteio mensal?"
          description={`O vencedor de ${month} sera escolhido entre ${summary.data?.totalCoupons ?? 0} cupons aprovados. O resultado nao deve ser sorteado novamente.`}
          confirmLabel="Rodar sorteio"
          pending={runRaffle.isPending}
          tone="primary"
          onClose={() => setConfirmRaffle(false)}
          onConfirm={() => runRaffle.mutate(month, { onSuccess: () => {
            setConfirmRaffle(false);
            notifyToast({ title: 'Sorteio executado.', tone: 'success' });
          } })}
        />
        <ConfirmationDialog
          open={Boolean(receiptToReject)}
          title="Rejeitar comprovante?"
          description="O comprovante nao contara para a meta nem gerara cupons. A justificativa preenchida ficara registrada para o player e a Staff."
          confirmLabel="Rejeitar comprovante"
          pending={reject.isPending}
          onClose={() => setReceiptToReject(undefined)}
          onConfirm={() => {
            if (!receiptToReject) return;
            const note = review[receiptToReject]?.note?.trim();
            if (!note) return;
            reject.mutate(
              { id: receiptToReject, reviewNote: note },
              { onSuccess: () => {
                setReceiptToReject(undefined);
                notifyToast({ title: 'Comprovante rejeitado.', tone: 'success' });
              } },
            );
          }}
        />
      </div>
    </AuthGuard>
  );
}
