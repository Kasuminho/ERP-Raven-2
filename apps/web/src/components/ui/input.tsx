import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'tap-target h-10 w-full rounded-md border border-white/10 bg-background/78 px-3 text-sm text-foreground shadow-inner outline-none ring-offset-background transition placeholder:text-muted-foreground hover:border-primary/35 focus:border-primary/60 focus:ring-2 focus:ring-ring sm:h-10',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
