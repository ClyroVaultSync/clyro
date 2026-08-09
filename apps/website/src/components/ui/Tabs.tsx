'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface TabItem {
  id: string;
  label: string;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className }) => {
  return (
    <div className={cn('flex space-x-1 border-b border-border', className)}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative px-4 py-3 text-sm font-mono tracking-wider uppercase transition-colors',
              isActive ? 'text-accent' : 'text-body hover:text-heading'
            )}
          >
            {tab.label}
            {isActive && (
              <motion.div
                layoutId="tabs-underline"
                className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-accent"
                initial={false}
                transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
