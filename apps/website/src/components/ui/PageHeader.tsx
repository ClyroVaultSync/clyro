import React from 'react';
import { cn } from '../../lib/utils';

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  titleClassName?: string;
}

export function PageHeader({ title, subtitle, titleClassName, className, children, ...props }: PageHeaderProps) {
  return (
    <div className={cn("mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4", className)} {...props}>
      <div>
        <h1 className={cn("text-3xl font-bold tracking-tight text-heading", titleClassName)}>{title}</h1>
        {subtitle && <p className="mt-2 text-body max-w-2xl">{subtitle}</p>}
      </div>
      {children && (
        <div className="shrink-0 flex items-center gap-3">
          {children}
        </div>
      )}
    </div>
  );
}
