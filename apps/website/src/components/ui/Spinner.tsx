import * as React from 'react';
import { Icons } from '../icons';
import { cn } from '../../lib/utils';

export interface SpinnerProps extends React.SVGProps<SVGSVGElement> {
  size?: 'sm' | 'default' | 'lg';
}

export const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(
  ({ className, size = 'default', ...props }, ref) => {
    const sizes = {
      sm: 'h-4 w-4',
      default: 'h-6 w-6',
      lg: 'h-8 w-8',
    };
    return (
      <Icons.Loader2
        ref={ref}
        className={cn('animate-spin text-accent', sizes[size], className)}
        {...props}
      />
    );
  }
);
Spinner.displayName = 'Spinner';
