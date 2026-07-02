'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Clipboard, FileText, Search } from 'lucide-react';
import { AuthGuard } from '@/components/guards/auth-guard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Select } from '@/components/ui/select';
import { notifyToast } from '@/components/ui/toaster';
import { useAuctionDiagnosticOptions, useAuctionDiagnostics, useAuctionDossier, useAuctionFinalizationPreview, useAuctionTimeline } from '@/hooks/use-auctions-api';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';
import type { AuctionDiagnosticOption, AuctionDiagnosticSummary, AuctionDossier, AuctionFinalizationPreview, AuctionTimelineEvent } from '@/types/api';

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function shortId(value: string) {
  return value.slice(0, 8);
}

function formatOptionDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function optionLabel(option: AuctionDiagnosticOption) {
  return `${option.itemName} / ${option.winnerName ?? 'Sem vencedor registrado'} / ${formatOptionDate(option.endedAt)}`;
}

function issueTone(severity: AuctionDiagnosticSummary['issues'][number]['severity']) {
  if (severity === 'high') return 'red';
  if (severity === 'medium') return 'gold';
  return 'blue';
}

function outcomeLabel(outcome: AuctionDiagnosticSummary['outcome']) {
  const labels: Record<AuctionDiagnosticSummary['outcome'], string> = {
    NO_ACTION: 'Sem acao automatica agora',
    FINISH_STANDARD: 'Finalizaria STANDARD',
    PENDING_REVIEW: 'Moveria para review',
    EXPAND_LAYER: 'Expandiria camada',
    RELIST: 'Relistaria',
  };

  return labels[outcome];
}

function CountCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-background/55 p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function JsonPreview({ value }: { value: Record<string, unknown> | null }) {
  if (!value) return <span className="text-muted-foreground">-</span>;

  return (
    <pre className="max-h-32 overflow-auto rounded-md border border-white/10 bg-black/25 p-2 text-xs text-muted-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function TimelineCard({ events }: { events: AuctionTimelineEvent[] }) {
  if (!events.length) {
    return <p className="text-sm text-muted-foreground">Sem eventos suficientes para montar timeline.</p>;
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div key={event.id} className="rounded-lg border border-white/10 bg-background/45 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={event.tone}>{event.type}</Badge>
                <p className="font-semibold">{event.title}</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{event.description}</p>
              {event.actorName ? <p className="mt-1 text-xs text-muted-foreground">Ator: {event.actorName}</p> : null}
            </div>
            <p className="shrink-0 text-xs text-muted-foreground">{formatDate(event.occurredAt)}</p>
          </div>
          {event.metadata ? <div className="mt-3"><JsonPreview value={event.metadata} /></div> : null}
        </div>
      ))}
    </div>
  );
}

function PreviewCard({ preview }: { preview: AuctionFinalizationPreview }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Previa de finalizacao</CardTitle>
          <Badge tone={preview.action === 'NO_ACTION' ? 'green' : preview.action === 'RELIST' ? 'red' : 'gold'}>
            {preview.actionLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{preview.description}</p>
        <div className="grid gap-3 md:grid-cols-3">
          <CountCard label="Locks a consumir" value={preview.locksToConsume.length} />
          <CountCard label="Locks a liberar" value={preview.locksToRelease.length} />
          <CountCard label="Bids ignorados" value={preview.ignoredBids.length} />
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-background/45 p-4">
            <p className="text-sm font-semibold">Candidato previsto</p>
            {preview.candidate ? (
              <div className="mt-2 text-sm text-muted-foreground">
                <p>{preview.candidate.nickname} - {preview.candidate.bidAmount} DKP</p>
                <p>Layer {preview.candidate.dimensionalLayer} - {preview.candidate.attendancePercentage.toFixed(2)}% presenca</p>
                <p className="mt-1 font-mono text-xs">{shortId(preview.candidate.bidId)}</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Nenhum candidato selecionado pela previa.</p>
            )}
          </div>
          <div className="rounded-lg border border-white/10 bg-background/45 p-4">
            <p className="text-sm font-semibold">Proximo estado</p>
            {preview.nextState ? (
              <div className="mt-2 text-sm text-muted-foreground">
                <p>Status: {preview.nextState.status}</p>
                <p>Camada: {preview.nextState.minimumLayer ?? '-'}</p>
                <p>Fim: {formatDate(preview.nextState.endsAt)}</p>
                <p>Reabre: {formatDate(preview.nextState.reopensAt)}</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Sem transicao prevista agora.</p>
            )}
          </div>
        </div>
        {preview.risks.length ? (
          <div className="space-y-2">
            {preview.risks.slice(0, 5).map((risk, index) => (
              <div key={`${risk.title}-${index}`} className="rounded-lg border border-white/10 bg-background/45 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-primary" />
                  <p className="font-semibold">{risk.title}</p>
                  <Badge tone={issueTone(risk.severity)}>{risk.severity}</Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{risk.description}</p>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DossierCard({ dossier }: { dossier: AuctionDossier }) {
  async function copyDossier() {
    try {
      await navigator.clipboard.writeText(dossier.markdown);
      notifyToast({ title: 'Dossie copiado', description: 'Markdown Staff pronto para colar no atendimento.', tone: 'success' });
    } catch {
      notifyToast({ title: 'Nao consegui copiar', description: 'O navegador bloqueou o clipboard desta vez.', tone: 'error' });
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <CardTitle>Dossie Staff</CardTitle>
          </div>
          <Button type="button" variant="secondary" className="gap-2" onClick={() => void copyDossier()}>
            <Clipboard className="h-4 w-4" />
            Copiar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-black/25 p-4 text-xs text-muted-foreground">
          {dossier.markdown}
        </pre>
      </CardContent>
    </Card>
  );
}

export default function AuctionDiagnosticsPage() {
  const locale = useLocaleStore((state) => state.locale);
  const router = useRouter();
  const searchParams = useSearchParams();
  const auctionId = searchParams.get('auctionId')?.trim() ?? '';
  const [draftId, setDraftId] = useState(auctionId);
  const auctionOptions = useAuctionDiagnosticOptions();
  const diagnostics = useAuctionDiagnostics(auctionId);
  const timeline = useAuctionTimeline(auctionId);
  const preview = useAuctionFinalizationPreview(auctionId);
  const dossier = useAuctionDossier(auctionId);

  useEffect(() => {
    setDraftId(auctionId);
  }, [auctionId]);

  const countRows = useMemo(() => {
    if (!diagnostics.data) return [];
    const { counts } = diagnostics.data;
    return [
      ['Bids', counts.bids],
      ['Bids validos', counts.validBids],
      ['Bids invalidos', counts.invalidBids],
      ['Locks ativos', counts.activeLocks],
      ['Bids validos com lock', counts.validBidsWithActiveLocks],
      ['Bids na camada minima', counts.validBidsAtMinimumLayer],
      ['Cancelamentos', counts.cancellationRequests],
      ['Logs auditados', counts.auditLogs],
    ];
  }, [diagnostics.data]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextId = draftId.trim();
    if (!nextId) return;
    router.push(`/dashboard/staff/auction-diagnostics?auctionId=${encodeURIComponent(nextId)}`);
  }

  return (
    <AuthGuard roles={['STAFF', 'ADMIN']}>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase text-primary">Raio-x operacional</p>
          <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'auctionDiagnostics')}</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Use esta tela quando um leilao parecer estranho. Ela mostra o que a automacao enxergaria agora e evidencia bids,
            locks, cancelamentos, votos e logs relacionados.
          </p>
        </div>

        <Card>
          <CardContent className="pt-5">
            <form className="flex flex-col gap-3 md:flex-row" onSubmit={submit}>
              <Select
                value={draftId}
                onChange={(event) => setDraftId(event.target.value)}
                disabled={auctionOptions.isLoading || auctionOptions.isError || !(auctionOptions.data?.length)}
                aria-label="Selecionar leilao"
                className="md:flex-1"
              >
                <option value="">
                  {auctionOptions.isLoading
                    ? 'Carregando leiloes...'
                    : auctionOptions.isError
                      ? 'Nao consegui carregar os leiloes'
                      : (auctionOptions.data?.length ?? 0) === 0
                        ? 'Nenhum leilao encontrado'
                        : 'Selecione um leilao'}
                </option>
                {(auctionOptions.data ?? []).map((option) => (
                  <option key={option.id} value={option.id}>
                    {optionLabel(option)}
                  </option>
                ))}
              </Select>
              <Button type="submit" className="gap-2">
                <Search className="h-4 w-4" />
                Consultar
              </Button>
            </form>
          </CardContent>
        </Card>

        {!auctionId ? (
          <EmptyState title="Nenhum leilao selecionado">Selecione um leilao para abrir o diagnostico.</EmptyState>
        ) : null}

        {diagnostics.isError ? (
          <Card className="border-red-400/35 bg-red-500/10">
            <CardContent className="pt-5">
              <p className="font-semibold">Nao consegui carregar o diagnostico.</p>
              <p className="mt-1 text-sm text-muted-foreground">Confere se o ID do leilao esta correto e tenta de novo.</p>
            </CardContent>
          </Card>
        ) : null}

        {diagnostics.data ? (
          <>
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{diagnostics.data.auction.itemName}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {diagnostics.data.auction.id} - termina em {formatDate(diagnostics.data.auction.endsAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="gold">{diagnostics.data.auction.itemTier}</Badge>
                    <Badge tone="blue">{diagnostics.data.auction.auctionMode}</Badge>
                    <Badge tone="muted">{diagnostics.data.auction.status}</Badge>
                    <Badge tone={diagnostics.data.outcome === 'NO_ACTION' ? 'green' : 'gold'}>
                      {outcomeLabel(diagnostics.data.outcome)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <CountCard label="Minimo DKP" value={diagnostics.data.auction.minimumBid} />
                <CountCard label="Camada minima" value={diagnostics.data.auction.minimumLayer ?? '-'} />
                <CountCard label="Staff review" value={diagnostics.data.auction.requiresStaffReview ? 'Sim' : 'Nao'} />
                <CountCard label="Gerado em" value={formatDate(diagnostics.data.generatedAt)} />
                {countRows.map(([label, value]) => (
                  <CountCard key={label} label={String(label)} value={value} />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={diagnostics.data.stateReason.tone}>{diagnostics.data.auction.status}</Badge>
                  <p className="font-semibold">{diagnostics.data.stateReason.title}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{diagnostics.data.stateReason.description}</p>
              </CardContent>
            </Card>

            {preview.isError ? (
              <Card className="border-red-400/35 bg-red-500/10">
                <CardContent className="pt-5">
                  <p className="font-semibold">Nao consegui montar a previa de finalizacao.</p>
                  <p className="mt-1 text-sm text-muted-foreground">O diagnostico principal continua disponivel para investigar manualmente.</p>
                </CardContent>
              </Card>
            ) : preview.data ? (
              <PreviewCard preview={preview.data} />
            ) : null}

            {dossier.isError ? (
              <Card className="border-red-400/35 bg-red-500/10">
                <CardContent className="pt-5">
                  <p className="font-semibold">Nao consegui gerar o dossie Staff.</p>
                </CardContent>
              </Card>
            ) : dossier.data ? (
              <DossierCard dossier={dossier.data} />
            ) : null}

            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle>Timeline operacional</CardTitle>
                  {timeline.isFetching ? <Badge tone="blue">Atualizando</Badge> : null}
                </div>
              </CardHeader>
              <CardContent>
                {timeline.isError ? (
                  <p className="text-sm text-muted-foreground">Nao consegui carregar a timeline deste leilao.</p>
                ) : timeline.isLoading ? (
                  <p className="text-sm text-muted-foreground">Montando timeline do leilao...</p>
                ) : (
                  <TimelineCard events={timeline.data ?? []} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Problemas encontrados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {diagnostics.data.issues.length ? (
                  diagnostics.data.issues.map((issue, index) => (
                    <div key={`${issue.title}-${index}`} className="rounded-lg border border-white/10 bg-background/45 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-primary" />
                        <p className="font-semibold">{issue.title}</p>
                        <Badge tone={issueTone(issue.severity)}>{issue.severity}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{issue.description}</p>
                      {issue.metadata ? <div className="mt-3"><JsonPreview value={issue.metadata} /></div> : null}
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                    Nenhum problema obvio encontrado para este estado.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bids e locks</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr className="border-b border-white/10">
                      <th className="py-2 pr-3">#</th>
                      <th className="py-2 pr-3">Player</th>
                      <th className="py-2 pr-3">Layer</th>
                      <th className="py-2 pr-3">Presenca</th>
                      <th className="py-2 pr-3">Bid</th>
                      <th className="py-2 pr-3">Valido</th>
                      <th className="py-2 pr-3">Lock ativo</th>
                      <th className="py-2 pr-3">Criado</th>
                      <th className="py-2 pr-3">ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diagnostics.data.bids.map((bid, index) => (
                      <tr key={bid.id} className="border-b border-white/5">
                        <td className="py-3 pr-3 font-semibold">{index + 1}</td>
                        <td className="py-3 pr-3">
                          <Link className="text-primary hover:underline" href={`/dashboard/staff/item-audit?playerId=${bid.playerId}`}>
                            {bid.nickname}
                          </Link>
                        </td>
                        <td className="py-3 pr-3">{bid.dimensionalLayer}</td>
                        <td className="py-3 pr-3">{bid.attendancePercentage.toFixed(2)}%</td>
                        <td className="py-3 pr-3">{bid.bidAmount}</td>
                        <td className="py-3 pr-3"><Badge tone={bid.isValid ? 'green' : 'red'}>{bid.isValid ? 'sim' : 'nao'}</Badge></td>
                        <td className="py-3 pr-3">
                          <Badge tone={bid.hasActiveLock ? 'green' : 'red'}>
                            {bid.hasActiveLock ? `${bid.activeLockAmount ?? 0} DKP` : 'sem lock'}
                          </Badge>
                        </td>
                        <td className="py-3 pr-3">{formatDate(bid.createdAt)}</td>
                        <td className="py-3 pr-3 font-mono text-xs text-muted-foreground">{shortId(bid.id)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Locks</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {diagnostics.data.locks.map((lock) => (
                    <div key={lock.id} className="rounded-lg border border-white/10 bg-background/45 p-3 text-sm">
                      <div className="flex flex-wrap justify-between gap-2">
                        <p className="font-semibold">{lock.nickname} - {lock.amount} DKP</p>
                        <Badge tone={lock.released ? 'muted' : 'green'}>{lock.released ? 'liberado' : 'ativo'}</Badge>
                      </div>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">{lock.id} - {formatDate(lock.createdAt)}</p>
                    </div>
                  ))}
                  {!diagnostics.data.locks.length ? <p className="text-sm text-muted-foreground">Sem locks registrados.</p> : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Cancelamentos</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {diagnostics.data.cancellationRequests.map((request) => (
                    <div key={request.id} className="rounded-lg border border-white/10 bg-background/45 p-3 text-sm">
                      <div className="flex flex-wrap justify-between gap-2">
                        <p className="font-semibold">{request.playerName}</p>
                        <Badge tone={request.status === 'APPROVED' ? 'green' : request.status === 'REJECTED' ? 'red' : 'gold'}>
                          {request.status}
                        </Badge>
                      </div>
                      <p className="mt-2 text-muted-foreground">{request.reason}</p>
                      {request.reviewNote ? <p className="mt-2 text-muted-foreground">Review: {request.reviewNote}</p> : null}
                      <p className="mt-1 font-mono text-xs text-muted-foreground">{request.id} - {formatDate(request.createdAt)}</p>
                    </div>
                  ))}
                  {!diagnostics.data.cancellationRequests.length ? <p className="text-sm text-muted-foreground">Sem pedidos de cancelamento.</p> : null}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Votos de review</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {diagnostics.data.reviewVotes.map((vote) => (
                    <div key={vote.id} className="rounded-lg border border-white/10 bg-background/45 p-3 text-sm">
                      <div className="flex flex-wrap justify-between gap-2">
                        <p className="font-semibold">{vote.voterName}</p>
                        <Badge tone={vote.action === 'APPROVE' ? 'green' : 'red'}>{vote.action}</Badge>
                      </div>
                      <p className="mt-1 text-muted-foreground">Player alvo: {vote.playerId ?? '-'}</p>
                      {vote.reason ? <p className="mt-1 text-muted-foreground">{vote.reason}</p> : null}
                    </div>
                  ))}
                  {!diagnostics.data.reviewVotes.length ? <p className="text-sm text-muted-foreground">Sem votos de review.</p> : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Votos de invalidacao de bid</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {diagnostics.data.bidInvalidationVotes.map((vote) => (
                    <div key={vote.id} className="rounded-lg border border-white/10 bg-background/45 p-3 text-sm">
                      <div className="flex flex-wrap justify-between gap-2">
                        <p className="font-semibold">{vote.voterName}</p>
                        <p className="font-mono text-xs text-muted-foreground">{shortId(vote.bidId)}</p>
                      </div>
                      <p className="mt-1 text-muted-foreground">{vote.reason}</p>
                    </div>
                  ))}
                  {!diagnostics.data.bidInvalidationVotes.length ? <p className="text-sm text-muted-foreground">Sem votos de invalidacao.</p> : null}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle>Audit logs relacionados</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {diagnostics.data.auditLogs.map((log) => (
                  <div key={log.id} className="rounded-lg border border-white/10 bg-background/45 p-3 text-sm">
                    <div className="flex flex-wrap justify-between gap-2">
                      <p className="font-semibold">{log.action}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</p>
                    </div>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {log.targetType} / {log.targetId} {log.actorName ? `- ${log.actorName}` : ''}
                    </p>
                    <div className="mt-2">
                      <JsonPreview value={log.metadata ?? null} />
                    </div>
                  </div>
                ))}
                {!diagnostics.data.auditLogs.length ? <p className="text-sm text-muted-foreground">Sem logs relacionados encontrados.</p> : null}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </AuthGuard>
  );
}
