'use client';

import { useMemo, useState } from 'react';
import { FileText, RefreshCw, RotateCcw, Save, Send, SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { notifyToast } from '@/components/ui/toaster';
import { useBusinessRules, useCreateGuildPolicyDraft, useGuildPolicyStaffWorkspace, usePublishGuildPolicyDraft, useRefreshGuildPolicyDraft, useResetBusinessRule, useUpdateBusinessRule } from '@/hooks/use-staff-operations-api';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';
import type { BusinessRule } from '@/types/api';

type Drafts = Record<string, string>;

function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function groupRules(rules: BusinessRule[]): Array<[string, BusinessRule[]]> {
  const groups = rules.reduce<Record<string, BusinessRule[]>>((acc, rule) => {
    acc[rule.category] = [...(acc[rule.category] ?? []), rule];
    return acc;
  }, {});

  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

function attendanceEligibilityDraft(value: string): { bidMinimumPercent: number; participationMinimumPercent: number } {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return {
      bidMinimumPercent: Number(parsed.bidMinimumPercent ?? 65),
      participationMinimumPercent: Number(parsed.participationMinimumPercent ?? 50),
    };
  } catch {
    return { bidMinimumPercent: 65, participationMinimumPercent: 50 };
  }
}

export default function StaffBusinessRulesPage() {
  const locale = useLocaleStore((state) => state.locale);
  const rules = useBusinessRules();
  const updateRule = useUpdateBusinessRule();
  const resetRule = useResetBusinessRule();
  const policyWorkspace = useGuildPolicyStaffWorkspace();
  const createPolicyDraft = useCreateGuildPolicyDraft();
  const refreshPolicyDraft = useRefreshGuildPolicyDraft();
  const publishPolicyDraft = usePublishGuildPolicyDraft();
  const [drafts, setDrafts] = useState<Drafts>({});
  const [policyForm, setPolicyForm] = useState({ titlePt: '', titleEn: '', summaryPt: '', summaryEn: '', effectiveAt: '', isEmergency: false, emergencyReason: '' });
  const [publishingPolicyId, setPublishingPolicyId] = useState<string>();

  const groupedRules = useMemo(() => groupRules(rules.data ?? []), [rules.data]);

  function draftFor(rule: BusinessRule): string {
    return drafts[rule.key] ?? prettyJson(rule.value);
  }

  function updateAttendanceDraft(rule: BusinessRule, key: 'bidMinimumPercent' | 'participationMinimumPercent', rawValue: string) {
    const current = attendanceEligibilityDraft(draftFor(rule));
    const parsed = Number(rawValue);
    const next = {
      ...current,
      [key]: Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : current[key],
    };
    setDrafts((draft) => ({ ...draft, [rule.key]: prettyJson(next) }));
  }

  async function saveRule(rule: BusinessRule) {
    try {
      const parsed = JSON.parse(draftFor(rule));
      await updateRule.mutateAsync({ key: rule.key, value: parsed });
      setDrafts((current) => {
        const next = { ...current };
        delete next[rule.key];
        return next;
      });
      notifyToast({ title: t(locale, 'ruleSaved'), tone: 'success' });
    } catch {
      notifyToast({ title: t(locale, 'invalidJson'), tone: 'error' });
    }
  }

  async function restoreRule(rule: BusinessRule) {
    await resetRule.mutateAsync(rule.key);
    setDrafts((current) => {
      const next = { ...current };
      delete next[rule.key];
      return next;
    });
    notifyToast({ title: t(locale, 'ruleReset'), tone: 'success' });
  }

  const busy = updateRule.isPending || resetRule.isPending;

  return (
    <div className="space-y-6">
      <div className="max-w-4xl space-y-2">
        <p className="text-sm uppercase text-primary">{t(locale, 'governanceDeck')}</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'businessRules')}</h1>
        <p className="text-sm text-muted-foreground">{t(locale, 'businessRulesHelp')}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Política versionada</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">BusinessRule muda a operação; somente publicar um rascunho cria uma referência imutável para players.</p>
            </div>
            <Badge tone={policyWorkspace.data?.current ? 'green' : 'gold'}>{policyWorkspace.data?.current?.version ? `VIGENTE v${policyWorkspace.data.current.version}` : 'SEM VERSÃO VIGENTE'}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {(policyWorkspace.data?.operationalDriftPt ?? []).length > 0 && (
            <div className="rounded-md border border-amber-400/30 bg-amber-500/10 p-3 text-sm">
              <p className="font-semibold">Diferença entre operação atual e política vigente</p>
              <ul className="mt-2 space-y-1">{policyWorkspace.data?.operationalDriftPt.map((line) => <li key={line}>• {line}</li>)}</ul>
            </div>
          )}
          <div className="grid gap-3 lg:grid-cols-2">
            <Input placeholder="Título PT-BR" value={policyForm.titlePt} onChange={(event) => setPolicyForm((current) => ({ ...current, titlePt: event.target.value }))} />
            <Input placeholder="Title EN" value={policyForm.titleEn} onChange={(event) => setPolicyForm((current) => ({ ...current, titleEn: event.target.value }))} />
            <textarea className="min-h-24 rounded-md border bg-background p-3 text-sm" maxLength={1200} placeholder="Resumo PT-BR" value={policyForm.summaryPt} onChange={(event) => setPolicyForm((current) => ({ ...current, summaryPt: event.target.value }))} />
            <textarea className="min-h-24 rounded-md border bg-background p-3 text-sm" maxLength={1200} placeholder="Summary EN" value={policyForm.summaryEn} onChange={(event) => setPolicyForm((current) => ({ ...current, summaryEn: event.target.value }))} />
            <label className="space-y-1 text-xs text-muted-foreground lg:col-span-2">
              <span>Data de vigência</span>
              <Input type="datetime-local" value={policyForm.effectiveAt} onChange={(event) => setPolicyForm((current) => ({ ...current, effectiveAt: event.target.value }))} />
            </label>
            <label className="flex items-center gap-2 text-sm lg:col-span-2">
              <input type="checkbox" checked={policyForm.isEmergency} onChange={(event) => setPolicyForm((current) => ({ ...current, isEmergency: event.target.checked }))} className="h-4 w-4 accent-primary" />
              Mudança emergencial — exige motivo e recebe selo visível
            </label>
            {policyForm.isEmergency && <textarea className="min-h-20 rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm lg:col-span-2" maxLength={500} placeholder="Motivo emergencial obrigatório" value={policyForm.emergencyReason} onChange={(event) => setPolicyForm((current) => ({ ...current, emergencyReason: event.target.value }))} />}
            <Button
              className="lg:col-span-2"
              disabled={createPolicyDraft.isPending || [policyForm.titlePt, policyForm.titleEn, policyForm.summaryPt, policyForm.summaryEn, policyForm.effectiveAt].some((value) => value.trim().length < 3) || (policyForm.isEmergency && policyForm.emergencyReason.trim().length < 5)}
              onClick={() => createPolicyDraft.mutate({ ...policyForm, emergencyReason: policyForm.isEmergency ? policyForm.emergencyReason.trim() : undefined, effectiveAt: new Date(policyForm.effectiveAt).toISOString() }, {
                onSuccess: () => {
                  setPolicyForm({ titlePt: '', titleEn: '', summaryPt: '', summaryEn: '', effectiveAt: '', isEmergency: false, emergencyReason: '' });
                  notifyToast({ title: 'Rascunho criado com snapshot das regras operacionais.', tone: 'success' });
                },
              })}
            ><FileText className="h-4 w-4" /> Criar rascunho</Button>
          </div>
          <div className="space-y-3">
            {(policyWorkspace.data?.drafts ?? []).map((policy) => (
              <div key={policy.id} className="rounded-md border bg-background/35 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{policy.titlePt} / {policy.titleEn}</p>
                    <p className="text-xs text-muted-foreground">Vigência: {new Date(policy.effectiveAt).toLocaleString()} · {policy.snapshot.rules.length} regras no snapshot</p>
                    <p className="mt-2 text-sm">{policy.summaryPt}</p>
                  </div>
                  <div className="flex gap-2">{policy.isEmergency && <Badge tone="red">EMERGÊNCIA</Badge>}<Badge tone="gold">RASCUNHO</Badge></div>
                </div>
                {policy.isEmergency && <p className="mt-2 rounded border border-red-400/30 bg-red-500/10 p-2 text-sm"><strong>Motivo:</strong> {policy.emergencyReason}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="secondary" disabled={refreshPolicyDraft.isPending} onClick={() => refreshPolicyDraft.mutate(policy.id, { onSuccess: () => notifyToast({ title: 'Snapshot atualizado com a operação atual.', tone: 'success' }) })}>
                    <RefreshCw className="h-4 w-4" /> Atualizar snapshot
                  </Button>
                  <Button disabled={publishPolicyDraft.isPending} onClick={() => setPublishingPolicyId(policy.id)}>
                    <Send className="h-4 w-4" /> Publicar versão
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {(policyWorkspace.data?.upcoming ?? []).length > 0 && (
            <div className="rounded-md border border-cyan-400/30 bg-cyan-500/10 p-3 text-sm">
              <p className="font-semibold">Versões publicadas com vigência futura</p>
              <div className="mt-2 space-y-1">{policyWorkspace.data?.upcoming.map((policy) => <p key={policy.id}>v{policy.version} · {policy.titlePt} · entra em vigor {new Date(policy.effectiveAt).toLocaleString()}</p>)}</div>
            </div>
          )}
          {(policyWorkspace.data?.coverage ?? []).length > 0 && (
            <div className="space-y-3 rounded-md border bg-background/35 p-3 text-sm">
              <p className="font-semibold">Cobertura de ciência entre players ativos</p>
              {policyWorkspace.data?.coverage.map((coverage) => (
                <details key={coverage.policyId} className="rounded border p-2">
                  <summary className="cursor-pointer">v{coverage.version} · abriu {coverage.opened}/{coverage.activePlayers} · ciência {coverage.acknowledged}/{coverage.activePlayers}</summary>
                  <div className="mt-2">
                    <p className="text-xs uppercase text-muted-foreground">Ainda não abriram — use somente quando necessário para a operação</p>
                    <p>{coverage.unopened.map((player) => player.nickname).join(', ') || 'Todos os players ativos abriram.'}</p>
                  </div>
                </details>
              ))}
            </div>
          )}
          {(policyWorkspace.data?.history ?? []).length > 0 && (
            <details className="rounded-md border bg-background/35 p-3 text-sm">
              <summary className="cursor-pointer font-semibold">Histórico imutável</summary>
              <div className="mt-3 space-y-2">{policyWorkspace.data?.history.map((policy) => <p key={policy.id}>v{policy.version} · {policy.titlePt} · vigência {new Date(policy.effectiveAt).toLocaleString()}</p>)}</div>
            </details>
          )}
        </CardContent>
      </Card>

      {rules.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      ) : null}

      {!rules.isLoading && groupedRules.length === 0 ? (
        <EmptyState title={t(locale, 'businessRules')}>{t(locale, 'businessRulesEmpty')}</EmptyState>
      ) : null}

      <div className="space-y-6">
        {groupedRules.map(([category, categoryRules]) => (
          <section key={category} className="space-y-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              <h2 className="font-[var(--font-cinzel)] text-xl font-semibold">{category}</h2>
              <Badge tone="muted">{categoryRules.length}</Badge>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {categoryRules.map((rule) => (
                <Card key={rule.key} className="overflow-hidden">
                  <CardHeader className="border-b border-border/70">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle>{rule.label}</CardTitle>
                        <p className="font-mono text-xs text-primary/90">{rule.key}</p>
                      </div>
                      <Badge tone={rule.isActive ? 'green' : 'muted'}>{rule.isActive ? 'ACTIVE' : 'OFF'}</Badge>
                    </div>
                    {rule.description ? <p className="text-sm text-muted-foreground">{rule.description}</p> : null}
                  </CardHeader>
                  <CardContent className="space-y-3 pt-4">
                    {rule.key === 'attendanceEligibilityRules' ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="space-y-1 text-sm font-semibold">
                          <span>Bid minimo (%)</span>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={attendanceEligibilityDraft(draftFor(rule)).bidMinimumPercent}
                            onChange={(event) => updateAttendanceDraft(rule, 'bidMinimumPercent', event.target.value)}
                          />
                        </label>
                        <label className="space-y-1 text-sm font-semibold">
                          <span>Interesse/request minimo (%)</span>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={attendanceEligibilityDraft(draftFor(rule)).participationMinimumPercent}
                            onChange={(event) => updateAttendanceDraft(rule, 'participationMinimumPercent', event.target.value)}
                          />
                        </label>
                      </div>
                    ) : null}
                    <label className="text-sm font-semibold" htmlFor={`rule-${rule.key}`}>
                      {t(locale, 'ruleValueJson')}
                    </label>
                    <textarea
                      id={`rule-${rule.key}`}
                      value={draftFor(rule)}
                      onChange={(event) => setDrafts((current) => ({ ...current, [rule.key]: event.target.value }))}
                      spellCheck={false}
                      className="min-h-72 w-full resize-y rounded-md border border-border bg-background/80 p-3 font-mono text-xs leading-relaxed outline-none ring-primary/35 transition focus:ring-2"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" disabled={busy} onClick={() => saveRule(rule)}>
                        <Save className="h-4 w-4" />
                        {t(locale, 'save')}
                      </Button>
                      <Button type="button" variant="secondary" disabled={busy} onClick={() => restoreRule(rule)}>
                        <RotateCcw className="h-4 w-4" />
                        {t(locale, 'resetDefault')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
      <ConfirmationDialog
        open={Boolean(publishingPolicyId)}
        title="Publicar versão imutável?"
        description="O snapshot, o diff, a autoria e a vigência ficarão preservados. Mudanças futuras exigem outra versão."
        confirmLabel="Publicar versão"
        cancelLabel="Voltar"
        pending={publishPolicyDraft.isPending}
        onClose={() => setPublishingPolicyId(undefined)}
        onConfirm={() => publishingPolicyId && publishPolicyDraft.mutate(publishingPolicyId, {
          onSuccess: () => {
            setPublishingPolicyId(undefined);
            notifyToast({ title: 'Política publicada e versionada.', tone: 'success' });
          },
        })}
      />
    </div>
  );
}
