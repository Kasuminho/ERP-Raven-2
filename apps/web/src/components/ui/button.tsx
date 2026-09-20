import * as React from 'react';
import { cn } from '@/lib/utils';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'tap-target inline-flex items-center justify-center gap-2 rounded-md font-semibold shadow-sm transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none disabled:opacity-50',
        size === 'sm' && 'h-8 px-3 text-xs sm:h-8',
        size === 'md' && 'h-10 px-4 text-sm sm:h-10',
        size === 'lg' && 'h-12 px-6 text-base sm:h-12',
        variant === 'primary' && 'bg-primary text-primary-foreground shadow-primary/10 hover:bg-primary/90 hover:shadow-[0_0_28px_hsl(var(--primary)/0.14)]',
        variant === 'secondary' && 'border border-cyan-400/25 bg-secondary/80 text-secondary-foreground hover:border-cyan-300/45 hover:bg-secondary',
        variant === 'ghost' && 'bg-transparent text-foreground hover:bg-muted/85',
        variant === 'danger' && 'bg-accent text-accent-foreground hover:bg-accent/90 hover:shadow-[0_0_28px_hsl(var(--accent)/0.16)]',
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
