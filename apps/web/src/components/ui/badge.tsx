import * as React from 'react';
import { cn } from '@/lib/utils';

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: 'gold' | 'green' | 'red' | 'blue' | 'muted';
};

export function Badge({ className, tone = 'muted', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border px-2 py-1 text-xs font-semibold uppercase leading-none',
        tone === 'gold' && 'border-primary/45 bg-primary/15 text-primary',
        tone === 'green' && 'border-emerald-400/35 bg-emerald-500/15 text-emerald-200',
        tone === 'red' && 'border-red-400/35 bg-red-500/15 text-red-200',
        tone === 'blue' && 'border-cyan-400/35 bg-cyan-500/15 text-cyan-200',
        tone === 'muted' && 'border-border bg-muted text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}
