import * as React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'neutral';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'neutral', ...props }, ref) => {
    const variants = {
      success: 'bg-success-bg text-success border-success/30',
      warning: 'bg-warning-bg text-warning border-warning/30',
      danger: 'bg-danger-bg text-danger border-danger/30',
      neutral: 'bg-raised text-body border-border',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-semibold font-mono uppercase tracking-wider',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';
