'use client';

import { useState } from 'react';
import { RotateCcw, Send, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FileUploadButton } from '@/components/ui/file-upload-button';
import { Input } from '@/components/ui/input';
import { notifyToast } from '@/components/ui/toaster';
import { useConfirmCodexRequest, useCreateCodexRequest, useMyCodexRequests, useRetryCodexRequest } from '@/hooks/use-codex-api';
import { useUploadImage } from '@/hooks/use-profile-api';
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
  const createRequest = useCreateCodexRequest();
  const confirmRequest = useConfirmCodexRequest();
  const retryRequest = useRetryCodexRequest();
  const uploadImage = useUploadImage();
  const [form, setForm] = useState({ imageUrl: '', note: '' });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">{t(locale, 'codexQueue')}</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'codexRequests')}</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{t(locale, 'codexHelp')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t(locale, 'newRequest')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <FileUploadButton
            label={t(locale, 'attachImage')}
            onFileSelect={(files) => {
              const file = files?.[0];
              if (file) {
                uploadImage.mutate(file, {
                  onSuccess: (data) => setForm((current) => ({ ...current, imageUrl: data.url })),
                });
              }
            }}
          />
          {form.imageUrl && <p className="text-center text-xs text-primary">{t(locale, 'printAttached')}</p>}
          <Input placeholder={t(locale, 'optionalNote')} value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} />
          <Button
            disabled={!form.imageUrl || createRequest.isPending}
            onClick={() => createRequest.mutate(form, {
              onSuccess: () => {
                setForm({ imageUrl: '', note: '' });
                notifyToast({ title: t(locale, 'codexRequestSent'), tone: 'success' });
              },
            })}
          >
            <Send className="h-4 w-4" /> {t(locale, 'sendRequest')}
          </Button>
        </CardContent>
      </Card>

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
        <EmptyState title={t(locale, 'noCodexRequests')}>{t(locale, 'noCodexRequestsHelp')}</EmptyState>
      )}
    </div>
  );
}
