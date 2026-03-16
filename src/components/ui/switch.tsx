'use client';

import * as React from 'react';

type SwitchProps = {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  'aria-label'?: string;
};

export function Switch({ checked = false, onCheckedChange, disabled, 'aria-label': ariaLabel }: SwitchProps) {
  const handleToggle = () => {
    if (disabled) return;
    onCheckedChange?.(!checked);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={handleToggle}
      className={[
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors',
        checked ? 'border-primary bg-primary' : 'border-muted-foreground/30 bg-muted',
        disabled ? 'cursor-not-allowed opacity-60' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span
        className={[
          'inline-block h-4 w-4 rounded-full bg-background shadow transition-transform',
          checked ? 'translate-x-4' : 'translate-x-1',
        ]
          .filter(Boolean)
          .join(' ')}
      />
    </button>
  );
}

