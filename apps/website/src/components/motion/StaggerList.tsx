'use client';

import * as React from 'react';
import { motion, Variants } from 'framer-motion';

export interface StaggerListProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}

export const StaggerList: React.FC<StaggerListProps> = ({ children, className, staggerDelay = 0.05 }) => {
  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1,
      }
    }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const StaggerItem: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  const item: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } }
  };

  return (
    <motion.div variants={item} className={className}>
      {children}
    </motion.div>
  );
};
