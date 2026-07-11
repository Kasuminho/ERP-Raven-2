'use client';

import { BarChart3, ClipboardList, Coins, Lock, Swords, TrendingDown, TrendingUp, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { notifyToast } from '@/components/ui/toaster';
import { useDkpEconomy, useDkpPolicySimulations, usePreviewDkpBidPolicySimulation, usePreviewDkpDecaySimulation, usePromoteDkpPolicySimulation, useSaveDkpBidPolicySimulation, useSaveDkpDecaySimulation } from '@/hooks/use-dkp-api';

const itemTiers = ['T2', 'T3', 'T4', 'LEGENDARY'] as const;
const itemTypes = ['WEAPON', 'ARMOR', 'ACCESSORY', 'CELESTIAL_STONE'] as const;
const auctionModes = ['STANDARD', 'ALL_IN', 'STAFF_REVIEW'] as const;

function number(value?: number) {
  return new Intl.NumberFormat('pt-BR').format(value ?? 0);
}

function percent(value?: number) {
  return `${number(value)}%`;
}

function MetricCard({ title, value, icon: Icon, tone }: { title: string; value: string; icon: typeof Coins; tone?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <Icon className={`h-6 w-6 ${tone ?? 'text-primary'}`} />
      </CardContent>
    </Card>
  );
}

function signalTone(severity: 'info' | 'warning' | 'danger') {
  if (severity === 'danger') return 'red';
  if (severity === 'warning') return 'gold';
  return 'blue';
}

export default function StaffEconomyPage() {
  const economy = useDkpEconomy();
  const simulations = useDkpPolicySimulations();
  const previewDecay = usePreviewDkpDecaySimulation();
  const saveDecay = useSaveDkpDecaySimulation();
  const previewBidPolicy = usePreviewDkpBidPolicySimulation();
  const saveBidPolicy = useSaveDkpBidPolicySimulation();
  const promotePolicy = usePromoteDkpPolicySimulation();
  const data = economy.data;
  const [decayForm, setDecayForm] = useState({ name: '', percent: 10, minimumDkp: 0 });
  const [promotionReason, setPromotionReason] = useState('');
  const [bidPolicyForm, setBidPolicyForm] = useState({
    name: '',
    minimumCost: 10,
    winTaxPercent: 0,
    tierCaps: { T2: 0, T3: 0, T4: 0, LEGENDARY: 0 },
    itemTypeCaps: { WEAPON: 0, ARMOR: 0, ACCESSORY: 0, CELESTIAL_STONE: 0 },
    layerCaps: { '1': 0, '2': 0, '3': 0, '4': 0 },
    fixedCostByTier: { T2: 0, T3: 0, T4: 0, LEGENDARY: 0 },
    modeMultiplierPercent: { STANDARD: 100, ALL_IN: 100, STAFF_REVIEW: 100 },
  });
  const maxBucketPlayers = Math.max(...(data?.distribution ?? []).map((row) => row.players), 1);
  const decay = previewDecay.data ?? saveDecay.data;
  const bidPolicy = previewBidPolicy.data ?? saveBidPolicy.data;

  async function copyMarkdown() {
    if (!data?.markdown || typeof navigator === 'undefined') return;
    try {
      await navigator.clipboard.writeText(data.markdown);
      notifyToast({ title: 'Snapshot economico copiado.', tone: 'success' });
    } catch {
      notifyToast({ title: 'Nao consegui copiar.', description: 'O navegador bloqueou o clipboard.', tone: 'error' });
    }
  }

  async function copyDecayMarkdown() {
    if (!decay?.markdown || typeof navigator === 'undefined') return;
    try {
      await navigator.clipboard.writeText(decay.markdown);
      notifyToast({ title: 'Simulacao copiada.', tone: 'success' });
    } catch {
      notifyToast({ title: 'Nao consegui copiar.', description: 'O navegador bloqueou o clipboard.', tone: 'error' });
    }
  }

  async function copyBidPolicyMarkdown() {
    if (!bidPolicy?.markdown || typeof navigator === 'undefined') return;
    try {
      await navigator.clipboard.writeText(bidPolicy.markdown);
      notifyToast({ title: 'Simulacao de bids copiada.', tone: 'success' });
    } catch {
      notifyToast({ title: 'Nao consegui copiar.', description: 'O navegador bloqueou o clipboard.', tone: 'error' });
    }
  }

  function bidPolicyPayload() {
    return {
      minimumCost: bidPolicyForm.minimumCost,
      winTaxPercent: bidPolicyForm.winTaxPercent,
      tierCaps: bidPolicyForm.tierCaps,
      itemTypeCaps: bidPolicyForm.itemTypeCaps,
      layerCaps: bidPolicyForm.layerCaps,
      fixedCostByTier: bidPolicyForm.fixedCostByTier,
      modeMultiplierPercent: bidPolicyForm.modeMultiplierPercent,
    };
  }

  function runPreview() {
    previewDecay.mutate({
      percent: decayForm.percent,
      minimumDkp: decayForm.minimumDkp,
    });
  }

  function saveDraft() {
    saveDecay.mutate(
      {
        name: decayForm.name || `Decay ${decayForm.percent}%`,
        percent: decayForm.percent,
        minimumDkp: decayForm.minimumDkp,
      },
      {
        onSuccess: () => notifyToast({ title: 'Cenario salvo como rascunho.', tone: 'success' }),
      },
    );
  }

  function runBidPolicyPreview() {
    previewBidPolicy.mutate(bidPolicyPayload());
  }

  function saveBidPolicyDraft() {
    saveBidPolicy.mutate(
      {
        name: bidPolicyForm.name || 'Politica de bid simulada',
        ...bidPolicyPayload(),
      },
      {
        onSuccess: () => notifyToast({ title: 'Politica salva como rascunho.', tone: 'success' }),
      },
    );
  }

  function promoteDraft(simulationId: string) {
    promotePolicy.mutate(
      {
        simulationId,
        reason: promotionReason,
      },
      {
        onSuccess: () => {
          setPromotionReason('');
          notifyToast({ title: 'Politica promovida para regra operacional.', tone: 'success' });
        },
        onError: () => notifyToast({ title: 'Nao foi possivel promover.', description: 'Confira se o motivo tem pelo menos 8 caracteres e se o rascunho ainda esta em DRAFT.', tone: 'error' }),
      },
    );
  }

  function updateBidMap<T extends 'tierCaps' | 'itemTypeCaps' | 'layerCaps' | 'fixedCostByTier' | 'modeMultiplierPercent'>(map: T, key: string, value: number) {
    setBidPolicyForm((current) => ({
      ...current,
      [map]: {
        ...current[map],
        [key]: value,
      },
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm uppercase text-primary">Guild Treasury</p>
          <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">Economia DKP</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Snapshot Staff-only da moeda da guild: distribuicao, concentracao, locks, atividade e sinais de risco antes de mexer em regra.
          </p>
        </div>
        <Button type="button" variant="secondary" disabled={!data?.markdown} onClick={copyMarkdown}>
          <ClipboardList className="h-4 w-4" /> Copiar snapshot
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Players ativos" value={number(data?.activePlayers)} icon={UsersRound} />
        <MetricCard title="Ativos 30d" value={number(data?.recentActivePlayers)} icon={UsersRound} tone="text-emerald-200" />
        <MetricCard title="DKP liquido" value={number(data?.netDkp)} icon={Coins} />
        <MetricCard title="DKP travado" value={number(data?.totalLockedDkp)} icon={Lock} tone="text-cyan-200" />
        <MetricCard title="Media DKP" value={number(data?.averageDkp)} icon={BarChart3} />
        <MetricCard title="Mediana DKP" value={number(data?.medianDkp)} icon={BarChart3} tone="text-emerald-200" />
        <MetricCard title="Top 10 concentram" value={percent(data?.top10DkpSharePercent)} icon={TrendingUp} tone="text-yellow-200" />
        <MetricCard title="Gasto em leiloes" value={number(data?.auctionSpentDkp)} icon={TrendingDown} tone="text-red-200" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Distribuicao de saldos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.distribution ?? []).map((row) => (
              <div key={row.bucket} className="grid gap-2 text-sm sm:grid-cols-[90px_1fr_90px] sm:items-center">
                <p className="font-semibold">{row.bucket}</p>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, Math.round((row.players / maxBucketPlayers) * 100))}%` }} />
                </div>
                <p className="text-right text-muted-foreground">{row.players} players</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sinais economicos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.signals ?? []).map((signal) => (
              <div key={signal.key} className="rounded-md border bg-background/35 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={signalTone(signal.severity)}>{signal.severity}</Badge>
                  <p className="font-semibold">{signal.label}</p>
                </div>
                <p className="mt-1 text-muted-foreground">{signal.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Simulador de decay</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_140px_160px_auto_auto] md:items-end">
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">Nome do rascunho</label>
              <Input value={decayForm.name} placeholder="Decay mensal conservador" onChange={(event) => setDecayForm((current) => ({ ...current, name: event.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">Percentual</label>
              <Input type="number" min={1} max={100} value={decayForm.percent} onChange={(event) => setDecayForm((current) => ({ ...current, percent: Number(event.target.value) }))} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">Piso protegido</label>
              <Input type="number" min={0} value={decayForm.minimumDkp} onChange={(event) => setDecayForm((current) => ({ ...current, minimumDkp: Number(event.target.value) }))} />
            </div>
            <Button type="button" variant="secondary" disabled={previewDecay.isPending} onClick={runPreview}>Simular</Button>
            <Button type="button" disabled={saveDecay.isPending} onClick={saveDraft}>Salvar</Button>
          </div>

          {decay && (
            <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-md border p-3"><p className="text-muted-foreground">Afetados</p><p className="text-xl font-bold">{decay.totals.affectedPlayers}/{decay.totals.players}</p></div>
                <div className="rounded-md border p-3"><p className="text-muted-foreground">DKP removido</p><p className="text-xl font-bold">{number(decay.totals.totalReduced)}</p></div>
                <div className="rounded-md border p-3"><p className="text-muted-foreground">Antes</p><p className="text-xl font-bold">{number(decay.totals.totalBefore)}</p></div>
                <div className="rounded-md border p-3"><p className="text-muted-foreground">Depois</p><p className="text-xl font-bold">{number(decay.totals.totalAfter)}</p></div>
                <Button className="sm:col-span-2" type="button" variant="secondary" onClick={copyDecayMarkdown}>
                  <ClipboardList className="h-4 w-4" /> Copiar dossie
                </Button>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold">Mais impactados</p>
                {decay.topImpacted.slice(0, 8).map((row) => (
                  <div key={row.playerId} className="flex items-center justify-between rounded-md border bg-background/35 p-3 text-sm">
                    <span>{row.nickname}</span>
                    <strong>-{number(row.reduced)} DKP ({number(row.before)} para {number(row.after)})</strong>
                  </div>
                ))}
                {decay.topImpacted.length === 0 && <p className="text-sm text-muted-foreground">Nenhum player seria impactado com essa regra.</p>}
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <p className="mb-2 text-sm font-semibold">Rascunhos recentes</p>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {(simulations.data ?? []).slice(0, 6).map((simulation) => (
                <div key={simulation.id} className="rounded-md border bg-background/35 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{simulation.name}</p>
                    <div className="flex items-center gap-2">
                      <Badge tone={simulation.type === 'BID_POLICY' ? 'gold' : 'blue'}>{simulation.type}</Badge>
                      <Badge tone={simulation.status === 'PROMOTED' ? 'green' : 'blue'}>{simulation.status}</Badge>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(simulation.createdAt).toLocaleString()}</p>
                  {simulation.promotedAt ? <p className="mt-1 text-xs text-emerald-200">Promovida em {new Date(simulation.promotedAt).toLocaleString()}</p> : null}
                  {simulation.type === 'BID_POLICY' && simulation.status === 'DRAFT' ? (
                    <div className="mt-3 space-y-2">
                      <Input value={promotionReason} placeholder="Motivo da promocao Staff" onChange={(event) => setPromotionReason(event.target.value)} />
                      <Button type="button" disabled={promotePolicy.isPending || promotionReason.trim().length < 8} onClick={() => promoteDraft(simulation.id)}>
                        Promover politica
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
              {!simulations.isLoading && (simulations.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nenhum cenario salvo ainda.</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Simulador de politica de bids</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-[1fr_140px_140px_auto_auto] md:items-end">
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">Nome do rascunho</label>
              <Input value={bidPolicyForm.name} placeholder="Cap T4 pos-war" onChange={(event) => setBidPolicyForm((current) => ({ ...current, name: event.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">Custo minimo</label>
              <Input type="number" min={0} value={bidPolicyForm.minimumCost} onChange={(event) => setBidPolicyForm((current) => ({ ...current, minimumCost: Number(event.target.value) }))} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">Taxa vencedor %</label>
              <Input type="number" min={0} max={100} value={bidPolicyForm.winTaxPercent} onChange={(event) => setBidPolicyForm((current) => ({ ...current, winTaxPercent: Number(event.target.value) }))} />
            </div>
            <Button type="button" variant="secondary" disabled={previewBidPolicy.isPending} onClick={runBidPolicyPreview}>Simular</Button>
            <Button type="button" disabled={saveBidPolicy.isPending} onClick={saveBidPolicyDraft}>Salvar</Button>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="space-y-3">
              <p className="text-sm font-semibold">Tetos por tier e tipo</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {itemTiers.map((tier) => (
                  <label key={tier} className="text-xs font-semibold uppercase text-muted-foreground">
                    Cap {tier}
                    <Input className="mt-1" type="number" min={0} value={bidPolicyForm.tierCaps[tier]} onChange={(event) => updateBidMap('tierCaps', tier, Number(event.target.value))} />
                  </label>
                ))}
                {itemTypes.map((type) => (
                  <label key={type} className="text-xs font-semibold uppercase text-muted-foreground">
                    Cap {type}
                    <Input className="mt-1" type="number" min={0} value={bidPolicyForm.itemTypeCaps[type]} onChange={(event) => updateBidMap('itemTypeCaps', type, Number(event.target.value))} />
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold">Camada, custo fixo e modo</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {Object.keys(bidPolicyForm.layerCaps).map((layer) => (
                  <label key={layer} className="text-xs font-semibold uppercase text-muted-foreground">
                    Cap layer {layer}
                    <Input className="mt-1" type="number" min={0} value={bidPolicyForm.layerCaps[layer as keyof typeof bidPolicyForm.layerCaps]} onChange={(event) => updateBidMap('layerCaps', layer, Number(event.target.value))} />
                  </label>
                ))}
                {itemTiers.map((tier) => (
                  <label key={`fixed-${tier}`} className="text-xs font-semibold uppercase text-muted-foreground">
                    Fixo {tier}
                    <Input className="mt-1" type="number" min={0} value={bidPolicyForm.fixedCostByTier[tier]} onChange={(event) => updateBidMap('fixedCostByTier', tier, Number(event.target.value))} />
                  </label>
                ))}
                {auctionModes.map((mode) => (
                  <label key={mode} className="text-xs font-semibold uppercase text-muted-foreground">
                    {mode} %
                    <Input className="mt-1" type="number" min={0} value={bidPolicyForm.modeMultiplierPercent[mode]} onChange={(event) => updateBidMap('modeMultiplierPercent', mode, Number(event.target.value))} />
                  </label>
                ))}
              </div>
            </div>
          </div>

          {bidPolicy && (
            <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-md border p-3"><p className="text-muted-foreground">Leiloes</p><p className="text-xl font-bold">{bidPolicy.totals.auctionsAnalyzed}</p></div>
                <div className="rounded-md border p-3"><p className="text-muted-foreground">Mudariam</p><p className="text-xl font-bold">{bidPolicy.totals.changedAuctions}</p></div>
                <div className="rounded-md border p-3"><p className="text-muted-foreground">Atual</p><p className="text-xl font-bold">{number(bidPolicy.totals.currentSpent)}</p></div>
                <div className="rounded-md border p-3"><p className="text-muted-foreground">Proposto</p><p className="text-xl font-bold">{number(bidPolicy.totals.proposedSpent)}</p></div>
                <div className="rounded-md border p-3"><p className="text-muted-foreground">Delta</p><p className={`text-xl font-bold ${bidPolicy.totals.delta >= 0 ? 'text-emerald-200' : 'text-red-200'}`}>{bidPolicy.totals.delta >= 0 ? '+' : ''}{number(bidPolicy.totals.delta)}</p></div>
                <Button className="sm:col-span-2" type="button" variant="secondary" onClick={copyBidPolicyMarkdown}>
                  <ClipboardList className="h-4 w-4" /> Copiar dossie
                </Button>
              </div>
              <div className="space-y-3">
                <div className="grid gap-2 md:grid-cols-2">
                  {bidPolicy.risks.map((risk) => (
                    <div key={risk.key} className="rounded-md border bg-background/35 p-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge tone={signalTone(risk.severity)}>{risk.severity}</Badge>
                        <strong>{risk.label}</strong>
                      </div>
                      <p className="mt-1 text-muted-foreground">{risk.detail}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Maiores impactos historicos</p>
                  {bidPolicy.rows.slice(0, 8).map((row) => (
                    <div key={row.auctionId} className="flex items-center justify-between gap-3 rounded-md border bg-background/35 p-3 text-sm">
                      <span><Swords className="mr-1 inline h-4 w-4 text-primary" />{row.itemName} · {row.winnerNickname}</span>
                      <strong>{number(row.currentCost)} para {number(row.proposedCost)} ({row.delta >= 0 ? '+' : ''}{number(row.delta)})</strong>
                    </div>
                  ))}
                  {bidPolicy.rows.length === 0 && <p className="text-sm text-muted-foreground">Nenhum leilao finalizado com transacao de vencedor foi encontrado.</p>}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Maiores saldos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.topBalances ?? []).map((row, index) => (
              <div key={row.playerId} className="flex items-center justify-between rounded-md border bg-background/35 p-3 text-sm">
                <span><Badge tone="gold">#{index + 1}</Badge> {row.nickname}</span>
                <strong>{number(row.total)} DKP</strong>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quem mais ganhou DKP</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.topEarners ?? []).map((row, index) => (
              <div key={row.playerId} className="flex items-center justify-between rounded-md border bg-background/35 p-3 text-sm">
                <span><Badge tone="green">#{index + 1}</Badge> {row.nickname}</span>
                <strong>+{number(row.amount)}</strong>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Saldo alto sem atividade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.inactiveHighDkpPlayers ?? []).map((row) => (
              <div key={row.playerId} className="rounded-md border bg-background/35 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{row.nickname}</span>
                  <strong>{number(row.total)} DKP</strong>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Ultima atividade: {row.lastActivityAt ? new Date(row.lastActivityAt).toLocaleDateString() : 'desconhecida'}</p>
              </div>
            ))}
            {!economy.isLoading && (data?.inactiveHighDkpPlayers ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nenhum acumulador inativo detectado.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
