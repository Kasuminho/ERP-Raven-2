'use client';

import { useEffect } from 'react';
import { ScrollText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { notifyToast } from '@/components/ui/toaster';
import { useAcknowledgeGuildPolicy, useGuildPolicies, useGuildRules, useMarkGuildPolicyOpened } from '@/hooks/use-staff-operations-api';

export default function RulesPage() {
  const rules = useGuildRules();
  const policies = useGuildPolicies();
  const markOpened = useMarkGuildPolicyOpened();
  const acknowledge = useAcknowledgeGuildPolicy();
  const currentPolicy = policies.data?.current;
  const unopenedPolicyIds = [policies.data?.current, ...(policies.data?.upcoming ?? [])]
    .filter((policy) => policy && !policy.myReceipt?.openedAt)
    .map((policy) => policy!.id)
    .join(',');

  useEffect(() => {
    if (!unopenedPolicyIds) return;
    void Promise.all(unopenedPolicyIds.split(',').map((policyId) => markOpened.mutateAsync(policyId)));
  // The stable id list prevents receipt invalidation from reopening the same policy.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unopenedPolicyIds]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">Fonte da verdade</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">Regras da guild</h1>
        <p className="mt-2 text-sm text-muted-foreground">Resumo das regras operacionais que o sistema usa para DKP, leiloes, interesses, presenca e Daoshi.</p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <CardTitle>Política publicada / Published policy</CardTitle>
            <div className="flex gap-2">{currentPolicy?.isEmergency && <Badge tone="red">EMERGÊNCIA / EMERGENCY</Badge>}{currentPolicy?.version ? <Badge tone="green">v{currentPolicy.version}</Badge> : <Badge tone="gold">SEM VERSÃO / NO VERSION</Badge>}</div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentPolicy ? (
            <>
              <div className="rounded-md border bg-background/35 p-3">
                <p className="text-xs uppercase text-muted-foreground">PT-BR</p>
                <p className="font-semibold">{currentPolicy.titlePt}</p>
                <p className="mt-1 text-sm text-muted-foreground">{currentPolicy.summaryPt}</p>
              </div>
              <div className="rounded-md border bg-background/35 p-3">
                <p className="text-xs uppercase text-muted-foreground">EN</p>
                <p className="font-semibold">{currentPolicy.titleEn}</p>
                <p className="mt-1 text-sm text-muted-foreground">{currentPolicy.summaryEn}</p>
              </div>
              <p className="text-xs text-muted-foreground">Vigente desde / Effective since: {new Date(currentPolicy.effectiveAt).toLocaleString()} · Publicada / Published: {currentPolicy.publishedAt ? new Date(currentPolicy.publishedAt).toLocaleString() : '-'} · Autor / Author: {currentPolicy.publishedBy?.discordNickname || currentPolicy.publishedBy?.discordUsername || '-'}</p>
              {currentPolicy.isEmergency && <div className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm"><strong>Motivo emergencial / Emergency reason:</strong> {currentPolicy.emergencyReason}</div>}
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-md border bg-background/35 p-3 text-sm">
                  <p className="mb-2 text-xs uppercase text-muted-foreground">O que mudou / Changes (PT-BR)</p>
                  <ul className="space-y-1">{currentPolicy.diffPt.map((line) => <li key={line}>• {line}</li>)}</ul>
                </div>
                <div className="rounded-md border bg-background/35 p-3 text-sm">
                  <p className="mb-2 text-xs uppercase text-muted-foreground">What changed / Mudanças (EN)</p>
                  <ul className="space-y-1">{currentPolicy.diffEn.map((line) => <li key={line}>• {line}</li>)}</ul>
                </div>
              </div>
              <details className="rounded-md border bg-background/35 p-3 text-sm">
                <summary className="cursor-pointer font-semibold">Snapshot imutável / Immutable snapshot</summary>
                <div className="mt-3 space-y-2">
                  {currentPolicy.snapshot.rules.map((rule) => (
                    <div key={rule.key} className="rounded border p-2">
                      <p className="font-semibold">{rule.label}</p>
                      <p className="font-mono text-xs text-primary">{rule.key}</p>
                      <pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">{JSON.stringify(rule.value, null, 2)}</pre>
                    </div>
                  ))}
                </div>
              </details>
              <div className="rounded-md border bg-background/35 p-3 text-sm">
                <p>PT-BR: “Li e entendi” registra somente ciência desta versão. Não é concordância jurídica ampla.</p>
                <p>EN: “I read and understood” only records awareness of this version. It is not broad legal consent.</p>
                <Button
                  className="mt-3"
                  disabled={Boolean(currentPolicy.myReceipt?.acknowledgedAt) || acknowledge.isPending}
                  onClick={() => acknowledge.mutate(currentPolicy.id, { onSuccess: () => notifyToast({ title: 'Ciência registrada / Acknowledgement recorded.', tone: 'success' }) })}
                >{currentPolicy.myReceipt?.acknowledgedAt ? 'CIÊNCIA REGISTRADA / ACKNOWLEDGED' : 'Li e entendi / I read and understood'}</Button>
              </div>
            </>
          ) : <p className="text-sm text-muted-foreground">PT-BR: Nenhuma política foi publicada ainda. EN: No policy has been published yet.</p>}
          {(policies.data?.upcoming ?? []).length > 0 && (
            <div className="rounded-md border border-amber-400/30 bg-amber-500/10 p-3 text-sm">
              <p className="font-semibold">Próximas versões / Upcoming versions</p>
              {policies.data?.upcoming.map((policy) => (
                <div key={policy.id} className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded border p-2">
                  <p>{policy.isEmergency ? '🚨 ' : ''}v{policy.version} · {policy.titlePt} / {policy.titleEn} · {new Date(policy.effectiveAt).toLocaleString()}</p>
                  <Button className="h-8 px-3 text-xs" disabled={Boolean(policy.myReceipt?.acknowledgedAt) || acknowledge.isPending} onClick={() => acknowledge.mutate(policy.id)}>
                    {policy.myReceipt?.acknowledgedAt ? 'CIÊNCIA / ACKNOWLEDGED' : 'Li e entendi / I understand'}
                  </Button>
                </div>
              ))}
            </div>
          )}
          {(policies.data?.history ?? []).length > 0 && (
            <details className="rounded-md border bg-background/35 p-3 text-sm">
              <summary className="cursor-pointer font-semibold">Histórico de versões / Version history</summary>
              <div className="mt-3 space-y-3">
                {policies.data?.history.map((policy) => (
                  <details key={policy.id} className="rounded border p-3">
                    <summary className="cursor-pointer">v{policy.version} · {policy.titlePt} / {policy.titleEn} · {new Date(policy.effectiveAt).toLocaleString()}</summary>
                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      <div><p className="font-semibold">PT-BR</p><p className="text-muted-foreground">{policy.summaryPt}</p><ul className="mt-2 space-y-1">{policy.diffPt.map((line) => <li key={line}>• {line}</li>)}</ul></div>
                      <div><p className="font-semibold">EN</p><p className="text-muted-foreground">{policy.summaryEn}</p><ul className="mt-2 space-y-1">{policy.diffEn.map((line) => <li key={line}>• {line}</li>)}</ul></div>
                    </div>
                  </details>
                ))}
              </div>
            </details>
          )}
        </CardContent>
      </Card>
      <div>
        <h2 className="font-[var(--font-cinzel)] text-2xl font-semibold">Comportamento operacional atual / Current operational behavior</h2>
        <p className="mt-1 text-sm text-muted-foreground">PT-BR: estes valores mostram o que o sistema aplica agora. Se diferirem do snapshot acima, a versão publicada continua preservada até a Staff publicar outra. EN: these values show what the system currently enforces. If they differ from the snapshot above, the published version remains preserved until Staff publishes another one.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {(rules.data?.sections ?? []).map((section) => (
          <Card key={section.key}>
            <CardHeader><CardTitle className="flex items-center gap-2"><ScrollText className="h-5 w-5 text-primary" /> {section.title}</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {section.bullets.map((bullet) => <li key={bullet} className="rounded-md border bg-background/35 p-3">{bullet}</li>)}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
