import { ReactNode } from 'react';
import { Card, CardContent } from './card';

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Card>
      <CardContent className="flex min-h-24 flex-col items-center justify-center gap-2 p-4 text-center">
        <p className="font-[var(--font-cinzel)] text-lg">{title}</p>
        {children && <p className="max-w-md text-sm text-muted-foreground">{children}</p>}
      </CardContent>
    </Card>
  );
}
