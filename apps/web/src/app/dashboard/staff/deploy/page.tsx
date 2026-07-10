'use client';

import Link from 'next/link';
import { Activity, CheckCircle2, ExternalLink, FileText, GitBranch, MessageSquare, RefreshCw, Rocket, ShieldCheck, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDeploymentPanel } from '@/hooks/use-staff-operations-api';
import type { DeploymentPanelSummary, DeploymentProtocolStepStatus } from '@/types/api';

const healthTone: Record<'ok' | 'degraded' | 'down', 'green' | 'gold' | 'red'> = {
  ok: 'green',
  degraded: 'gold',
  down: 'red',
};

const protocolTone: Record<DeploymentProtocolStepStatus, 'green' | 'gold' | 'red' | 'blue'> = {
  done: 'green',
  pending: 'gold',
  blocked: 'red',
  manual: 'blue',
};

const protocolLabel: Record<DeploymentProtocolStepStatus, string> = {
  done: 'OK',
  pending: 'Pendente',
  blocked: 'Bloqueado',
  manual: 'Manual',
};

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '-';
}

function short(value?: string | null) {
  return value ? value.slice(0, 7) : '-';
}

function VersionCards({ data }: { data?: DeploymentPanelSummary }) {
  const matches = data?.expectedVersion.matchesCurrent;

  return (
    <div className="grid gap-3 lg:grid-cols-4">
      <Card>
        <CardContent className="p-4">
          <p className="text-xs uppercase text-muted-foreground">API atual</p>
          <p className="mt-2 break-all text-2xl font-semibold">{data?.currentApiVersion ?? '-'}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-xs uppercase text-muted-foreground">Ultimo push esperado</p>
          <p className="mt-2 text-2xl font-semibold">{short(data?.expectedVersion.shortSha)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{data?.expectedVersion.source ?? '-'}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-xs uppercase text-muted-foreground">Comparacao</p>
          <div className="mt-2 flex items-center gap-2">
            {matches ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : matches === false ? <XCircle className="h-5 w-5 text-red-300" /> : <RefreshCw className="h-5 w-5 text-cyan-300" />}
            <Badge tone={matches ? 'green' : matches === false ? 'red' : 'blue'}>
              {matches ? 'Deploy aplicado' : matches === false ? 'Divergente' : 'Sem comparacao'}
            </Badge>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{data?.expectedVersion.message ?? `Checado em ${formatDate(data?.expectedVersion.checkedAt)}`}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-xs uppercase text-muted-foreground">Actions</p>
          {data?.actionsUrl ? (
            <Link href={data.actionsUrl} target="_blank" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
              Abrir workflow
              <ExternalLink className="h-4 w-4" />
            </Link>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Indisponivel</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function HealthPanels({ data }: { data?: DeploymentPanelSummary }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Health publico
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={healthTone[data?.publicHealth.status ?? 'degraded']}>{data?.publicHealth.status ?? 'carregando'}</Badge>
            <span className="text-sm text-muted-foreground">{data?.publicHealth.latencyMs ?? '-'} ms</span>
          </div>
          <p className="text-sm">Versao publica: <span className="font-semibold">{data?.publicHealth.version ?? '-'}</span></p>
          <p className="text-xs text-muted-foreground">Checado em {formatDate(data?.publicHealth.checkedAt)}</p>
          {data?.publicHealth.message ? <p className="text-sm text-red-300">{data.publicHealth.message}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Health privado
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          {(data?.privateHealth.checks ?? []).map((check) => (
            <div key={check.key} className="rounded-md border bg-background/35 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{check.label}</p>
                <Badge tone={check.ready ? 'green' : 'red'}>{check.ready ? 'OK' : 'Falha'}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{check.detail}</p>
            </div>
          ))}
          {!data ? <p className="text-sm text-muted-foreground">Carregando health privado...</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}

function SmokePanel({ data }: { data?: DeploymentPanelSummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          Smoke publico
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={healthTone[data?.publicSmoke.status ?? 'degraded']}>{data?.publicSmoke.status ?? 'carregando'}</Badge>
          <span className="text-xs text-muted-foreground">Checado em {formatDate(data?.publicSmoke.checkedAt)}</span>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
          {(data?.publicSmoke.checks ?? []).map((check) => (
            <div key={check.path} className="rounded-md border bg-background/35 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold">{check.path}</p>
                <Badge tone={check.ready ? 'green' : 'red'}>{check.statusCode ?? '-'}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{check.latencyMs ?? '-'} ms</p>
              {check.version ? <p className="mt-1 text-xs text-muted-foreground">Versao {check.version}</p> : null}
              {check.message ? <p className="mt-1 line-clamp-2 text-xs text-red-300">{check.message}</p> : null}
            </div>
          ))}
          {!data ? <p className="text-sm text-muted-foreground">Carregando smoke...</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function WebhookQueuePanel({ data }: { data?: DeploymentPanelSummary }) {
  const queue = data?.webhookQueue;
  const active = (queue?.pending ?? 0) + (queue?.sending ?? 0) + (queue?.retrying ?? 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Fila de webhooks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={healthTone[queue?.status ?? 'degraded']}>{queue?.status ?? 'carregando'}</Badge>
          <span className="text-xs text-muted-foreground">Checado em {formatDate(queue?.checkedAt)}</span>
        </div>
        <div className="grid gap-2 md:grid-cols-4">
          <div className="rounded-md border bg-background/35 p-3">
            <p className="text-xs uppercase text-muted-foreground">Ativas</p>
            <p className="mt-1 text-xl font-semibold">{active}</p>
            <p className="text-xs text-muted-foreground">Pend. {queue?.pending ?? 0} / envio {queue?.sending ?? 0} / retry {queue?.retrying ?? 0}</p>
          </div>
          <div className="rounded-md border bg-background/35 p-3">
            <p className="text-xs uppercase text-muted-foreground">Falhas</p>
            <p className="mt-1 text-xl font-semibold">{queue?.failed ?? '-'}</p>
            <p className="text-xs text-muted-foreground">{queue?.latestFailureAction ?? 'Sem falha recente'}</p>
          </div>
          <div className="rounded-md border bg-background/35 p-3">
            <p className="text-xs uppercase text-muted-foreground">Mais antiga</p>
            <p className="mt-1 text-xl font-semibold">{queue?.oldestPendingAgeMinutes != null ? `${queue.oldestPendingAgeMinutes} min` : '-'}</p>
            <p className="text-xs text-muted-foreground">{formatDate(queue?.oldestPendingQueuedAt)}</p>
          </div>
          <div className="rounded-md border bg-background/35 p-3">
            <p className="text-xs uppercase text-muted-foreground">Ultimo retry</p>
            <p className="mt-1 text-sm font-semibold">{formatDate(queue?.latestRetryAt)}</p>
            <p className="text-xs text-muted-foreground">{queue?.latestRetryAction ?? 'Sem retry registrado'}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{queue?.message ?? 'Carregando sinais da fila...'}</p>
      </CardContent>
    </Card>
  );
}

function ChangelogAndProtocol({ data }: { data?: DeploymentPanelSummary }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Ultimo changelog Staff
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-lg font-semibold">{data?.latestStaffChangelog.title ?? '-'}</p>
          <div className="flex flex-wrap gap-2">
            <Badge tone={data?.latestStaffChangelog.source === 'docs' ? 'green' : 'gold'}>{data?.latestStaffChangelog.source ?? '-'}</Badge>
            <Badge tone={data?.latestStaffChangelog.sentReceiptAvailable ? 'green' : 'blue'}>
              {data?.latestStaffChangelog.sentReceiptAvailable ? 'Com recibo' : 'Sem recibo interno'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{data?.latestStaffChangelog.fileName ?? 'Sem arquivo localizado'}</p>
          <p className="text-sm text-muted-foreground">Data inferida: {data?.latestStaffChangelog.inferredDate ?? '-'}</p>
          <p className="text-xs text-muted-foreground">{data?.latestStaffChangelog.note ?? '-'}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Protocolo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(data?.protocol ?? []).map((step) => (
            <div key={step.key} className="flex flex-col gap-2 rounded-md border bg-background/35 p-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="font-semibold">{step.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{step.detail}</p>
              </div>
              <Badge tone={protocolTone[step.status]}>{protocolLabel[step.status]}</Badge>
            </div>
          ))}
          {!data ? <p className="text-sm text-muted-foreground">Carregando protocolo...</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default function StaffDeployPage() {
  const deploy = useDeploymentPanel();
  const data = deploy.data;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">Operar deploy</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">Painel de deploy</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Versao, health, smoke publico e checklist do protocolo em um lugar so.
        </p>
      </div>

      <VersionCards data={data} />
      <HealthPanels data={data} />
      <WebhookQueuePanel data={data} />
      <SmokePanel data={data} />
      <ChangelogAndProtocol data={data} />
    </div>
  );
}
