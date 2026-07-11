'use client';

import Link from 'next/link';
import { Clipboard, FileText } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { notifyToast } from '@/components/ui/toaster';
import { useContextualEligibility, useUniversalDossier } from '@/hooks/use-staff-operations-api';
import type { ContextualEligibilityDecision, ContextualEligibilityType, UniversalDossierType } from '@/types/api';

const dossierTypes: Array<{ value: UniversalDossierType; label: string }> = [
  { value: 'player', label: 'Player' },
  { value: 'auction', label: 'Leilao' },
  { value: 'request', label: 'Request' },
  { value: 'interest', label: 'Interesse' },
  { value: 'drop', label: 'Drop' },
  { value: 'event', label: 'Evento' },
];

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function riskTone(severity: 'info' | 'warning' | 'danger') {
  if (severity === 'danger') return 'red';
  if (severity === 'warning') return 'gold';
  return 'blue';
}

function decisionTone(decision: ContextualEligibilityDecision) {
  if (decision === 'blocked') return 'red';
  if (decision === 'review') return 'gold';
  return 'green';
}

export default function StaffDossierPage() {
  const [type, setType] = useState<UniversalDossierType>('player');
  const [id, setId] = useState('');
  const [eligibilityType, setEligibilityType] = useState<ContextualEligibilityType>('auction');
  const [contextId, setContextId] = useState('');
  const [role, setRole] = useState('');
  const dossier = useUniversalDossier(type, id.trim());
  const contextualEligibility = useContextualEligibility(type === 'player' ? id.trim() : '', {
    type: eligibilityType,
    contextId: contextId.trim(),
    role: role.trim(),
  });

  async function copyMarkdown() {
    if (!dossier.data) return;

    try {
      await navigator.clipboard.writeText(dossier.data.markdown);
      notifyToast({ title: 'Dossie copiado', description: 'Markdown Staff pronto para colar.', tone: 'success' });
    } catch {
      notifyToast({ title: 'Nao consegui copiar', description: 'O navegador bloqueou o clipboard desta vez.', tone: 'error' });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">Auditoria</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">Dossie universal</h1>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-[220px_1fr_auto]">
          <label className="space-y-1 text-sm">
            <span className="text-xs uppercase text-muted-foreground">Tipo</span>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as UniversalDossierType)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              {dossierTypes.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs uppercase text-muted-foreground">ID</span>
            <input
              value={id}
              onChange={(event) => setId(event.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              placeholder="UUID da entidade"
            />
          </label>
          <div className="flex items-end">
            <Button type="button" variant="secondary" className="w-full md:w-auto" disabled={!dossier.data} onClick={() => void copyMarkdown()}>
              <Clipboard className="h-4 w-4" />
              Copiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {dossier.isError ? (
        <p className="rounded-md border border-red-400/35 bg-red-500/10 p-4 text-sm text-red-200">Dossie nao encontrado ou acesso recusado.</p>
      ) : null}

      {dossier.data ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {dossier.data.title}
                <Badge tone="blue">{dossier.data.type}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {dossier.data.summary.map((item) => (
                  <div key={`${item.label}-${item.value}`} className="rounded-md border bg-background/35 p-3">
                    <p className="text-xs uppercase text-muted-foreground">{item.label}</p>
                    <p className="mt-1 break-words text-sm font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {dossier.data.internalLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="rounded-md border border-cyan-400/25 bg-secondary/80 px-3 py-2 text-sm font-semibold hover:border-cyan-300/45">
                    {link.label}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {(dossier.data.riskFlags ?? []).length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Risk flags operacionais</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {(dossier.data.riskFlags ?? []).map((flag) => (
                  <div key={flag.key} className="rounded-md border bg-background/35 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={riskTone(flag.severity)}>{flag.severity}</Badge>
                      <p className="font-semibold">{flag.label}</p>
                    </div>
                    <p className="mt-2 text-muted-foreground">{flag.explanation}</p>
                    <Link href={flag.evidenceHref} className="mt-2 inline-flex text-xs font-semibold text-primary hover:underline">
                      Evidencia
                    </Link>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {dossier.data.type === 'player' ? (
            <Card>
              <CardHeader>
                <CardTitle>Elegibilidade contextual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-[180px_1fr_180px]">
                  <label className="space-y-1 text-sm">
                    <span className="text-xs uppercase text-muted-foreground">Contexto</span>
                    <select
                      value={eligibilityType}
                      onChange={(event) => setEligibilityType(event.target.value as ContextualEligibilityType)}
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="auction">Leilao</option>
                      <option value="request">Request</option>
                      <option value="war-room">War Room</option>
                      <option value="recruitment">Recrutamento</option>
                    </select>
                  </label>
                  {eligibilityType === 'recruitment' ? (
                    <label className="space-y-1 text-sm">
                      <span className="text-xs uppercase text-muted-foreground">Papel</span>
                      <input
                        value={role}
                        onChange={(event) => setRole(event.target.value)}
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        placeholder="FRONTLINE, SUPPORT, CALLER..."
                      />
                    </label>
                  ) : (
                    <label className="space-y-1 text-sm">
                      <span className="text-xs uppercase text-muted-foreground">ID do contexto</span>
                      <input
                        value={contextId}
                        onChange={(event) => setContextId(event.target.value)}
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        placeholder="UUID do leilao, request ou operacao"
                      />
                    </label>
                  )}
                  <div className="flex items-end">
                    <Badge tone={contextualEligibility.data ? decisionTone(contextualEligibility.data.decision) : 'muted'}>
                      {contextualEligibility.data?.decision ?? 'aguardando'}
                    </Badge>
                  </div>
                </div>

                {contextualEligibility.isError ? (
                  <p className="rounded-md border border-red-400/35 bg-red-500/10 p-3 text-sm text-red-200">Contexto nao encontrado ou parametro invalido.</p>
                ) : null}

                {contextualEligibility.data ? (
                  <div className="space-y-3">
                    <div className="rounded-md border bg-background/35 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={decisionTone(contextualEligibility.data.decision)}>{contextualEligibility.data.context.type}</Badge>
                        <p className="font-semibold">{contextualEligibility.data.context.label}</p>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{contextualEligibility.data.headline}</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {contextualEligibility.data.reasons.map((reason) => (
                        <div key={reason.key} className="rounded-md border bg-background/35 p-3 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={decisionTone(reason.status)}>{reason.status}</Badge>
                            <p className="font-semibold">{reason.label}</p>
                          </div>
                          <p className="mt-2 text-muted-foreground">{reason.explanation}</p>
                          <p className="mt-2 text-xs text-muted-foreground">{reason.metric ?? '-'} | {reason.rule ?? '-'}</p>
                          {reason.evidenceHref ? (
                            <Link href={reason.evidenceHref} className="mt-2 inline-flex text-xs font-semibold text-primary hover:underline">Evidencia</Link>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {contextualEligibility.data.evidenceLinks.map((link) => (
                        <Link key={link.href} href={link.href} className="rounded-md border border-cyan-400/25 bg-secondary/80 px-3 py-2 text-sm font-semibold hover:border-cyan-300/45">
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Audit logs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dossier.data.auditLogs.map((log) => (
                  <div key={log.id} className="rounded-md border bg-background/35 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="muted">{log.targetType}</Badge>
                      <span className="font-semibold">{log.action}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(log.createdAt)} | {log.actorName ?? 'sistema'} | {log.targetId ?? '-'}</p>
                  </div>
                ))}
                {dossier.data.auditLogs.length === 0 ? <p className="text-sm text-muted-foreground">Sem audit logs recentes relacionados.</p> : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Markdown</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="max-h-[520px] overflow-auto rounded-md border bg-black/25 p-4 text-xs text-muted-foreground">
                  {dossier.data.markdown}
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <p className="rounded-md border bg-background/35 p-4 text-sm text-muted-foreground">Selecione o tipo e cole o ID para gerar o dossie.</p>
      )}
    </div>
  );
}
