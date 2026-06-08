import * as React from 'react';
import { cn } from '@/lib/utils';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn('h-10 w-full min-w-0 max-w-full rounded-md border bg-background/80 px-3 text-sm text-foreground shadow-inner outline-none transition hover:border-primary/35 focus:border-primary/60 focus:ring-2 focus:ring-ring', className)}
      {...props}
    />
  ),
);
Select.displayName = 'Select';
