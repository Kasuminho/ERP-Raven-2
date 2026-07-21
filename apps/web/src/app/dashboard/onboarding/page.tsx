'use client';

import Link from 'next/link';
import { CheckCircle2, Circle, Clock3, Compass } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { notifyToast } from '@/components/ui/toaster';
import { useCompleteOnboardingStep, useMyOnboarding } from '@/hooks/use-onboarding-api';
import { useLocaleStore } from '@/store/locale-store';

export default function OnboardingPage() {
  const english = useLocaleStore((state) => state.locale) === 'en';
  const workspace = useMyOnboarding();
  const complete = useCompleteOnboardingStep();
  const data = workspace.data;
  const plan = data?.plan;

  if (workspace.isLoading) return <p className="text-sm text-muted-foreground">{english ? 'Loading onboarding plan...' : 'Carregando plano de onboarding...'}</p>;
  if (!plan) return <Card><CardContent className="p-6"><h1 className="font-[var(--font-cinzel)] text-2xl font-bold">{english ? 'No active onboarding plan' : 'Sem plano de onboarding ativo'}</h1><p className="mt-2 text-sm text-muted-foreground">{english ? 'Your profile predates the plan workflow. Staff can guide the next steps without changing your existing records.' : 'Seu perfil é anterior ao fluxo de planos. A Staff pode orientar os próximos passos sem alterar seus registros existentes.'}</p></CardContent></Card>;

  const percent = data.progress.total > 0 ? Math.round((data.progress.completed / data.progress.total) * 100) : 0;
  return (
    <div className="space-y-6">
      <div><p className="text-sm uppercase text-primary">{english ? 'First steps' : 'Primeiros passos'}</p><h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{english ? 'Your onboarding plan' : 'Seu plano de onboarding'}</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">{english ? 'A real plan with a deadline and verifiable progress. No decorative green checks.' : 'Um plano real, com prazo e progresso verificável. Sem check verde decorativo.'}</p></div>
      <div className="grid gap-3 sm:grid-cols-3"><Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">{english ? 'Progress' : 'Progresso'}</p><p className="mt-1 text-2xl font-bold">{percent}%</p><p className="text-xs text-muted-foreground">{data.progress.completed}/{data.progress.total}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">{english ? 'Required' : 'Obrigatórias'}</p><p className="mt-1 text-2xl font-bold">{data.progress.requiredCompleted}/{data.progress.requiredTotal}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">{english ? 'Deadline' : 'Prazo'}</p><p className="mt-1 font-semibold">{new Date(plan.dueAt).toLocaleDateString()}</p><p className="text-xs text-muted-foreground">{plan.template.name} · v{plan.template.version}</p></CardContent></Card></div>
      {data.nextStep ? <Card className="border-primary/35"><CardHeader><CardTitle className="flex items-center gap-2"><Compass className="h-5 w-5 text-primary" />{english ? 'Next step' : 'Próximo passo'}</CardTitle></CardHeader><CardContent><p className="font-semibold">{english ? data.nextStep.titleEn : data.nextStep.titlePt}</p><p className="mt-1 text-sm text-muted-foreground">{english ? data.nextStep.descriptionEn : data.nextStep.descriptionPt}</p><Link className="mt-3 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground" href={data.nextStep.href}>{english ? 'Open step' : 'Abrir etapa'}</Link></CardContent></Card> : null}
      <Card><CardHeader><CardTitle>{english ? 'Plan steps' : 'Etapas do plano'}</CardTitle></CardHeader><CardContent className="space-y-3">{plan.steps.map((step) => { const done = Boolean(step.completedAt); return <div key={step.id} className="grid gap-3 rounded-md border bg-background/35 p-3 md:grid-cols-[32px_1fr_auto]"><div>{done ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : <Circle className="h-5 w-5 text-primary" />}</div><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{english ? step.titleEn : step.titlePt}</p><Badge tone={step.isRequired ? 'gold' : 'blue'}>{step.isRequired ? (english ? 'Required' : 'Obrigatória') : (english ? 'Optional' : 'Opcional')}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{english ? step.descriptionEn : step.descriptionPt}</p><p className="mt-1 text-xs text-muted-foreground">{step.completionType === 'MANUAL' ? (english ? 'Manual confirmation' : 'Confirmação manual') : (english ? 'Automatic verification' : 'Verificação automática')}</p></div><div className="flex flex-wrap items-center gap-2"><Link className="inline-flex h-10 items-center rounded-md border border-white/10 bg-secondary px-4 text-sm font-semibold" href={step.href}>{english ? 'Open' : 'Abrir'}</Link>{!done && step.completionType === 'MANUAL' ? <Button disabled={complete.isPending} onClick={() => complete.mutate(step.id, { onSuccess: () => notifyToast({ title: english ? 'Step completed.' : 'Etapa concluída.', tone: 'success' }) })}>{english ? 'Mark done' : 'Marcar concluída'}</Button> : null}{done ? <span className="flex items-center gap-1 text-xs text-emerald-300"><Clock3 className="h-3.5 w-3.5" />{new Date(step.completedAt!).toLocaleDateString()}</span> : null}</div></div>; })}</CardContent></Card>
    </div>
  );
}
