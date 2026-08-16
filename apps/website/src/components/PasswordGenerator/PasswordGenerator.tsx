'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Card } from '../ui/Card';
import { Icons } from '../icons';
import { cn } from '../../lib/utils';
import { Toggle, GooeyFilter } from '../ui/liquid-toggle';

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{}?';
const AMBIGUOUS = /[il1LoO0]/g;

const MIN_LENGTH = 8;
const MAX_LENGTH = 64;

// Rejection-sampled random int in [0, max) — avoids the modulo bias a plain
// `Math.random() % max` would introduce, since this feeds a password generator.
function secureRandomInt(max: number): number {
  const arr = new Uint32Array(1);
  const limit = Math.floor(0xffffffff / max) * max;
  let value: number;
  do {
    crypto.getRandomValues(arr);
    value = arr[0];
  } while (value >= limit);
  return value % max;
}

function shuffle(chars: string[]): string[] {
  const result = [...chars];
  for (let i = result.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

interface Options {
  length: number;
  useUpper: boolean;
  useLower: boolean;
  useNumbers: boolean;
  useSymbols: boolean;
  excludeAmbiguous: boolean;
}

function generatePassword(options: Options): { password: string; poolSize: number } {
  const rawPools: string[] = [];
  if (options.useUpper) rawPools.push(UPPER);
  if (options.useLower) rawPools.push(LOWER);
  if (options.useNumbers) rawPools.push(NUMBERS);
  if (options.useSymbols) rawPools.push(SYMBOLS);

  let pools = rawPools
    .map((pool) => (options.excludeAmbiguous ? pool.replace(AMBIGUOUS, '') : pool))
    .filter((pool) => pool.length > 0);

  // The liquid-toggle switches have no `disabled` state, so nothing stops every
  // category from being switched off at once — fall back rather than emit ''.
  if (pools.length === 0) pools = [LOWER, NUMBERS];

  const fullPool = pools.join('');
  const chars: string[] = pools.map((pool) => pool[secureRandomInt(pool.length)]);
  while (chars.length < options.length) {
    chars.push(fullPool[secureRandomInt(fullPool.length)]);
  }

  return { password: shuffle(chars).slice(0, options.length).join(''), poolSize: fullPool.length };
}

const STRENGTH_LEVELS = [
  { label: 'Weak', bar: 'bg-danger', text: 'text-danger' },
  { label: 'Fair', bar: 'bg-warning', text: 'text-warning' },
  { label: 'Good', bar: 'bg-accent', text: 'text-accent' },
  { label: 'Strong', bar: 'bg-success', text: 'text-success' },
];

function getStrength(length: number, poolSize: number) {
  const entropyBits = poolSize > 1 ? length * Math.log2(poolSize) : 0;
  if (entropyBits < 40) return { ...STRENGTH_LEVELS[0], segments: 1 };
  if (entropyBits < 60) return { ...STRENGTH_LEVELS[1], segments: 2 };
  if (entropyBits < 80) return { ...STRENGTH_LEVELS[2], segments: 3 };
  return { ...STRENGTH_LEVELS[3], segments: 4 };
}

function charClass(char: string): string {
  if (NUMBERS.includes(char)) return 'text-accent';
  if (SYMBOLS.includes(char)) return 'text-body';
  return 'text-heading';
}

interface OptionRowProps {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function OptionRow({ label, hint, checked, onChange }: OptionRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5 transition-colors duration-200 hover:border-border-hover">
      <span className="text-sm text-heading">
        {label} <span className="text-xs text-body">{hint}</span>
      </span>
      <Toggle checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function PasswordGenerator() {
  const [length, setLength] = React.useState(16);
  const [useUpper, setUseUpper] = React.useState(true);
  const [useLower, setUseLower] = React.useState(true);
  const [useNumbers, setUseNumbers] = React.useState(true);
  const [useSymbols, setUseSymbols] = React.useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = React.useState(false);

  const [password, setPassword] = React.useState('');
  const [poolSize, setPoolSize] = React.useState(0);
  const [genId, setGenId] = React.useState(0);
  const [copied, setCopied] = React.useState(false);
  const copyTimeout = React.useRef<ReturnType<typeof setTimeout>>();

  const regenerate = React.useCallback(() => {
    const result = generatePassword({ length, useUpper, useLower, useNumbers, useSymbols, excludeAmbiguous });
    setPassword(result.password);
    setPoolSize(result.poolSize);
    setGenId((id) => id + 1);
  }, [length, useUpper, useLower, useNumbers, useSymbols, excludeAmbiguous]);

  React.useEffect(() => {
    regenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [length, useUpper, useLower, useNumbers, useSymbols, excludeAmbiguous]);

  React.useEffect(() => () => clearTimeout(copyTimeout.current), []);

  const handleCopy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      clearTimeout(copyTimeout.current);
      copyTimeout.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable — nothing to fall back to safely; user can select manually.
    }
  };

  const strength = getStrength(length, poolSize);

  return (
    <Card className="w-full max-w-lg text-left">
      <GooeyFilter />
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-base px-4 py-3.5">
          <div
            aria-live="polite"
            aria-label="Generated password"
            data-lpignore="true"
            data-1p-ignore="true"
            data-bwignore="true"
            data-dashlane-ignore="true"
            data-form-type="other"
            className="min-w-0 flex-1 overflow-hidden break-all font-mono text-lg leading-snug"
          >
            {password.split('').map((char, i) => (
              <motion.span
                key={`${genId}-${i}`}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: i * 0.012, ease: 'easeOut' }}
                className={charClass(char)}
              >
                {char}
              </motion.span>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <motion.button
              type="button"
              onClick={regenerate}
              title="Generate new password"
              aria-label="Generate new password"
              animate={{ rotate: genId * 180 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="rounded-md p-2 text-body transition-colors duration-200 hover:bg-raised hover:text-heading"
            >
              <Icons.RefreshCw className="h-4 w-4" />
            </motion.button>
            <button
              type="button"
              onClick={handleCopy}
              title="Copy password"
              aria-label="Copy password"
              className="relative rounded-md p-2 text-body transition-colors duration-200 hover:bg-raised hover:text-heading"
            >
              <AnimatePresence mode="wait" initial={false}>
                {copied ? (
                  <motion.span
                    key="check"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="block"
                  >
                    <Icons.Check className="h-4 w-4 text-success" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="copy"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="block"
                  >
                    <Icons.Copy className="h-4 w-4" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-body">Strength</span>
            <span className={cn('text-xs font-semibold', strength.text)}>{strength.label}</span>
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className={cn('h-1.5 flex-1 rounded-full', i < strength.segments ? strength.bar : 'bg-border')}
                animate={{ opacity: i < strength.segments ? 1 : 0.6 }}
                transition={{ duration: 0.25 }}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="pw-length" className="text-sm text-heading">
              Length
            </label>
            <span className="font-mono text-sm text-[#8b5cf6]">{length}</span>
          </div>
          <input
            id="pw-length"
            type="range"
            min={MIN_LENGTH}
            max={MAX_LENGTH}
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="w-full accent-[#8b5cf6]"
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <OptionRow label="Uppercase" hint="A-Z" checked={useUpper} onChange={setUseUpper} />
          <OptionRow label="Lowercase" hint="a-z" checked={useLower} onChange={setUseLower} />
          <OptionRow label="Numbers" hint="0-9" checked={useNumbers} onChange={setUseNumbers} />
          <OptionRow label="Symbols" hint="!@#$" checked={useSymbols} onChange={setUseSymbols} />
        </div>

        <OptionRow
          label="Exclude ambiguous characters"
          hint="il1Lo0O"
          checked={excludeAmbiguous}
          onChange={setExcludeAmbiguous}
        />
      </div>
    </Card>
  );
}
