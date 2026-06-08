import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-md border bg-background/80 px-3 text-sm text-foreground shadow-inner outline-none ring-offset-background transition placeholder:text-muted-foreground hover:border-primary/35 focus:border-primary/60 focus:ring-2 focus:ring-ring',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
