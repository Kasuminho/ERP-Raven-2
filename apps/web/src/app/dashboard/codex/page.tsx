'use client';

import Link from 'next/link';
import { Package, RotateCcw, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { notifyToast } from '@/components/ui/toaster';
import { useConfirmCodexRequest, useMyCodexRequests, useRetryCodexRequest } from '@/hooks/use-codex-api';
import { displayImageUrl } from '@/lib/images';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';

const statusTone = {
  PENDING: 'gold',
  SENT: 'blue',
  CONFIRMED: 'green',
  NEEDS_RETRY: 'red',
  CANCELLED: 'muted',
} as const;

export default function CodexPage() {
  const locale = useLocaleStore((state) => state.locale);
  const requests = useMyCodexRequests();
  const confirmRequest = useConfirmCodexRequest();
  const retryRequest = useRetryCodexRequest();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">{t(locale, 'codexQueue')}</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'codexRequests')}</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{t(locale, 'codexHelp')}</p>
      </div>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 backdrop-blur-md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge tone="gold">Inativo Temporariamente</Badge>
              <h3 className="text-base font-semibold text-amber-200">Envio de Prints de Codex Suspenso</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              O sistema de requisições de Codex está temporariamente inativo nesta fase do servidor.
              Agora você pode solicitar até <strong>5 itens diretamente do Baú da Guilda</strong>, liberando novas vagas conforme os itens forem despachados ou rejeitados pela Staff.
            </p>
          </div>
          <Link
            href="/dashboard/storage"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition hover:opacity-90"
          >
            <Package className="h-4 w-4" />
            Acessar Baú da Guilda
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {(requests.data ?? []).map((request) => (
          <Card key={request.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle>{t(locale, 'requestNumber')} #{request.id.slice(0, 8)}</CardTitle>
                <Badge tone={statusTone[request.status]}>{request.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <img className="aspect-video w-full rounded-md border object-cover" src={displayImageUrl(request.imageUrl)} alt={t(locale, 'openRequestedPrint')} />
                  <a className="text-xs text-primary" href={request.imageUrl} target="_blank" rel="noreferrer">{t(locale, 'openPrintNewTab')}</a>
                </div>
                {request.proofImageUrl && (
                  <div className="space-y-2">
                    <img className="aspect-video w-full rounded-md border object-cover" src={displayImageUrl(request.proofImageUrl)} alt={t(locale, 'openDeliveryProof')} />
                    <a className="text-xs text-primary" href={request.proofImageUrl} target="_blank" rel="noreferrer">{t(locale, 'openDeliveryProof')}</a>
                  </div>
                )}
              </div>
              {request.note && <p className="text-muted-foreground">{request.note}</p>}
              <p className="text-xs text-muted-foreground">
                {t(locale, 'queuedSince')} {new Date(request.queuedAt ?? request.createdAt).toLocaleString()}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => confirmRequest.mutate(request.id, { onSuccess: () => notifyToast({ title: t(locale, 'success'), tone: 'success' }) })} disabled={request.status !== 'SENT'}>
                  <ShieldCheck className="h-4 w-4" /> {t(locale, 'success')}
                </Button>
                <Button variant="secondary" onClick={() => retryRequest.mutate(request.id, { onSuccess: () => notifyToast({ title: t(locale, 'failedRetry'), tone: 'success' }) })} disabled={request.status !== 'SENT'}>
                  <RotateCcw className="h-4 w-4" /> {t(locale, 'failedRetry')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {!requests.isLoading && (requests.data ?? []).length === 0 && (
        <EmptyState title="Nenhum registro histórico de codex">
          O sistema de codex está inativo no momento. Utilize o Baú da Guilda para solicitar itens disponíveis.
        </EmptyState>
      )}
    </div>
  );
}
