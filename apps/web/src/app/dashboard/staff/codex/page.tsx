'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUploadButton } from '@/components/ui/file-upload-button';
import { notifyToast } from '@/components/ui/toaster';
import { useSendCodexRequest, useStaffCodexRequests, useUploadImage } from '@/hooks/use-guild-api';
import { displayImageUrl } from '@/lib/images';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';

export default function StaffCodexPage() {
  const locale = useLocaleStore((state) => state.locale);
  const requests = useStaffCodexRequests();
  const sendRequest = useSendCodexRequest();
  const uploadImage = useUploadImage();
  const [proofs, setProofs] = useState<Record<string, string>>({});

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">{t(locale, 'codexQueue')}</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'codexRequests')}</h1>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {(requests.data ?? []).map((request, index) => (
          <Card key={request.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>#{index + 1} {request.player?.nickname ?? 'Player'}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t(locale, 'staffQueuedSince')} {new Date(request.queuedAt ?? request.createdAt).toLocaleString()}
                  </p>
                </div>
                <Badge tone={request.status === 'CONFIRMED' ? 'green' : request.status === 'NEEDS_RETRY' ? 'red' : request.status === 'SENT' ? 'blue' : 'gold'}>{request.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
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
              {request.note && <p className="text-sm text-muted-foreground">{request.note}</p>}
              <FileUploadButton
                label={t(locale, 'attachImage')}
                onFileSelect={(files) => {
                  const file = files?.[0];
                  if (file) uploadImage.mutate(file, { onSuccess: (data) => setProofs((current) => ({ ...current, [request.id]: data.url })) });
                }}
              />
              {proofs[request.id] && <p className="text-center text-xs text-primary">{t(locale, 'proofAttached')}</p>}
              <Button
                onClick={() => sendRequest.mutate(
                  { id: request.id, proofImageUrl: proofs[request.id] },
                  {
                    onSuccess: () => {
                      setProofs((current) => ({ ...current, [request.id]: '' }));
                      notifyToast({ title: t(locale, 'markSent'), tone: 'success' });
                    },
                  },
                )}
                disabled={request.status === 'CONFIRMED' || request.status === 'CANCELLED' || request.status === 'SENT'}
              >
                {t(locale, 'markSent')}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
