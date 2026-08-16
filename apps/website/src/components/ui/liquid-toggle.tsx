"use client";

import React from 'react';
import { cn } from '@/lib/utils';

const styles = {
  switch: `relative block cursor-pointer h-6 w-[39px]
    [--c-active:#275EFE]
    [--c-success:#10B981]
    [--c-warning:#F59E0B]
    [--c-danger:#EF4444]
    [--c-active-inner:#FFFFFF]
    [--c-default:#D2D6E9]
    [--c-default-dark:#C7CBDF]
    [--c-black:#1B1B22]
    [transform:translateZ(0)]
    [-webkit-transform:translateZ(0)]
    [backface-visibility:hidden]
    [-webkit-backface-visibility:hidden]
    [perspective:1000]
    [-webkit-perspective:1000]`,
  input: `h-full w-full cursor-pointer appearance-none rounded-full
    outline-none transition-colors duration-500
    [transform:translate3d(0,0,0)]
    [-webkit-transform:translate3d(0,0,0)]`,
  svg: `pointer-events-none absolute inset-0 fill-white
    [transform:translate3d(0,0,0)]
    [-webkit-transform:translate3d(0,0,0)]`,
  circle: `transform-gpu transition-transform duration-500
    [transform:translate3d(0,0,0)]
    [-webkit-transform:translate3d(0,0,0)]
    [backface-visibility:hidden]
    [-webkit-backface-visibility:hidden]`,
  dropCircle: `transform-gpu transition-transform duration-700
    [transform:translate3d(0,0,0)]
    [-webkit-transform:translate3d(0,0,0)]`
};

const trackColors = {
  default: { on: 'bg-[#8b5cf6] hover:bg-[#7c4deb]', off: 'bg-[#4b5563] hover:bg-[#5a6472]' },
  success: { on: 'bg-[#10B981] hover:bg-[#0ea371]', off: 'bg-[#4b5563] hover:bg-[#5a6472]' },
  warning: { on: 'bg-[#F59E0B] hover:bg-[#dc8f0a]', off: 'bg-[#4b5563] hover:bg-[#5a6472]' },
  danger: { on: 'bg-[#EF4444] hover:bg-[#dc3d3d]', off: 'bg-[#4b5563] hover:bg-[#5a6472]' },
};

interface ToggleProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function Toggle({
  checked = false,
  onCheckedChange,
  className,
  variant = 'default'
}: ToggleProps) {
  const [isChecked, setIsChecked] = React.useState(checked);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsChecked(e.target.checked);
    onCheckedChange?.(e.target.checked);
  };

  return (
    <label className={cn(styles.switch, className)}>
      <input
        type="checkbox"
        checked={isChecked}
        onChange={handleChange}
        data-checked={isChecked}
        className={cn(styles.input, isChecked ? trackColors[variant].on : trackColors[variant].off)}
      />
      <svg
        viewBox="0 0 52 32"
        filter="url(#goo)"
        className={styles.svg}
      >
        <circle
          className={styles.circle}
          cx="16"
          cy="16"
          r="10"
          style={{
            transformOrigin: '16px 16px',
            transform: `translateX(${isChecked ? '12px' : '0px'}) scale(${isChecked ? '0' : '1'})`,
          }}
        />
        <circle
          className={styles.circle}
          cx="36"
          cy="16"
          r="10"
          style={{
            transformOrigin: '36px 16px',
            transform: `translateX(${isChecked ? '0px' : '-12px'}) scale(${isChecked ? '1' : '0'})`,
          }}
        />
        {isChecked && (
          <circle
            className={styles.dropCircle}
            cx="35"
            cy="-1"
            r="2.5"
          />
        )}
      </svg>
    </label>
  );
}

export function GooeyFilter() {
  return (
    <svg className="fixed w-0 h-0">
      <defs>
        <filter id="goo">
          <feGaussianBlur
            in="SourceGraphic"
            stdDeviation="2"
            result="blur"
          />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
            result="goo"
          />
          <feComposite
            in="SourceGraphic"
            in2="goo"
            operator="atop"
          />
        </filter>
      </defs>
    </svg>
  );
}
