'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Send, MessageCircle, X } from 'lucide-react';

function isLightColor(hex: string) {
  const value = hex.replace('#', '');
  if (value.length !== 6) return false;
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return L > 0.7;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 rounded-2xl bg-slate-100 px-4 py-3 shadow-sm">
      <span className="typing-dot h-2 w-2 rounded-full bg-slate-400" />
      <span className="typing-dot typing-dot-2 h-2 w-2 rounded-full bg-slate-400" />
      <span className="typing-dot typing-dot-3 h-2 w-2 rounded-full bg-slate-400" />
    </div>
  );
}

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

  useEffect(() => {
    if (!widgetId) return;
    const base = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
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
  const accentColor = isLightColor(color) ? '#000000' : '#ffffff';
  const welcome = config?.welcomeMessage || 'Hi! How can I help you today?';
  const logoUrl = config?.widgetLogoUrl?.trim() || null;
  const chatbotName = config?.chatbotName?.trim() || config?.businessName?.trim() || 'Assistant';

  return (
    <div
      ref={contentRef}
      className="flex w-full flex-col bg-white font-sans text-slate-900"
      style={{
        isolation: 'isolate',
        backgroundColor: '#ffffff',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        @keyframes typing-bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
        .typing-dot { animation: typing-bounce 1.4s ease-in-out infinite; }
        .typing-dot-2 { animation-delay: 0.2s; }
        .typing-dot-3 { animation-delay: 0.4s; }
      `}</style>
      <header
        className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-500">
            {logoUrl ? (
              <img src={logoUrl} alt={`${chatbotName} logo`} className="h-full w-full object-cover" />
            ) : (
              <MessageCircle className="h-4 w-4" strokeWidth={2} />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{chatbotName}</p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={() => window.parent?.postMessage({ type: 'spaxio-close' }, '*')}
          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-1"
        >
          <X className="h-5 w-5" strokeWidth={2} />
        </button>
      </header>
      <WidgetChat
        widgetId={widgetId!}
        welcomeMessage={welcome}
        primaryBrandColor={color}
        accentColor={accentColor}
        language={lang}
      />
      <footer className="flex items-center justify-center gap-1.5 border-t border-slate-100 px-4 py-1.5">
        <img src="/icon.png" alt="" className="h-4 w-4 shrink-0 object-contain" aria-hidden />
        <p className="text-[10px] leading-tight text-slate-400">
          Powered by Spaxio Assistant
        </p>
      </footer>
    </div>
  );
}

export default function WidgetPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center bg-white">Loading...</div>}>
      <WidgetContent />
    </Suspense>
  );
}

function WidgetChat({
  widgetId,
  welcomeMessage,
  primaryBrandColor,
  accentColor,
  language,
}: {
  widgetId: string;
  welcomeMessage: string;
  primaryBrandColor: string;
  accentColor: string;
  language: string;
}) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [input]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const base = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const res = await fetch(`${base}/api/widget/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgetId,
          conversationId,
          message: text,
          language,
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
    <>
      <div className="min-h-0 max-h-[280px] flex-shrink-0 overflow-y-auto bg-white px-4 pt-4 pb-1 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <MessageCircle className="h-4 w-4" strokeWidth={2} />
            </div>
            <p className="pt-1 text-[15px] leading-relaxed text-slate-600">
              {welcomeMessage}
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 mt-0.5">
                <MessageCircle className="h-3.5 w-3.5" strokeWidth={2} />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                msg.role === 'user'
                  ? ''
                  : 'bg-slate-100 text-slate-900'
              }`}
              style={
                msg.role === 'user'
                  ? { backgroundColor: primaryBrandColor, color: accentColor }
                  : undefined
              }
            >
              <span className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <MessageCircle className="h-3.5 w-3.5" strokeWidth={2} />
              </div>
              <TypingIndicator />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-slate-100 px-4 pt-3 pb-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex gap-2 items-end"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Type a message..."
            rows={1}
            className="min-h-[42px] max-h-[120px] flex-1 resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-offset-0 focus:border-transparent overflow-y-auto placeholder:text-slate-400"
            style={{ ['--tw-ring-color' as string]: primaryBrandColor }}
          />
          <button
            type="submit"
            disabled={loading}
            aria-label="Send"
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl transition-opacity disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-0"
            style={{
              backgroundColor: primaryBrandColor,
              color: accentColor,
              ['--tw-ring-color' as string]: primaryBrandColor,
            }}
          >
            <Send className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </form>
      </div>
    </>
  );
}
