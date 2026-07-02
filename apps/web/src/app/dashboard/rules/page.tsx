'use client';

import { ScrollText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGuildRules } from '@/hooks/use-staff-operations-api';

export default function RulesPage() {
  const rules = useGuildRules();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">Fonte da verdade</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">Regras da guild</h1>
        <p className="mt-2 text-sm text-muted-foreground">Resumo das regras operacionais que o sistema usa para DKP, leiloes, interesses, presenca e Daoshi.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {(rules.data?.sections ?? []).map((section) => (
          <Card key={section.key}>
            <CardHeader><CardTitle className="flex items-center gap-2"><ScrollText className="h-5 w-5 text-primary" /> {section.title}</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {section.bullets.map((bullet) => <li key={bullet} className="rounded-md border bg-background/35 p-3">{bullet}</li>)}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
