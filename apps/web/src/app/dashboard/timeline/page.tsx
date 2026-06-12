'use client';

import { Activity, Clock3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useMyHistory } from '@/hooks/use-guild-api';
import { useLocaleStore } from '@/store/locale-store';

const labels = {
  pt: {
    eyebrow: 'Historico do player',
    title: 'Minha timeline',
    help: 'Tudo que aconteceu com seu personagem dentro do sistema: DKP, drops, presenca, leiloes, pedidos, codex, progresso e Daoshi.',
    empty: 'Ainda nao tem historico registrado.',
  },
  en: {
    eyebrow: 'Player history',
    title: 'My timeline',
    help: 'Everything that happened to your character in the system: DKP, drops, attendance, auctions, requests, codex, progress, and Daoshi.',
    empty: 'No history has been registered yet.',
  },
  es: {
    eyebrow: 'Historial del player',
    title: 'Mi timeline',
    help: 'Todo lo que paso con tu personaje en el sistema: DKP, drops, presencia, subastas, pedidos, codex, progreso y Daoshi.',
    empty: 'Todavia no hay historial registrado.',
  },
} as const;

export default function TimelinePage() {
  const locale = useLocaleStore((state) => state.locale);
  const copy = labels[locale];
  const history = useMyHistory();
  const timeline = history.data?.timeline ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">{copy.eyebrow}</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{copy.title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{copy.help}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-primary" /> Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {timeline.map((entry) => (
            <div key={`${entry.type}-${entry.id}`} className="grid gap-3 rounded-md border bg-background/35 p-3 text-sm md:grid-cols-[160px_1fr]">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Activity className="h-4 w-4 text-primary" />
                {new Date(entry.createdAt).toLocaleString()}
              </div>
              <div>
                <p className="font-semibold">{entry.title}</p>
                <p className="text-muted-foreground">{entry.description}</p>
                <p className="mt-1 text-xs uppercase text-primary">{entry.type}</p>
              </div>
            </div>
          ))}
          {!history.isLoading && timeline.length === 0 && <EmptyState title={copy.empty}>{copy.help}</EmptyState>}
        </CardContent>
      </Card>
    </div>
  );
}
