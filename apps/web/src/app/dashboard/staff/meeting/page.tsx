'use client';

import Link from 'next/link';
import { ArrowRight, Check, Clipboard, Copy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useResolveStaffMeetingItem, useStaffMeeting } from '@/hooks/use-guild-api';
import type { OperationPriority } from '@/types/api';

const priorityTone: Record<OperationPriority, 'red' | 'gold' | 'blue'> = {
  high: 'red',
  medium: 'gold',
  low: 'blue',
};

function formatDate(value?: string): string {
  if (!value) return '';

  return new Date(value).toLocaleString('pt-BR');
}

export default function StaffMeetingPage() {
  const meeting = useStaffMeeting();
  const resolveItem = useResolveStaffMeetingItem();
  const data = meeting.data;
  const sections = data?.sections ?? [];
  const totals = sections.reduce(
    (acc, section) => {
      acc.total += section.items.length;
      acc.resolved += section.items.filter((item) => item.resolved).length;
      acc.high += section.items.filter((item) => item.priority === 'high' && !item.resolved).length;
      return acc;
    },
    { total: 0, resolved: 0, high: 0 },
  );

  const copyMarkdown = async () => {
    if (!data?.markdown || typeof navigator === 'undefined') return;

    await navigator.clipboard.writeText(data.markdown);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase text-primary">Pauta decisoria</p>
          <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">Modo reuniao de Staff</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Loot, travas, DKP, players sensiveis, bosses, comunicados e acoes ate a proxima call.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={copyMarkdown} disabled={!data?.markdown}>
          <Copy className="h-4 w-4" /> Copiar pauta
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground">Dia operacional</p>
            <p className="mt-1 text-2xl font-bold">{data?.meetingDay ?? '-'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground">Itens na pauta</p>
            <p className="mt-1 text-2xl font-bold">{totals.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground">Altas abertas</p>
            <p className="mt-1 text-2xl font-bold">{totals.high}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground">Resolvidos hoje</p>
            <p className="mt-1 text-2xl font-bold">{totals.resolved}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {sections.map((section) => {
          const openCount = section.items.filter((item) => !item.resolved).length;

          return (
            <Card key={section.key} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{section.title}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
                  </div>
                  <Badge tone={openCount > 0 ? priorityTone[section.priority] : 'muted'}>{openCount}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {section.items.length === 0 ? (
                  <p className="rounded-md border bg-background/35 p-3 text-sm text-muted-foreground">Nada pendente nesta secao.</p>
                ) : section.items.map((item) => (
                  <div key={item.meetingItemKey} className={`rounded-md border p-3 transition ${item.resolved ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-white/10 bg-background/35 hover:border-primary/30'}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={item.resolved ? 'green' : priorityTone[item.priority]}>{item.resolved ? 'resolvido' : item.priority}</Badge>
                          <p className="font-semibold leading-snug">{item.title}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        {item.createdAt ? <p className="text-xs text-muted-foreground">Referencia: {formatDate(item.createdAt)}</p> : null}
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Link href={item.href}>
                          <Button variant="secondary" className="px-3">
                            Abrir <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Button
                          type="button"
                          variant={item.resolved ? 'secondary' : 'primary'}
                          className="px-3"
                          disabled={item.resolved || resolveItem.isPending}
                          onClick={() => resolveItem.mutate({
                            meetingItemKey: item.meetingItemKey,
                            title: item.title,
                            type: item.type,
                            href: item.href,
                          })}
                        >
                          <Check className="h-3.5 w-3.5" /> Resolver
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                <Link href={section.href} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                  Ir para a fila da secao <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clipboard className="h-4 w-4" /> Markdown da pauta</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-96 overflow-auto rounded-md border bg-background/50 p-4 text-xs text-muted-foreground">{data?.markdown ?? 'Carregando pauta...'}</pre>
        </CardContent>
      </Card>
    </div>
  );
}
