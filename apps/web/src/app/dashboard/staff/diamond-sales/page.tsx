'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Circle, ExternalLink, Gem, Send, UsersRound } from 'lucide-react';
import { AuthGuard } from '@/components/guards/auth-guard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FileUploadButton } from '@/components/ui/file-upload-button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { notifyToast } from '@/components/ui/toaster';
import { useCreateDiamondSale, useDeliverDiamondShare, useDiamondSales, useDiamondSaleSetup, usePublishDiamondSale } from '@/hooks/use-diamond-sales-api';
import { useUploadImage } from '@/hooks/use-profile-api';
import { displayImageUrl } from '@/lib/images';
import type { DiamondSale } from '@/types/api';

type SaleForm = {
  itemCatalogId: string;
  buyerType: 'GUILD_MEMBER' | 'EXTERNAL';
  buyerPlayerId: string;
  buyerName: string;
  diamondCustodian: string;
  diamondTotal: string;
  itemProofImageUrl: string;
  saleProofImageUrl: string;
  recipientMode: 'ALL_ACTIVE' | 'EXCLUDE_SELECTED';
  excludedPlayerIds: string[];
};

const emptyForm: SaleForm = {
  itemCatalogId: '',
  buyerType: 'EXTERNAL',
  buyerPlayerId: '',
  buyerName: '',
  diamondCustodian: '',
  diamondTotal: '',
  itemProofImageUrl: '',
  saleProofImageUrl: '',
  recipientMode: 'ALL_ACTIVE',
  excludedPlayerIds: [],
};

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString('pt-BR') : '-';
}

function SaleCard({ sale }: { sale: DiamondSale }) {
  const uploadImage = useUploadImage();
  const deliverShare = useDeliverDiamondShare();
  const publishSale = usePublishDiamondSale();
  const [proofs, setProofs] = useState<Record<string, string>>({});
  const deliveredCount = sale.recipients.filter((recipient) => recipient.deliveredAt).length;

  async function uploadRecipientProof(recipientId: string, file?: File) {
    if (!file) return;
    const uploaded = await uploadImage.mutateAsync(file);
    setProofs((current) => ({ ...current, [recipientId]: uploaded.url }));
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{sale.itemName}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Aberta em {formatDate(sale.openedAt)} · comprador {sale.buyerType === 'GUILD_MEMBER' ? 'da guilda' : 'externo'}: {sale.buyerName}</p>
          </div>
          <div className="flex gap-2">
            <Badge tone={sale.status === 'COMPLETED' ? 'blue' : 'gold'}>{sale.status === 'COMPLETED' ? 'Concluída' : 'Em distribuição'}</Badge>
            <Badge>{deliveredCount}/{sale.recipientCount} envios</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 rounded-md border bg-background/35 p-3 text-sm sm:grid-cols-2 xl:grid-cols-5">
          <div><p className="text-xs uppercase text-muted-foreground">Total</p><p className="font-semibold">{sale.diamondTotal} 💎</p></div>
          <div><p className="text-xs uppercase text-muted-foreground">Por jogador</p><p className="font-semibold">{sale.shareAmount} 💎</p></div>
          <div><p className="text-xs uppercase text-muted-foreground">Sobra</p><p className="font-semibold">{sale.remainderAmount} 💎</p></div>
          <div><p className="text-xs uppercase text-muted-foreground">Snapshot ativo</p><p className="font-semibold">{sale.activePlayerCount}</p></div>
          <div><p className="text-xs uppercase text-muted-foreground">Diamantes com</p><p className="font-semibold">{sale.diamondCustodian}</p></div>
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <a className="inline-flex items-center gap-1 text-primary" href={displayImageUrl(sale.itemProofImageUrl)} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Prova do item</a>
          <a className="inline-flex items-center gap-1 text-primary" href={displayImageUrl(sale.saleProofImageUrl)} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Prova da venda</a>
          {sale.discordPublishedAt && <span className="text-cyan-200">Publicado no Discord em {formatDate(sale.discordPublishedAt)}</span>}
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {sale.recipients.map((recipient) => {
            const proof = proofs[recipient.id] ?? '';
            return (
              <div key={recipient.id} className="rounded-md border bg-background/25 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {recipient.deliveredAt ? <CheckCircle2 className="h-5 w-5 text-cyan-300" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                    <div><p className="font-semibold">{recipient.playerNickname}</p><p className="text-xs text-muted-foreground">{recipient.diamondAmount} diamantes</p></div>
                  </div>
                  <Badge tone={recipient.deliveredAt ? 'blue' : 'gold'}>{recipient.deliveredAt ? 'Enviado' : 'Pendente'}</Badge>
                </div>
                {recipient.deliveredAt ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    <span>{formatDate(recipient.deliveredAt)}</span>
                    {recipient.proofImageUrl && <a className="text-primary" href={displayImageUrl(recipient.proofImageUrl)} target="_blank" rel="noreferrer">Abrir prova</a>}
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <FileUploadButton label="Anexar prova de envio" onFileSelect={(files) => uploadRecipientProof(recipient.id, files?.[0])} />
                    {proof && <a className="text-sm text-primary" href={displayImageUrl(proof)} target="_blank" rel="noreferrer">Conferir prova</a>}
                    <Button
                      disabled={!proof || deliverShare.isPending || uploadImage.isPending}
                      onClick={() => deliverShare.mutate(
                        { saleId: sale.id, recipientId: recipient.id, proofImageUrl: proof },
                        { onSuccess: (updated) => {
                          setProofs((current) => ({ ...current, [recipient.id]: '' }));
                          notifyToast({
                            title: updated.status === 'COMPLETED' ? 'Último envio registrado e partilha concluída.' : `Envio registrado para ${recipient.playerNickname}.`,
                            tone: 'success',
                          });
                        } },
                      )}
                    >
                      <Send className="h-4 w-4" /> Registrar envio
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {sale.status === 'COMPLETED' && !sale.discordPublishedAt && (
          <div className="rounded-md border border-amber-400/40 bg-amber-400/10 p-3 text-sm">
            <p className="font-semibold text-amber-100">A partilha terminou, mas a publicação no Discord não foi confirmada.</p>
            <Button className="mt-2" variant="secondary" disabled={publishSale.isPending} onClick={() => publishSale.mutate(sale.id)}>
              Tentar publicação novamente
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DiamondSalesPage() {
  const setup = useDiamondSaleSetup();
  const sales = useDiamondSales();
  const createSale = useCreateDiamondSale();
  const uploadImage = useUploadImage();
  const [form, setForm] = useState<SaleForm>(emptyForm);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const activePlayers = useMemo(() => setup.data?.activePlayers ?? [], [setup.data]);
  const automaticExcludedIds = useMemo(
    () => form.buyerType === 'GUILD_MEMBER' && form.buyerPlayerId ? [form.buyerPlayerId] : [],
    [form.buyerPlayerId, form.buyerType],
  );
  const effectiveExcludedIds = useMemo(
    () => new Set([...form.excludedPlayerIds, ...automaticExcludedIds]),
    [automaticExcludedIds, form.excludedPlayerIds],
  );
  const recipientCount = Math.max(0, activePlayers.length - effectiveExcludedIds.size);
  const total = Number(form.diamondTotal) || 0;
  const share = recipientCount > 0 ? Math.floor(total / recipientCount) : 0;
  const remainder = recipientCount > 0 ? total - (share * recipientCount) : total;
  const formReady = Boolean(
    form.itemCatalogId
      && form.diamondCustodian.trim()
      && total > 0
      && form.itemProofImageUrl
      && form.saleProofImageUrl
      && recipientCount > 0
      && (form.buyerType === 'GUILD_MEMBER' ? form.buyerPlayerId : form.buyerName.trim()),
  );

  function patchForm(patch: Partial<SaleForm>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  async function uploadSaleProof(field: 'itemProofImageUrl' | 'saleProofImageUrl', file?: File) {
    if (!file) return;
    const uploaded = await uploadImage.mutateAsync(file);
    patchForm({ [field]: uploaded.url });
  }

  function toggleExcluded(playerId: string) {
    setForm((current) => ({
      ...current,
      excludedPlayerIds: current.excludedPlayerIds.includes(playerId)
        ? current.excludedPlayerIds.filter((id) => id !== playerId)
        : [...current.excludedPlayerIds, playerId],
    }));
  }

  return (
    <AuthGuard roles={['STAFF', 'ADMIN']}>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase text-primary">Economia da guilda</p>
          <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">Vendas por diamantes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Abra a venda, congele os jogadores ativos e acompanhe cada envio até a publicação das provas.</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Gem className="h-5 w-5" /> Abrir nova partilha</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {(setup.data?.items.length ?? 0) === 0 && !setup.isLoading ? (
              <EmptyState title="Nenhum item habilitado">Na tela de catálogo, edite um item e marque “Habilitar venda por diamantes para terceiros”.</EmptyState>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <label className="space-y-1 text-sm"><span>Item habilitado</span><Select value={form.itemCatalogId} onChange={(event) => patchForm({ itemCatalogId: event.target.value })}><option value="">Selecione</option>{setup.data?.items.map((item) => <option key={item.id} value={item.id}>{item.namePt} / {item.nameEn}</option>)}</Select></label>
                  <label className="space-y-1 text-sm"><span>Origem do comprador</span><Select value={form.buyerType} onChange={(event) => patchForm({ buyerType: event.target.value as SaleForm['buyerType'], buyerPlayerId: '', buyerName: '' })}><option value="EXTERNAL">Fora da guilda</option><option value="GUILD_MEMBER">Da guilda</option></Select></label>
                  {form.buyerType === 'GUILD_MEMBER' ? (
                    <label className="space-y-1 text-sm"><span>Player comprador</span><Select value={form.buyerPlayerId} onChange={(event) => patchForm({ buyerPlayerId: event.target.value })}><option value="">Selecione</option>{activePlayers.map((player) => <option key={player.id} value={player.id}>{player.nickname}</option>)}</Select></label>
                  ) : (
                    <label className="space-y-1 text-sm"><span>Nome do comprador externo</span><Input value={form.buyerName} onChange={(event) => patchForm({ buyerName: event.target.value })} maxLength={100} /></label>
                  )}
                  <label className="space-y-1 text-sm"><span>Diamantes estão com</span><Input value={form.diamondCustodian} onChange={(event) => patchForm({ diamondCustodian: event.target.value })} placeholder="Guilda ou nome da pessoa" maxLength={120} /></label>
                  <label className="space-y-1 text-sm"><span>Saldo total deste item</span><Input type="number" min={1} step={1} value={form.diamondTotal} onChange={(event) => patchForm({ diamondTotal: event.target.value })} /></label>
                  <label className="space-y-1 text-sm"><span>Participantes</span><Select value={form.recipientMode} onChange={(event) => patchForm({ recipientMode: event.target.value as SaleForm['recipientMode'], excludedPlayerIds: [] })}><option value="ALL_ACTIVE">Todos os jogadores ativos</option><option value="EXCLUDE_SELECTED">Todos os ativos, exceto...</option></Select></label>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-md border bg-background/35 p-3"><p className="mb-2 text-sm font-semibold">Print do item vendido</p><FileUploadButton label="Anexar print do item" onFileSelect={(files) => uploadSaleProof('itemProofImageUrl', files?.[0])} />{form.itemProofImageUrl && <a className="mt-2 block text-sm text-primary" href={displayImageUrl(form.itemProofImageUrl)} target="_blank" rel="noreferrer">Conferir print</a>}</div>
                  <div className="rounded-md border bg-background/35 p-3"><p className="mb-2 text-sm font-semibold">Prova da venda</p><FileUploadButton label="Anexar prova da venda" onFileSelect={(files) => uploadSaleProof('saleProofImageUrl', files?.[0])} />{form.saleProofImageUrl && <a className="mt-2 block text-sm text-primary" href={displayImageUrl(form.saleProofImageUrl)} target="_blank" rel="noreferrer">Conferir prova</a>}</div>
                </div>

                {form.recipientMode === 'EXCLUDE_SELECTED' && (
                  <div className="rounded-md border bg-background/35 p-3">
                    <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><UsersRound className="h-4 w-4" /> Jogadores que não participam</p>
                    <div className="flex flex-wrap gap-2">{activePlayers.map((player) => {
                      const isBuyer = automaticExcludedIds.includes(player.id);
                      const checked = isBuyer || form.excludedPlayerIds.includes(player.id);
                      return <label key={player.id} className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${checked ? 'border-primary bg-primary/15' : 'bg-background/40'}`}><input type="checkbox" checked={checked} disabled={isBuyer} onChange={() => toggleExcluded(player.id)} className="accent-primary" />{player.nickname}{isBuyer ? ' (comprador)' : ''}</label>;
                    })}</div>
                  </div>
                )}

                {form.buyerType === 'GUILD_MEMBER' && form.recipientMode === 'ALL_ACTIVE' && form.buyerPlayerId && <p className="text-sm text-primary">O comprador da guilda será retirado automaticamente, mesmo no modo “todos os ativos”.</p>}

                <div className="grid gap-3 rounded-md border border-primary/30 bg-primary/5 p-3 sm:grid-cols-4">
                  <div><p className="text-xs uppercase text-muted-foreground">Ativos agora</p><p className="text-xl font-bold">{activePlayers.length}</p></div>
                  <div><p className="text-xs uppercase text-muted-foreground">Receberão</p><p className="text-xl font-bold">{recipientCount}</p></div>
                  <div><p className="text-xs uppercase text-muted-foreground">Por jogador</p><p className="text-xl font-bold">{share} 💎</p></div>
                  <div><p className="text-xs uppercase text-muted-foreground">Sobra registrada</p><p className="text-xl font-bold">{remainder} 💎</p></div>
                </div>

                <Button disabled={!formReady || createSale.isPending || uploadImage.isPending} onClick={() => setConfirmOpen(true)}>Abrir partilha e congelar lista</Button>
              </>
            )}
          </CardContent>
        </Card>

        <section className="space-y-3">
          <h2 className="font-[var(--font-cinzel)] text-2xl font-bold">Partilhas registradas</h2>
          {(sales.data ?? []).map((sale) => <SaleCard key={sale.id} sale={sale} />)}
          {!sales.isLoading && (sales.data?.length ?? 0) === 0 && <EmptyState title="Nenhuma venda registrada">Quando a primeira partilha for aberta, o snapshot e os envios aparecerão aqui.</EmptyState>}
        </section>

        <ConfirmationDialog
          open={confirmOpen}
          title="Abrir esta partilha de diamantes?"
          description={`A lista de ${recipientCount} destinatário(s) será congelada agora. Cada um receberá ${share} diamantes e ${remainder} ficará registrado como sobra.`}
          confirmLabel="Abrir partilha"
          pending={createSale.isPending}
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => createSale.mutate({
            itemCatalogId: form.itemCatalogId,
            buyerType: form.buyerType,
            buyerPlayerId: form.buyerType === 'GUILD_MEMBER' ? form.buyerPlayerId : undefined,
            buyerName: form.buyerType === 'EXTERNAL' ? form.buyerName.trim() : undefined,
            diamondCustodian: form.diamondCustodian.trim(),
            diamondTotal: total,
            itemProofImageUrl: form.itemProofImageUrl,
            saleProofImageUrl: form.saleProofImageUrl,
            recipientMode: form.recipientMode,
            excludedPlayerIds: form.recipientMode === 'EXCLUDE_SELECTED' ? form.excludedPlayerIds : [],
          }, { onSuccess: () => {
            setForm(emptyForm);
            setConfirmOpen(false);
            notifyToast({ title: 'Partilha aberta com snapshot dos jogadores ativos.', tone: 'success' });
          } })}
        />
      </div>
    </AuthGuard>
  );
}
