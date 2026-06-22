'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { FileUploadButton } from '@/components/ui/file-upload-button';
import { notifyToast } from '@/components/ui/toaster';
import { useRejectCodexRequest, useSendCodexRequest, useStaffCodexRequests, useUploadImage } from '@/hooks/use-guild-api';
import { displayImageUrl } from '@/lib/images';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';

export default function StaffCodexPage() {
  const locale = useLocaleStore((state) => state.locale);
  const requests = useStaffCodexRequests();
  const sendRequest = useSendCodexRequest();
  const rejectRequest = useRejectCodexRequest();
  const uploadImage = useUploadImage();
  const [proofs, setProofs] = useState<Record<string, string>>({});
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [requestToReject, setRequestToReject] = useState<string>();

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
              <div className="rounded-md border border-accent/30 bg-accent/5 p-3">
                <label className="space-y-2 text-sm">
                  <span className="font-medium">{t(locale, 'codexRejectionReason')}</span>
                  <input
                    className="h-10 w-full rounded-md border border-white/10 bg-background/78 px-3 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-ring"
                    placeholder={t(locale, 'codexRejectionReasonPlaceholder')}
                    value={rejectionReasons[request.id] ?? ''}
                    onChange={(event) => setRejectionReasons((current) => ({ ...current, [request.id]: event.target.value }))}
                  />
                </label>
              </div>
              <FileUploadButton
                label={t(locale, 'attachImage')}
                onFileSelect={(files) => {
                  const file = files?.[0];
                  if (file) uploadImage.mutate(file, { onSuccess: (data) => setProofs((current) => ({ ...current, [request.id]: data.url })) });
                }}
              />
              {proofs[request.id] && <p className="text-center text-xs text-primary">{t(locale, 'proofAttached')}</p>}
              <div className="grid gap-2 sm:grid-cols-2">
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
                <Button
                  variant="danger"
                  disabled={!rejectionReasons[request.id]?.trim() || rejectRequest.isPending}
                  onClick={() => {
                    const reason = rejectionReasons[request.id]?.trim();
                    if (reason) setRequestToReject(request.id);
                  }}
                >
                  {t(locale, 'rejectAndRemove')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <ConfirmationDialog
        open={Boolean(requestToReject)}
        title={t(locale, 'rejectAndRemove')}
        description={t(locale, 'rejectCodexConfirm')}
        confirmLabel={t(locale, 'rejectAndRemove')}
        pending={rejectRequest.isPending}
        onClose={() => setRequestToReject(undefined)}
        onConfirm={() => {
          if (!requestToReject) return;
          const reason = rejectionReasons[requestToReject]?.trim();
          if (!reason) return;
          rejectRequest.mutate(
            { id: requestToReject, reason },
            { onSuccess: () => {
              setRequestToReject(undefined);
              notifyToast({ title: t(locale, 'codexRejected'), tone: 'success' });
            } },
          );
        }}
      />
    </div>
  );
}
