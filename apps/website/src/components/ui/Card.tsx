'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverLift?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hoverLift = false, children, ...props }, ref) => {
    if (hoverLift) {
      return (
        <motion.div
          ref={ref}
          className={cn(
            'bg-raised border border-border rounded-lg p-6 hover:border-border-hover transition-colors duration-200',
            className
          )}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          {...(props as React.ComponentPropsWithoutRef<typeof motion.div>)}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn('bg-raised border border-border rounded-lg p-6', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';
