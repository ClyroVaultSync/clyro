import * as React from 'react';
import { cn } from '../../lib/utils';
import { Icons } from '../icons';

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  error?: string;
  id: string;
}

export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ className, label, error, id, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('flex flex-col gap-1.5 w-full', className)} {...props}>
        <label htmlFor={id} className="text-sm font-medium text-heading">
          {label}
        </label>
        {children}
        {error && (
          <div className="flex items-center gap-1.5 text-sm text-danger mt-0.5">
            <Icons.AlertTriangle className="h-3.5 w-3.5" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }
);
FormField.displayName = 'FormField';
