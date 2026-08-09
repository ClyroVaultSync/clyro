'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Icons } from '../icons';

export interface AlertProps {
  isVisible: boolean;
  onClose?: () => void;
  title: string;
  description?: string;
  variant?: 'success' | 'danger' | 'warning' | 'neutral';
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  isVisible,
  onClose,
  title,
  description,
  variant = 'neutral',
  className
}) => {
  const variants = {
    success: 'bg-success-bg border-success text-success',
    danger: 'bg-danger-bg border-danger text-danger',
    warning: 'bg-warning-bg border-warning text-warning',
    neutral: 'bg-raised border-border text-heading',
  };

  const IconMap = {
    success: Icons.CheckCircle2,
    danger: Icons.AlertTriangle,
    warning: Icons.AlertTriangle,
    neutral: Icons.Info,
  };

  const Icon = IconMap[variant];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={cn(
            'flex items-start gap-3 rounded-md border p-4 shadow-sm',
            variants[variant],
            className
          )}
          role="alert"
        >
          <Icon className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h5 className="font-semibold">{title}</h5>
            {description && <div className="mt-1 text-sm opacity-90">{description}</div>}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="shrink-0 p-1 rounded-md opacity-70 hover:opacity-100 hover:bg-black/10 focus:outline-none"
              aria-label="Close"
            >
              <Icons.X className="h-4 w-4" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
