'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { notifyToast } from '@/components/ui/toaster';
import { type OnboardingTemplateDraft, useCreateOnboardingTemplate, useOnboardingStaffWorkspace } from '@/hooks/use-onboarding-api';
import type { OnboardingCompletionType } from '@/types/api';

const defaultSteps: OnboardingTemplateDraft['steps'] = [
  ['RULES', 'Ler e reconhecer as regras', 'Read and acknowledge the rules', 'Leia a política publicada e registre Li e entendi.', 'Read the published policy and select I read and understood.', '/dashboard/rules', true, 'RULES_ACK'],
  ['PROFILE', 'Conferir perfil', 'Review your profile', 'Confirme nickname, classe e camada.', 'Confirm nickname, class, and layer.', '/dashboard/profile', true, 'PROFILE'],
  ['TIMEZONE', 'Definir timezone', 'Set your timezone', 'Cadastre o fuso correto.', 'Set the correct timezone.', '/dashboard/profile', true, 'TIMEZONE'],
  ['BUILD', 'Declarar build', 'Declare your build', 'Informe sua build operacional.', 'Provide your operational build.', '/dashboard/profile', true, 'BUILD'],
  ['WISHLIST', 'Montar wishlist', 'Build your wishlist', 'Registre um objetivo de equipamento.', 'Register an equipment goal.', '/dashboard/wishlist', false, 'WISHLIST'],
  ['ATTENDANCE', 'Entender presença e DKP', 'Understand attendance and DKP', 'Diferencie RSVP, presença e DKP.', 'Understand RSVP, attendance, and DKP.', '/dashboard/attendance', true, 'MANUAL'],
  ['FIRST_EVENT', 'Participar do primeiro evento', 'Attend your first event', 'Conclui após presença registrada.', 'Completes after recorded attendance.', '/dashboard/attendance', true, 'FIRST_EVENT'],
  ['CHANNELS', 'Escolher canais de lembrete', 'Choose reminder channels', 'Revise e salve Web/Discord.', 'Review and save Web/Discord.', '/dashboard/profile', true, 'MANUAL'],
].map(([key, titlePt, titleEn, descriptionPt, descriptionEn, href, isRequired, completionType], displayOrder) => ({ key: String(key), titlePt: String(titlePt), titleEn: String(titleEn), descriptionPt: String(descriptionPt), descriptionEn: String(descriptionEn), href: String(href), isRequired: Boolean(isRequired), completionType: completionType as OnboardingCompletionType, displayOrder }));

export default function StaffOnboardingPage() {
  const workspace = useOnboardingStaffWorkspace();
  const publish = useCreateOnboardingTemplate();
  const [draft, setDraft] = useState<OnboardingTemplateDraft>({ name: 'Onboarding G3X', dueDays: 30, steps: defaultSteps });
  useEffect(() => {
    const active = workspace.data?.activeTemplate;
    if (!active) return;
    setDraft({ name: active.name, dueDays: active.dueDays, steps: active.steps.map(({ key, titlePt, titleEn, descriptionPt, descriptionEn, href, isRequired, completionType, displayOrder }) => ({ key, titlePt, titleEn, descriptionPt, descriptionEn, href, isRequired, completionType, displayOrder })) });
  }, [workspace.data?.activeTemplate]);

  const activePlans = workspace.data?.plans.filter((plan) => plan && !plan.completedAt) ?? [];
  const overdue = activePlans.filter((plan) => new Date(plan!.dueAt) < new Date()).length;
  function patchStep(index: number, patch: Partial<OnboardingTemplateDraft['steps'][number]>) { setDraft((current) => ({ ...current, steps: current.steps.map((step, stepIndex) => stepIndex === index ? { ...step, ...patch } : step) })); }

  return <div className="space-y-6"><div><p className="text-sm uppercase text-primary">Onboarding Staff</p><h1 className="font-[var(--font-cinzel)] text-3xl font-bold">Template e planos ativos</h1><p className="mt-2 text-sm text-muted-foreground">Publicar cria uma nova versão. Planos já instanciados preservam o snapshot antigo; nada muda silenciosamente no checklist de quem já entrou.</p></div>
    <div className="grid gap-3 sm:grid-cols-3"><Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Template ativo</p><p className="mt-1 font-semibold">{workspace.data?.activeTemplate ? `${workspace.data.activeTemplate.name} · v${workspace.data.activeTemplate.version}` : 'Padrão será criado na próxima conversão'}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Planos em andamento</p><p className="mt-1 text-2xl font-bold">{activePlans.length}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Prazo vencido</p><p className="mt-1 text-2xl font-bold">{overdue}</p><p className="text-xs text-muted-foreground">Contexto de acompanhamento, nunca punição automática.</p></CardContent></Card></div>
    <Card><CardHeader><CardTitle>Publicar nova versão do template</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 md:grid-cols-[1fr_180px]"><Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Nome do template" /><Input type="number" min={1} max={180} value={draft.dueDays} onChange={(event) => setDraft((current) => ({ ...current, dueDays: Number(event.target.value) }))} /></div>{draft.steps.map((step, index) => <div key={step.key} className="space-y-3 rounded-md border border-white/10 bg-background/35 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Badge tone="blue">{index + 1}</Badge><Input className="w-52" value={step.key} onChange={(event) => patchStep(index, { key: event.target.value.toUpperCase() })} /></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={step.isRequired} onChange={(event) => patchStep(index, { isRequired: event.target.checked })} />Obrigatória</label></div><div className="grid gap-2 md:grid-cols-2"><Input value={step.titlePt} onChange={(event) => patchStep(index, { titlePt: event.target.value })} placeholder="Título PT-BR" /><Input value={step.titleEn} onChange={(event) => patchStep(index, { titleEn: event.target.value })} placeholder="Title EN" /><Input value={step.descriptionPt} onChange={(event) => patchStep(index, { descriptionPt: event.target.value })} placeholder="Descrição PT-BR" /><Input value={step.descriptionEn} onChange={(event) => patchStep(index, { descriptionEn: event.target.value })} placeholder="Description EN" /><Input value={step.href} onChange={(event) => patchStep(index, { href: event.target.value })} placeholder="/dashboard/..." /><Select value={step.completionType} onChange={(event) => patchStep(index, { completionType: event.target.value as OnboardingCompletionType })}>{['MANUAL', 'RULES_ACK', 'PROFILE', 'TIMEZONE', 'BUILD', 'WISHLIST', 'FIRST_EVENT'].map((value) => <option key={value}>{value}</option>)}</Select></div></div>)}<Button disabled={publish.isPending || draft.name.trim().length < 3 || draft.steps.length === 0} onClick={() => publish.mutate(draft, { onSuccess: () => notifyToast({ title: 'Nova versão do onboarding publicada.', tone: 'success' }), onError: () => notifyToast({ title: 'Não foi possível publicar o template.', tone: 'error' }) })}>Publicar nova versão</Button></CardContent></Card>
    <Card><CardHeader><CardTitle>Planos recentes</CardTitle></CardHeader><CardContent className="space-y-2">{workspace.data?.plans.slice(0, 30).map((plan) => plan ? <div key={plan.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-white/10 p-3 text-sm"><div><p className="font-semibold">{plan.player.nickname}</p><p className="text-xs text-muted-foreground">{plan.template.name} · v{plan.template.version} · prazo {new Date(plan.dueAt).toLocaleDateString()}</p></div><Badge tone={plan.completedAt ? 'green' : new Date(plan.dueAt) < new Date() ? 'red' : 'gold'}>{plan.completedAt ? 'CONCLUÍDO' : new Date(plan.dueAt) < new Date() ? 'ATRASADO' : 'EM ANDAMENTO'}</Badge></div> : null)}</CardContent></Card>
  </div>;
}
