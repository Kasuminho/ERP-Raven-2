'use client';

import Link from 'next/link';
import { Clipboard, FileText } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { notifyToast } from '@/components/ui/toaster';
import { useUniversalDossier } from '@/hooks/use-staff-operations-api';
import type { UniversalDossierType } from '@/types/api';

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

export default function StaffDossierPage() {
  const [type, setType] = useState<UniversalDossierType>('player');
  const [id, setId] = useState('');
  const dossier = useUniversalDossier(type, id.trim());

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
