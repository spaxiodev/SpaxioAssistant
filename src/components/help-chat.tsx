'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Message = { role: 'user' | 'assistant'; content: string };

export function HelpChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [open, messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const userMessage: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    try {
      const res = await fetch('/api/help-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages,
        }),
      });
      const data = await res.json();
      const reply = data.reply ?? 'Sorry, something went wrong. Please try again.';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Unable to reach the help service. Please try again in a moment.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open help chat"
        className={cn(
          'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
          open ? 'pointer-events-none scale-0 opacity-0' : 'bg-primary text-primary-foreground'
        )}
      >
        <MessageCircle className="h-7 w-7" />
      </button>

      {/* Chat panel */}
      <div
        className={cn(
          'fixed bottom-6 right-6 z-50 flex w-[380px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xl transition-all duration-200',
          open ? 'h-[480px] opacity-100' : 'pointer-events-none h-0 opacity-0'
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <span className="font-semibold">Help</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            aria-label="Close chat"
            className="h-9 w-9"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div
          ref={listRef}
          className="flex-1 space-y-3 overflow-y-auto p-4"
        >
          {messages.length === 0 && (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <div className="max-w-[85%] rounded-2xl bg-muted px-4 py-2.5 text-sm">
                  <p className="font-medium text-foreground">Welcome!</p>
                  <p className="mt-1 text-muted-foreground">
                    Ask how to use the dashboard, install the widget, set up the AI (AI Setup Assistant), manage leads, inbox, bookings, billing, widget languages, or anything about Spaxio Assistant. I only explain things you have access to on your plan. When you're done, close the chat with the X above.
                  </p>
                </div>
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                'flex',
                m.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                )}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                Thinking…
              </div>
            </div>
          )}
        </div>
        <div className="shrink-0 border-t border-border p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for help..."
              className="flex-1"
              disabled={loading}
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
