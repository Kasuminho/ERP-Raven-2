'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AuditLog } from '@/types/api';

function actorName(log: AuditLog): string {
  return log.actor?.discordNickname || log.actor?.discordUsername || log.actorId || 'Sistema';
}

export function AuditTimeline({ logs }: { logs: AuditLog[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline de auditoria</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {logs.map((log) => (
          <div key={log.id} className="rounded-md border bg-background/35 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{log.action}</p>
              <p className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</p>
            </div>
            <p className="mt-1 text-muted-foreground">
              {actorName(log)} em {log.targetType}{log.targetId ? ` #${log.targetId.slice(0, 8)}` : ''}
            </p>
          </div>
        ))}
        {logs.length === 0 && <p className="text-sm text-muted-foreground">Sem eventos recentes.</p>}
      </CardContent>
    </Card>
  );
}
