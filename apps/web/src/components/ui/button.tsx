import * as React from 'react';
import { cn } from '@/lib/utils';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none disabled:opacity-50',
        variant === 'primary' && 'bg-primary text-primary-foreground shadow-primary/10 hover:bg-primary/90',
        variant === 'secondary' && 'border border-cyan-400/25 bg-secondary/80 text-secondary-foreground hover:bg-secondary',
        variant === 'ghost' && 'bg-transparent text-foreground hover:bg-muted',
        variant === 'danger' && 'bg-accent text-accent-foreground hover:bg-accent/90',
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
