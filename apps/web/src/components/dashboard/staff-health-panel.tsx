'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { StaffHealthSummary } from '@/types/api';

export function StaffHealthPanel({ health }: { health?: StaffHealthSummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Saude do sistema</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {(health?.checks ?? []).map((check) => (
          <div key={check.key} className="flex items-start justify-between gap-3 rounded-md border bg-background/35 p-3">
            <div className="flex gap-3">
              {check.ready ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" /> : <XCircle className="mt-0.5 h-4 w-4 text-red-300" />}
              <div>
                <p className="font-semibold">{check.label}</p>
                <p className="text-sm text-muted-foreground">{check.detail}</p>
              </div>
            </div>
            <Badge tone={check.ready ? 'green' : 'red'}>{check.ready ? 'OK' : 'ALERTA'}</Badge>
          </div>
        ))}
        {!health && <p className="text-sm text-muted-foreground">Carregando checagens...</p>}
      </CardContent>
    </Card>
  );
}

