'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AIChatCard, { type AIChatMessage } from '@/components/ui/ai-chat';

function WidgetContent() {
  const searchParams = useSearchParams();
  const widgetId = searchParams.get('widgetId');
  const lang = searchParams.get('lang') || 'en';
  const contentRef = useRef<HTMLDivElement>(null);
  const [config, setConfig] = useState<{
    welcomeMessage?: string;
    chatbotName?: string;
    primaryBrandColor?: string;
    businessName?: string | null;
    widgetLogoUrl?: string | null;
  } | null>(null);

  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    if (!widgetId) return;
    const base = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || '');
    if (!base) return;
    fetch(`${base}/api/widget/config?widgetId=${encodeURIComponent(widgetId)}`)
      .then((r) => r.json())
      .then((d) => setConfig(d))
      .catch(() => setConfig({}));
  }, [widgetId]);

  useEffect(() => {
    if (!widgetId) return;
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'spaxio-init' && e.data.widgetId === widgetId) {
        (window as unknown as { __spaxioReady?: boolean }).__spaxioReady = true;
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [widgetId]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const sendHeight = () => {
      const height = el.scrollHeight;
      window.parent?.postMessage?.({ type: 'spaxio-widget-height', height }, '*');
    };
    sendHeight();
    const t = setTimeout(sendHeight, 150);
    const ro = new ResizeObserver(sendHeight);
    ro.observe(el);
    return () => {
      clearTimeout(t);
      ro.disconnect();
    };
  }, [config]);

  const color = config?.primaryBrandColor || '#0f172a';
  const welcome = config?.welcomeMessage || 'Hi! How can I help you today?';
  const chatbotName = config?.chatbotName?.trim() || config?.businessName?.trim() || 'Assistant';

  const aiMessages: AIChatMessage[] =
    messages.length === 0
      ? [{ sender: 'ai', text: welcome }]
      : messages.map((m) => ({
          sender: m.role === 'user' ? ('user' as const) : ('ai' as const),
          text: m.content,
        }));

  async function send(text: string) {
    if (!text.trim() || !widgetId || loading) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: text.trim() }]);
    setLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const res = await fetch(`${base}/api/widget/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgetId,
          conversationId,
          message: text.trim(),
          language: lang,
        }),
      });
      const data = await res.json();
      if (data.conversationId) setConversationId(data.conversationId);
      if (data.reply) {
        setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
      }
      if (data.error) {
        setMessages((m) => [...m, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      ref={contentRef}
      className="flex w-full flex-col items-center justify-start font-sans"
      style={{ isolation: 'isolate', boxSizing: 'border-box' }}
    >
      <AIChatCard
        className="w-full max-w-[360px] h-[460px] min-h-[460px] shrink-0"
        primaryBrandColor={color}
        chatbotName={chatbotName}
        welcomeMessage={welcome}
        messages={aiMessages}
        onSend={send}
        isTyping={loading}
        input={input}
        onInputChange={setInput}
        placeholder="Type a message..."
        onClose={() => window.parent?.postMessage({ type: 'spaxio-close' }, '*')}
        showPoweredBy
      />
    </div>
  );
}

export default function WidgetPage() {
  return (
    <Suspense fallback={<div className="flex h-full min-h-[460px] items-center justify-center bg-black/90 text-white">Loading...</div>}>
      <WidgetContent />
    </Suspense>
  );
}
