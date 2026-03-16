'use client';

import { useState, useEffect, useCallback } from 'react';
import AIChatCard, { type AIChatMessage } from '@/components/ui/ai-chat';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Loader2 } from 'lucide-react';
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
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const handleComplete = useCallback(async () => {
    if (!runId || submitting || submitted) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${baseUrl}/api/ai-page/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_id: runId }),
      });
      const data = await res.json();
      if (data.success) setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }, [runId, submitting, submitted]);

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

  const collected = sessionState?.collected_fields ?? {};
  const hasCollected = Object.keys(collected).length > 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-6 md:py-8">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{config.title}</h1>
        {config.description && (
          <p className="mt-2 text-muted-foreground">{config.description}</p>
        )}
        {config.trust_copy && (
          <p className="mt-1 text-sm text-muted-foreground">{config.trust_copy}</p>
        )}
      </header>

      <div className="flex flex-1 flex-col gap-6 lg:flex-row">
        <div className="flex-1">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <AIChatCard
                className="min-h-[420px]"
                primaryBrandColor="#0f172a"
                chatbotName={config.title}
                welcomeMessage={welcome}
                messages={aiMessages}
                onSend={sendMessage}
                isTyping={loading}
                input={input}
                onInputChange={setInput}
                placeholder="Type your message..."
                ariaLabelSend="Send"
              />
            </CardContent>
          </Card>

          {hasCollected && completionPercent >= 50 && !submitted && (
            <div className="mt-4 flex justify-center">
              <Button
                onClick={handleComplete}
                disabled={submitting}
                size="lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit and finish'
                )}
              </Button>
            </div>
          )}

          {submitted && (
            <div className="mt-4 flex flex-col items-center gap-2 rounded-lg border bg-muted/30 p-4">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
              <p className="font-medium">Thank you. Your information has been submitted.</p>
              <p className="text-sm text-muted-foreground">We&apos;ll be in touch soon.</p>
            </div>
          )}
        </div>

        {hasCollected && (
          <aside className="w-full lg:w-80">
            <Card>
              <CardContent className="pt-4">
                <h3 className="mb-3 font-semibold">Summary</h3>
                <div className="space-y-2 text-sm">
                  {Object.entries(collected).map(([key, value]) =>
                    value != null && String(value).trim() ? (
                      <div key={key}>
                        <span className="text-muted-foreground">
                          {key.replace(/_/g, ' ')}:
                        </span>{' '}
                        {String(value).slice(0, 200)}
                      </div>
                    ) : null
                  )}
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  Progress: {completionPercent}%
                </div>
              </CardContent>
            </Card>
          </aside>
        )}
      </div>
    </div>
  );
}
