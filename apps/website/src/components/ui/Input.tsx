import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border bg-base px-3 py-2 text-sm text-heading transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-body focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
          error
            ? 'border-danger focus:ring-danger'
            : 'border-border focus:border-accent focus:ring-accent/20',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
