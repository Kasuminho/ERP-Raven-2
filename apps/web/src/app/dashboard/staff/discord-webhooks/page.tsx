'use client';

import { RefreshCw, Send, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { notifyToast } from '@/components/ui/toaster';
import { useDiscordWebhookQueue, useRetryDiscordWebhookDelivery } from '@/hooks/use-staff-operations-api';
import type { DiscordWebhookDeliveryItem, DiscordWebhookDeliveryStatus } from '@/types/api';

const statusTone: Record<DiscordWebhookDeliveryStatus, 'blue' | 'green' | 'gold' | 'red' | 'muted'> = {
  PENDING: 'blue',
  SENDING: 'blue',
  SENT: 'green',
  FAILED: 'red',
  RETRYING: 'gold',
};

const statusLabel: Record<DiscordWebhookDeliveryStatus, string> = {
  PENDING: 'Na fila',
  SENDING: 'Enviando',
  SENT: 'Enviado',
  FAILED: 'Falhou',
  RETRYING: 'Retentando',
};

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : '-';
}

function DeliveryRow({ delivery, onRetry, retrying }: { delivery: DiscordWebhookDeliveryItem; onRetry: (id: string) => void; retrying: boolean }) {
  const canRetry = delivery.status === 'FAILED' && delivery.retryable;

  return (
    <div className="grid gap-3 rounded-md border bg-background/35 p-4 lg:grid-cols-[1.1fr_1fr_0.8fr_auto]">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={statusTone[delivery.status]}>{statusLabel[delivery.status]}</Badge>
          <Badge tone="blue">{delivery.channelLabel}</Badge>
        </div>
        <p className="truncate font-semibold">{delivery.action ?? delivery.webhookKey}</p>
        <p className="text-xs text-muted-foreground">Alvo: {delivery.targetId ?? 'sem alvo'} | Tentativas: {delivery.attempts}/{delivery.maxAttempts}</p>
      </div>

      <div className="min-w-0 space-y-2">
        <p className="line-clamp-2 text-sm">{delivery.payloadSummary}</p>
        {delivery.lastError ? <p className="line-clamp-2 text-xs text-red-300">{delivery.lastError}</p> : null}
      </div>

      <div className="space-y-1 text-xs text-muted-foreground">
        <p>Fila: {formatDate(delivery.queuedAt)}</p>
        <p>Envio: {formatDate(delivery.sentAt ?? delivery.failedAt ?? delivery.startedAt)}</p>
        {delivery.retriedAt ? <p>Retry: {formatDate(delivery.retriedAt)}</p> : null}
      </div>

      <div className="flex flex-col items-start gap-2 lg:items-end">
        <Button type="button" variant="secondary" className="h-9 px-3" disabled={!canRetry || retrying} onClick={() => onRetry(delivery.id)}>
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
        <details className="w-full lg:w-56">
          <summary className="cursor-pointer text-xs text-primary">payload seguro</summary>
          <pre className="mt-2 max-h-52 overflow-auto rounded border bg-black/25 p-2 text-[11px] text-muted-foreground">
            {JSON.stringify(delivery.payloadPreview, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}

export default function StaffDiscordWebhooksPage() {
  const queue = useDiscordWebhookQueue(75);
  const retry = useRetryDiscordWebhookDelivery(75);
  const counts = queue.data?.counts;

  async function handleRetry(id: string) {
    try {
      await retry.mutateAsync(id);
      notifyToast({ title: 'Webhook reenviado', description: 'Retry executado pela fila segura.', tone: 'success' });
    } catch {
      notifyToast({ title: 'Retry falhou', description: 'A fila recusou ou o Discord devolveu erro.', tone: 'error' });
    }
  }

  const countRows: Array<[string, number, DiscordWebhookDeliveryStatus]> = [
    ['Falhas', counts?.FAILED ?? 0, 'FAILED'],
    ['Retentando', counts?.RETRYING ?? 0, 'RETRYING'],
    ['Enviando', counts?.SENDING ?? 0, 'SENDING'],
    ['Na fila', counts?.PENDING ?? 0, 'PENDING'],
    ['Enviados', counts?.SENT ?? 0, 'SENT'],
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">Discord</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">Fila de webhooks</h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {countRows.map(([label, value, status]) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs uppercase text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-semibold">{value}</p>
              </div>
              <Badge tone={statusTone[status]}>{statusLabel[status]}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-background/35 p-3 text-sm text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <span>Payload sanitizado. URL real de webhook nao entra nesta tela.</span>
        <Send className="ml-auto h-4 w-4 text-primary" />
        <span>Atualizado em {formatDate(queue.data?.generatedAt)}</span>
      </div>

      <div className="space-y-3">
        {(queue.data?.deliveries ?? []).map((delivery) => (
          <DeliveryRow key={delivery.id} delivery={delivery} onRetry={(id) => void handleRetry(id)} retrying={retry.isPending} />
        ))}
        {queue.isLoading ? <p className="rounded-md border bg-background/35 p-4 text-sm text-muted-foreground">Carregando fila...</p> : null}
        {!queue.isLoading && (queue.data?.deliveries ?? []).length === 0 ? (
          <p className="rounded-md border bg-background/35 p-4 text-sm text-muted-foreground">Nenhum envio registrado ainda.</p>
        ) : null}
      </div>
    </div>
  );
}
