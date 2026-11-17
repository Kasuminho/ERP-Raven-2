'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { AuthGuard } from '@/components/guards/auth-guard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { notifyToast } from '@/components/ui/toaster';
import { useCreateManualDrop } from '@/hooks/use-drops-api';
import { useAuditTimeline, useCommentProgress, useCreatePlayerStaffNote, usePlayerHistory, usePlayerStaffNotes } from '@/hooks/use-profile-api';
import { itemName, playerClassLabel, progressCategoryLabel } from '@/lib/game-labels';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';

export default function StaffPlayerHistoryPage() {
  const params = useParams<{ id: string }>();
  const history = usePlayerHistory(params.id);
  const timeline = useAuditTimeline('Player', params.id);
  const player = history.data?.player;
  const locale = useLocaleStore((state) => state.locale);
  const commentProgress = useCommentProgress();
  const staffNotes = usePlayerStaffNotes(params.id);
  const createStaffNote = useCreatePlayerStaffNote();
  const createManualDrop = useCreateManualDrop();
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [noteBody, setNoteBody] = useState('');
  const [noteSeverity, setNoteSeverity] = useState<'INFO' | 'WARNING' | 'STRIKE'>('INFO');
  const [isAddingDrop, setIsAddingDrop] = useState(false);
  const [manualItemName, setManualItemName] = useState('');
  const [manualDeliveredAt, setManualDeliveredAt] = useState('');
  const [manualProofUrl, setManualProofUrl] = useState('');

  function handleSaveManualDrop() {
    if (!manualItemName.trim()) {
      notifyToast({ title: 'Informe o nome do item.', tone: 'error' });
      return;
    }
    createManualDrop.mutate(
      {
        playerId: params.id,
        itemName: manualItemName.trim(),
        deliveredAt: manualDeliveredAt ? new Date(manualDeliveredAt).toISOString() : new Date().toISOString(),
        proofImageUrl: manualProofUrl.trim() || undefined,
      },
      {
        onSuccess: () => {
          setIsAddingDrop(false);
          setManualItemName('');
          setManualDeliveredAt('');
          setManualProofUrl('');
          history.refetch();
          notifyToast({ title: 'Entrega manual registrada com sucesso.', tone: 'success' });
        },
      },
    );
  }

  return (
    <AuthGuard roles={['STAFF', 'ADMIN']}>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase text-primary">{t(locale, 'playerDossier')}</p>
          <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{player?.nickname ?? 'Player'}</h1>
        </div>
        <div className="grid gap-6 xl:grid-cols-3">
          <Card>
            <CardHeader><CardTitle>{t(locale, 'identity')}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Discord: {player?.user?.discordUsername}</p>
              <p>{t(locale, 'class')}: {playerClassLabel(player?.class, locale)}</p>
              <p>{t(locale, 'layer')}: {player?.dimensionalLayer}</p>
              <p>{t(locale, 'timezone')}: {player?.timezone ?? '-'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t(locale, 'requests')}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(history.data?.itemRequests ?? []).map((request) => (
                <div key={request.id} className="rounded-md border bg-background/35 p-2 text-sm">
                  #{request.rankPosition} {itemName(request.itemCatalog ?? undefined, locale, request.itemName)} - {request.remainingQuantity}/{request.totalQuantity}
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t(locale, 'transactionHistory')}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(history.data?.transactions ?? []).slice(0, 8).map((tx) => (
                <div key={tx.id} className="flex justify-between rounded-md border bg-background/35 p-2 text-sm">
                  <span>{tx.type}</span>
                  <Badge tone={tx.amount >= 0 ? 'green' : 'red'}>{tx.amount}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader><CardTitle>Notas internas da Staff</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-[160px_1fr_auto]">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={noteSeverity}
                onChange={(event) => setNoteSeverity(event.target.value as 'INFO' | 'WARNING' | 'STRIKE')}
              >
                <option value="INFO">Info</option>
                <option value="WARNING">Aviso</option>
                <option value="STRIKE">Strike</option>
              </select>
              <Input
                placeholder="Registro interno, motivo, combinados ou alerta para futuras decisoes..."
                value={noteBody}
                onChange={(event) => setNoteBody(event.target.value)}
              />
              <Button
                disabled={createStaffNote.isPending || !noteBody.trim()}
                onClick={() => createStaffNote.mutate(
                  { playerId: params.id, severity: noteSeverity, body: noteBody },
                  {
                    onSuccess: () => {
                      setNoteBody('');
                      notifyToast({ title: 'Nota interna registrada.', tone: 'success' });
                    },
                  },
                )}
              >
                Registrar
              </Button>
            </div>
            <div className="space-y-2">
              {(staffNotes.data ?? []).map((note) => (
                <div key={note.id} className="rounded-md border bg-background/35 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge tone={note.severity === 'STRIKE' ? 'red' : note.severity === 'WARNING' ? 'gold' : 'blue'}>{note.severity}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {note.author?.discordNickname || note.author?.discordUsername || 'Staff'} - {new Date(note.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap">{note.body}</p>
                </div>
              ))}
              {!staffNotes.isLoading && (staffNotes.data ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma nota interna registrada para este player.</p>
              )}
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t(locale, 'drops')}</CardTitle>
              {!isAddingDrop && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setIsAddingDrop(true)}
                  className="gap-1 text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Lançar Entrega Manual
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {isAddingDrop && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2 mb-3">
                  <p className="text-xs font-bold text-amber-300 uppercase">Lançar Item Entregue Retroativo</p>
                  <Input
                    placeholder="Nome do item entregue..."
                    value={manualItemName}
                    onChange={(e) => setManualItemName(e.target.value)}
                    className="text-xs"
                  />
                  <Input
                    type="date"
                    value={manualDeliveredAt}
                    onChange={(e) => setManualDeliveredAt(e.target.value)}
                    className="text-xs"
                  />
                  <Input
                    placeholder="URL do print de entrega (opcional)..."
                    value={manualProofUrl}
                    onChange={(e) => setManualProofUrl(e.target.value)}
                    className="text-xs"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <Button size="sm" variant="ghost" onClick={() => setIsAddingDrop(false)} className="text-xs">
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveManualDrop}
                      disabled={createManualDrop.isPending}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
                    >
                      {createManualDrop.isPending ? 'Salvando...' : 'Salvar Entrega'}
                    </Button>
                  </div>
                </div>
              )}

              {(history.data?.drops ?? []).map((drop) => (
                <div key={drop.id} className="flex justify-between rounded-md border bg-background/35 p-2 text-sm">
                  <span>{itemName(drop.itemCatalog, locale, drop.itemName)}</span>
                  <span className="text-muted-foreground">{drop.deliveredAt ? new Date(drop.deliveredAt).toLocaleDateString() : '-'}</span>
                </div>
              ))}
              {!history.isLoading && (history.data?.drops ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum drop registrado para este jogador.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t(locale, 'progress')}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(history.data?.progress ?? []).map((row) => (
                <div key={row.id} className="rounded-md border bg-background/35 p-2 text-sm">
                  <p className="font-semibold">{progressCategoryLabel(row.category, locale)} - {t(locale, 'level')} {row.level ?? '-'}</p>
                  <p className="text-muted-foreground">{row.note || '-'}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(row.imageUrls?.length ? row.imageUrls : row.imageUrl ? [row.imageUrl] : []).map((url, index) => (
                      <a key={url} className="text-primary" href={url} target="_blank" rel="noreferrer">Print {index + 1}</a>
                    ))}
                  </div>
                  <div className="mt-3 rounded-md border bg-background/40 p-3">
                    <p className="mb-2 font-semibold">{t(locale, 'progressComments')}</p>
                    <div className="space-y-2">
                      {(row.comments ?? []).map((comment) => (
                        <div key={comment.id} className="rounded border bg-background/35 p-2">
                          <p className="text-xs text-muted-foreground">{comment.author?.discordNickname || comment.author?.discordUsername || 'Staff'} - {new Date(comment.createdAt).toLocaleString()}</p>
                          <p>{comment.body}</p>
                        </div>
                      ))}
                      {(row.comments ?? []).length === 0 && <p className="text-xs text-muted-foreground">{t(locale, 'noObservation')}</p>}
                    </div>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <Input
                        placeholder={t(locale, 'progressCommentPlaceholder')}
                        value={commentDrafts[row.id] ?? ''}
                        onChange={(event) => setCommentDrafts((current) => ({ ...current, [row.id]: event.target.value }))}
                      />
                      <Button
                        disabled={commentProgress.isPending || !(commentDrafts[row.id] ?? '').trim()}
                        onClick={() => commentProgress.mutate(
                          { progressId: row.id, body: commentDrafts[row.id] ?? '' },
                          {
                            onSuccess: () => {
                              setCommentDrafts((current) => ({ ...current, [row.id]: '' }));
                              notifyToast({ title: t(locale, 'progressCommentSent'), tone: 'success' });
                            },
                          },
                        )}
                      >
                        {t(locale, 'addProgressComment')}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader><CardTitle>{t(locale, 'auditTimeline')}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(timeline.data ?? []).map((row) => (
              <div key={row.id} className="rounded-md border bg-background/35 p-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{row.action}</span>
                  <span className="text-xs text-muted-foreground">{new Date(row.createdAt).toLocaleString()}</span>
                </div>
                {row.metadata ? <pre className="mt-2 max-h-24 overflow-auto text-xs text-muted-foreground">{JSON.stringify(row.metadata, null, 2)}</pre> : null}
              </div>
            ))}
            {!timeline.isLoading && (timeline.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">{t(locale, 'noAuditEvents')}</p>}
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
