'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AIChatMessage } from '@/components/ui/ai-chat';
import { Loader2 } from 'lucide-react';
import type { SessionState } from '@/lib/ai-pages/types';

const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

type Props = {
  slug: string;
  handoffToken?: string;
};

export function AiPageClient({ slug, handoffToken }: Props) {
  const [config, setConfig] = useState<{
    title: string;
    description: string | null;
    welcome_message: string | null;
    intro_copy: string | null;
    trust_copy: string | null;
    page_type: string;
    intake_schema?: { key: string; label: string; required?: boolean }[];
    handoff_context?: { intro_message?: string; context_snippet?: Record<string, unknown> };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [completionPercent, setCompletionPercent] = useState(0);

  useEffect(() => {
    const url = handoffToken
      ? `${baseUrl}/api/ai-page/config?slug=${encodeURIComponent(slug)}&handoff=${encodeURIComponent(handoffToken)}`
      : `${baseUrl}/api/ai-page/config?slug=${encodeURIComponent(slug)}`;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('Page not found');
        return r.json();
      })
      .then((d) => setConfig(d))
      .catch(() => setError('Page not found or not published'));
  }, [slug, handoffToken]);

  useEffect(() => {
    if (!config || runId) return;
    const body: { slug: string; handoff_token?: string } = { slug };
    if (handoffToken) body.handoff_token = handoffToken;
    fetch(`${baseUrl}/api/ai-page/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setRunId(d.run_id);
        setConversationId(d.conversation_id);
      })
      .catch((err) => setError(err.message || 'Failed to start session'));
  }, [config, slug, handoffToken, runId]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!runId || !conversationId || loading) return;
      setInput('');
      setMessages((m) => [...m, { role: 'user', content: text }]);
      setLoading(true);
      try {
        const res = await fetch(`${baseUrl}/api/ai-page/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            run_id: runId,
            conversation_id: conversationId,
            message: text,
            language: 'en',
          }),
        });
        const data = await res.json();
        if (data.reply) {
          setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
        }
        if (data.session_state) setSessionState(data.session_state);
        if (typeof data.completion_percent === 'number') setCompletionPercent(data.completion_percent);
      } finally {
        setLoading(false);
      }
    },
    [runId, conversationId, loading]
  );

  if (error) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-12">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const welcome =
    config.handoff_context?.intro_message ||
    config.intro_copy ||
    config.welcome_message ||
    'How can I help you today?';

  const aiMessages: AIChatMessage[] =
    messages.length === 0
      ? [{ sender: 'ai', text: welcome }]
      : messages.map((m) => ({
          sender: m.role === 'user' ? ('user' as const) : ('ai' as const),
          text: m.content,
        }));

  return (
    <div className="flex min-h-screen flex-col bg-transparent">
      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
          {aiMessages.map((msg, i) => (
            <div
              key={i}
              className={
                msg.sender === 'user'
                  ? 'ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl bg-foreground px-4 py-2 text-sm text-background sm:max-w-[70%]'
                  : 'mr-auto max-w-[85%] whitespace-pre-wrap rounded-2xl bg-muted px-4 py-2 text-sm text-foreground sm:max-w-[70%]'
              }
            >
              {msg.text}
            </div>
          ))}
          {loading && (
            <div className="mr-auto max-w-[85%] rounded-2xl bg-muted px-4 py-2 text-sm text-muted-foreground sm:max-w-[70%]">
              Thinking…
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 w-full border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-end gap-2 px-3 py-3 sm:px-6">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message…"
            rows={1}
            className="min-h-[44px] max-h-[160px] flex-1 resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const text = input.trim();
                if (text) sendMessage(text);
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              const text = input.trim();
              if (text) sendMessage(text);
            }}
            disabled={loading || input.trim().length === 0}
            className="h-[44px] rounded-xl bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
