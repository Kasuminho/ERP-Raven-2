'use client';

import { useState } from 'react';
import { ExternalLink, Gift, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FileUploadButton } from '@/components/ui/file-upload-button';
import { Input } from '@/components/ui/input';
import { notifyToast } from '@/components/ui/toaster';
import { useCreateDaoshiReceipt, useMyDaoshiReceipts, useMyDaoshiSummary } from '@/hooks/use-daoshi-api';
import { useUploadImage } from '@/hooks/use-profile-api';
import { displayImageUrl } from '@/lib/images';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';

const discordUrl = 'https://discord.gg/4BeBY7XwJu';

const copy = {
  pt: {
    eyebrow: 'Cash com cupom AACD',
    title: 'Cashar com a Daoshi',
    help: 'Cashs feitos com o cupom AACD participam da meta mensal da guild. A cada R$200 aprovados no mes, voce ganha 1 cupom para o sorteio.',
    discord: 'Entrar no Discord da Daoshi',
    tutorial: 'O tutorial completo de compra e envio do comprovante sera feito e colocado aqui no site.',
    submitTitle: 'Enviar comprovante',
    amount: 'Valor da compra em R$',
    date: 'Data da compra',
    note: 'Observacao opcional',
    send: 'Enviar comprovante',
    sent: 'Comprovante enviado para aprovacao da Staff.',
    guildGoal: 'Meta mensal da guild',
    personalCoupons: 'Seus cupons no mes',
    approvedBalance: 'Seu total aprovado no mes',
    raffle: 'Sorteio de $50 de saldo',
    raffleEnabled: 'Sorteio habilitado',
    raffleLocked: 'Sorteio bloqueado ate a guild bater R$10.000 no mes.',
    history: 'Seus comprovantes',
    noReceipts: 'Nenhum comprovante enviado ainda.',
    status: 'Status',
    pending: 'Aguardando Staff',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    reviewedValue: 'Valor aprovado',
    couponRule: 'Cupons sao calculados pela soma das compras aprovadas no mes. Comprovante pendente nao conta.',
  },
  en: {
    eyebrow: 'Cash with AACD coupon',
    title: 'Cash through Daoshi',
    help: 'Purchases made with coupon AACD count toward the guild monthly goal. Every R$200 approved in the month grants 1 raffle ticket.',
    discord: 'Join Daoshi Discord',
    tutorial: 'The full purchase and receipt tutorial will be created and published here on the website.',
    submitTitle: 'Submit receipt',
    amount: 'Purchase amount in R$',
    date: 'Purchase date',
    note: 'Optional note',
    send: 'Submit receipt',
    sent: 'Receipt submitted for Staff approval.',
    guildGoal: 'Guild monthly goal',
    personalCoupons: 'Your tickets this month',
    approvedBalance: 'Your approved total this month',
    raffle: '$50 balance raffle',
    raffleEnabled: 'Raffle enabled',
    raffleLocked: 'Raffle locked until the guild reaches R$10,000 this month.',
    history: 'Your receipts',
    noReceipts: 'No receipts submitted yet.',
    status: 'Status',
    pending: 'Waiting for Staff',
    approved: 'Approved',
    rejected: 'Rejected',
    reviewedValue: 'Approved amount',
    couponRule: 'Tickets are calculated from the sum of approved purchases in the month. Pending receipts do not count.',
  },
  es: {
    eyebrow: 'Cash con cupon AACD',
    title: 'Comprar cash con Daoshi',
    help: 'Compras hechas con el cupon AACD cuentan para la meta mensual de la guild. Cada R$200 aprobados en el mes da 1 cupón para el sorteo.',
    discord: 'Entrar al Discord de Daoshi',
    tutorial: 'El tutorial completo de compra y envio del comprobante sera creado y publicado aqui en el sitio.',
    submitTitle: 'Enviar comprobante',
    amount: 'Valor de compra en R$',
    date: 'Fecha de compra',
    note: 'Observacion opcional',
    send: 'Enviar comprobante',
    sent: 'Comprobante enviado para aprobacion de Staff.',
    guildGoal: 'Meta mensual de la guild',
    personalCoupons: 'Tus cupones del mes',
    approvedBalance: 'Tu total aprobado del mes',
    raffle: 'Sorteo de $50 de saldo',
    raffleEnabled: 'Sorteo habilitado',
    raffleLocked: 'Sorteo bloqueado hasta que la guild llegue a R$10.000 en el mes.',
    history: 'Tus comprobantes',
    noReceipts: 'Aun no enviaste comprobantes.',
    status: 'Status',
    pending: 'Esperando Staff',
    approved: 'Aprobado',
    rejected: 'Rechazado',
    reviewedValue: 'Valor aprobado',
    couponRule: 'Los cupones se calculan por la suma de compras aprobadas en el mes. Comprobante pendiente no cuenta.',
  },
} as const;

const statusTone = {
  PENDING: 'gold',
  APPROVED: 'green',
  REJECTED: 'red',
} as const;

function money(cents = 0): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export default function DaoshiPage() {
  const locale = useLocaleStore((state) => state.locale);
  const text = copy[locale];
  const summary = useMyDaoshiSummary();
  const receipts = useMyDaoshiReceipts();
  const uploadImage = useUploadImage();
  const createReceipt = useCreateDaoshiReceipt();
  const [form, setForm] = useState({ proofImageUrl: '', purchaseAmount: '', purchaseDate: new Date().toISOString().slice(0, 10), playerNote: '' });
  const progress = summary.data?.guildProgressPercent ?? 0;

  function submit() {
    createReceipt.mutate(
      {
        proofImageUrl: form.proofImageUrl,
        purchaseAmount: Number(form.purchaseAmount),
        purchaseDate: new Date(`${form.purchaseDate}T12:00:00.000Z`).toISOString(),
        playerNote: form.playerNote || undefined,
      },
      {
        onSuccess: () => {
          setForm({ proofImageUrl: '', purchaseAmount: '', purchaseDate: new Date().toISOString().slice(0, 10), playerNote: '' });
          notifyToast({ title: text.sent, tone: 'success' });
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">{text.eyebrow}</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{text.title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{text.help}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>{text.guildGoal}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-3xl font-bold">{money(summary.data?.totalApprovedCents ?? 0)}</p>
                <p className="text-sm text-muted-foreground">/ {money(summary.data?.targetCents ?? 1_000_000)} - {summary.data?.month}</p>
              </div>
              <Badge tone={summary.data?.raffleEnabled ? 'green' : 'gold'}>
                {summary.data?.raffleEnabled ? text.raffleEnabled : text.raffle}
              </Badge>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-sm text-muted-foreground">{summary.data?.raffleEnabled ? text.raffleEnabled : text.raffleLocked}</p>
            <p className="text-xs text-muted-foreground">{text.couponRule}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{text.personalCoupons}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border bg-background/45 p-4">
                <p className="text-sm text-muted-foreground">{text.approvedBalance}</p>
                <p className="text-2xl font-bold">{money(summary.data?.playerApprovedCents ?? 0)}</p>
              </div>
              <div className="rounded-md border bg-background/45 p-4">
                <p className="text-sm text-muted-foreground">{text.personalCoupons}</p>
                <p className="text-2xl font-bold">{summary.data?.playerCoupons ?? 0}</p>
              </div>
            </div>
            <a
              href={discordUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
            >
              <ExternalLink className="h-4 w-4" /> {text.discord}
            </a>
            <p className="text-sm text-primary">{text.tutorial}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{text.submitTitle}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-[1fr_1fr]">
          <Input type="number" min="0" step="0.01" placeholder={text.amount} value={form.purchaseAmount} onChange={(event) => setForm((current) => ({ ...current, purchaseAmount: event.target.value }))} />
          <Input type="date" value={form.purchaseDate} onChange={(event) => setForm((current) => ({ ...current, purchaseDate: event.target.value }))} />
          <Input className="lg:col-span-2" placeholder={text.note} value={form.playerNote} onChange={(event) => setForm((current) => ({ ...current, playerNote: event.target.value }))} />
          <div className="lg:col-span-2">
            <FileUploadButton
              label={t(locale, 'attachImage')}
              disabled={uploadImage.isPending || createReceipt.isPending}
              onFileSelect={(files) => {
                const file = files?.[0];
                if (file) {
                  uploadImage.mutate(file, {
                    onSuccess: (data) => setForm((current) => ({ ...current, proofImageUrl: data.url })),
                  });
                }
              }}
            />
            {form.proofImageUrl && <p className="mt-2 text-center text-xs text-primary">{t(locale, 'printAttached')}</p>}
          </div>
          <Button className="lg:col-span-2" disabled={!form.proofImageUrl || !form.purchaseAmount || createReceipt.isPending || uploadImage.isPending} onClick={submit}>
            <Send className="h-4 w-4" /> {text.send}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="font-[var(--font-cinzel)] text-2xl font-bold">{text.history}</h2>
        {(receipts.data ?? []).map((receipt) => (
          <Card key={receipt.id}>
            <CardContent className="grid gap-3 p-4 md:grid-cols-[120px_1fr_auto]">
              <img className="aspect-video w-full rounded-md border object-cover md:aspect-square" src={displayImageUrl(receipt.proofImageUrl)} alt={text.submitTitle} />
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={statusTone[receipt.status]}>{receipt.status === 'PENDING' ? text.pending : receipt.status === 'APPROVED' ? text.approved : text.rejected}</Badge>
                  <span className="text-sm text-muted-foreground">{new Date(receipt.purchaseDate).toLocaleDateString()}</span>
                </div>
                <p className="font-semibold">{money(receipt.purchaseCents)}</p>
                {receipt.approvedCents ? <p className="text-sm text-primary">{text.reviewedValue}: {money(receipt.approvedCents)}</p> : null}
                {receipt.reviewNote ? <p className="text-sm text-muted-foreground">Staff: {receipt.reviewNote}</p> : null}
              </div>
              <a
                href={receipt.proofImageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border bg-secondary px-3 py-2 text-sm font-semibold transition hover:bg-muted"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </CardContent>
          </Card>
        ))}
        {!receipts.isLoading && (receipts.data ?? []).length === 0 && (
          <EmptyState title={text.noReceipts}>
            <Gift className="mx-auto h-8 w-8 text-primary" />
          </EmptyState>
        )}
      </div>
    </div>
  );
}
