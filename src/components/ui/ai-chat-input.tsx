'use client';

import * as React from 'react';
import { useState } from 'react';
import { Send } from 'lucide-react';

export type AIChatInputProps = {
  /** Welcome message shown as placeholder when input is empty. Configurable in AI assistant page. */
  placeholder?: string;
  /** Callback when user sends a message. */
  onSend?: (text: string) => void;
  /** Optional class name. */
  className?: string;
  /** Disable the input. */
  disabled?: boolean;
};

/**
 * Simple AI chat input — minimal text field with send button.
 * Use the welcomeMessage from your assistant settings as the placeholder.
 */
export function AIChatInput({
  placeholder = 'Type a message...',
  onSend,
  className,
  disabled = false,
}: AIChatInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = value.trim();
    if (text && onSend) {
      onSend(text);
      setValue('');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex items-center gap-2 rounded-xl border bg-white p-2 shadow-sm ${className ?? ''}`}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 border-0 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
        aria-label={placeholder}
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="rounded-lg bg-black p-2 text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Send"
      >
        <Send className="h-4 w-4" />
      </button>
    </form>
  );
}
