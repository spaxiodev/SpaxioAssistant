'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AIChatCard, { type AIChatMessage } from '@/components/ui/ai-chat';
import { WidgetVoiceUI } from '@/components/widget-voice-ui';
import { getWidgetTranslation, normalizeLocale } from '@/lib/widget/translations';
import type { CustomTranslations } from '@/lib/widget/translations';

type WidgetConfig = {
  welcomeMessage?: string;
  chatbotName?: string;
  primaryBrandColor?: string;
  businessName?: string | null;
  widgetLogoUrl?: string | null;
  defaultLanguage?: string;
  supportedLanguages?: string[];
  autoDetectWebsiteLanguage?: boolean;
  fallbackLanguage?: string;
  matchAIResponseToWebsiteLanguage?: boolean;
  showLanguageSwitcher?: boolean;
  customTranslations?: CustomTranslations | null;
};

function WidgetContent() {
  const searchParams = useSearchParams();
  const widgetId = searchParams.get('widgetId');
  const initialLang = searchParams.get('lang') || 'en';
  const contentRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'chat' | 'voice'>('chat');
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  /** Active UI/API language: from URL, then postMessage, or manual override. */
  const [activeLocale, setActiveLocale] = useState(() => normalizeLocale(initialLang));
  /** Manual override from language switcher (session-only). */
  const [manualLanguageOverride, setManualLanguageOverride] = useState<string | null>(null);

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

  // Live language switching: listen for spaxio-lang-change from embed script
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'spaxio-init' && e.data.widgetId === widgetId) {
        (window as unknown as { __spaxioReady?: boolean }).__spaxioReady = true;
      }
      if (e.data?.type === 'spaxio-lang-change' && typeof e.data.language === 'string') {
        const next = normalizeLocale(e.data.language);
        setActiveLocale((prev) => (prev === next ? prev : next));
        // Do not clear manualLanguageOverride; parent may be syncing after setLanguage()
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [widgetId]);

  // Effective locale: manual override wins, then active (from URL/postMessage)
  const effectiveLocale = manualLanguageOverride
    ? normalizeLocale(manualLanguageOverride)
    : activeLocale;
  const supportedLangs = config?.supportedLanguages?.length
    ? config.supportedLanguages
    : ['en', 'fr', 'es', 'de', 'pt', 'it'];
  const defaultLang = config?.defaultLanguage ?? 'en';
  const fallbackLang = config?.fallbackLanguage ?? 'en';
  const resolvedLocale = supportedLangs.includes(effectiveLocale)
    ? effectiveLocale
    : supportedLangs.includes(defaultLang)
      ? defaultLang
      : supportedLangs[0] ?? 'en';

  const t = useCallback(
    (key: Parameters<typeof getWidgetTranslation>[1]) =>
      getWidgetTranslation(resolvedLocale, key, config?.customTranslations),
    [resolvedLocale, config?.customTranslations]
  );

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const sendHeight = () => {
      const height = el.scrollHeight;
      window.parent?.postMessage?.({ type: 'spaxio-widget-height', height }, '*');
    };
    sendHeight();
    const tId = setTimeout(sendHeight, 150);
    const ro = new ResizeObserver(sendHeight);
    ro.observe(el);
    return () => {
      clearTimeout(tId);
      ro.disconnect();
    };
  }, [config, resolvedLocale]);

  const color = config?.primaryBrandColor || '#0f172a';
  const baseUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL || '');
  const welcome =
    config?.welcomeMessage?.trim() ||
    getWidgetTranslation(resolvedLocale, 'welcomeMessage', config?.customTranslations);
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
          language: resolvedLocale,
          detectedLocale: activeLocale,
          activeLocale: resolvedLocale,
          supportedLanguages: supportedLangs,
          pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
          browserLocale:
            typeof navigator !== 'undefined' && navigator.language ? navigator.language : undefined,
          manualLanguageOverride: manualLanguageOverride ?? undefined,
        }),
      });
      const data = await res.json();
      if (data.conversationId) setConversationId(data.conversationId);
      if (data.reply) {
        setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
      }
      if (data.error) {
        setMessages((m) => [
          ...m,
          { role: 'assistant', content: data.reply || t('errorMessage') },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }

  const handleLanguageSelect = useCallback((lang: string) => {
    const next = normalizeLocale(lang);
    setManualLanguageOverride(next);
    setActiveLocale(next);
    window.parent?.postMessage?.({ type: 'spaxio-lang-change', language: next }, '*');
  }, []);

  return (
    <div
      ref={contentRef}
      className="flex w-full flex-col items-center justify-start font-sans"
      style={{ isolation: 'isolate', boxSizing: 'border-box' }}
    >
      {mode === 'voice' ? (
        <div className="w-full max-w-[360px] shrink-0">
          <div className="mb-2 flex rounded-lg border border-border bg-muted/30 p-1">
            <button
              type="button"
              onClick={() => setMode('chat')}
              className="flex-1 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {t('chatTab')}
            </button>
            <button
              type="button"
              onClick={() => setMode('voice')}
              className="flex-1 rounded-md bg-background px-2 py-1 text-sm font-medium shadow"
            >
              {t('voiceTab')}
            </button>
          </div>
          <WidgetVoiceUI
            widgetId={widgetId!}
            primaryBrandColor={color}
            chatbotName={chatbotName}
            onClose={() => window.parent?.postMessage({ type: 'spaxio-close' }, '*')}
            showPoweredBy
            baseUrl={baseUrl}
            ariaLabelClose={t('close')}
            poweredByText={t('poweredBy')}
          />
        </div>
      ) : (
        <>
          <div className="mb-2 flex w-full max-w-[360px] items-center gap-2">
            <div className="flex flex-1 rounded-lg border border-border bg-muted/30 p-1">
              <button
                type="button"
                onClick={() => setMode('chat')}
                className="flex-1 rounded-md bg-background px-2 py-1 text-sm font-medium shadow"
              >
                {t('chatTab')}
              </button>
              <button
                type="button"
                onClick={() => setMode('voice')}
                className="flex-1 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                {t('voiceTab')}
              </button>
            </div>
            {config?.showLanguageSwitcher && supportedLangs.length > 1 && (
              <select
                aria-label="Language"
                value={resolvedLocale}
                onChange={(e) => handleLanguageSelect(e.target.value)}
                className="rounded-md border border-border bg-muted/30 px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {supportedLangs.map((l) => (
                  <option key={l} value={l}>
                    {l.toUpperCase()}
                  </option>
                ))}
              </select>
            )}
          </div>
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
            placeholder={t('placeholder')}
            onClose={() => window.parent?.postMessage({ type: 'spaxio-close' }, '*')}
            showPoweredBy
            ariaLabelSend={t('send')}
            ariaLabelClose={t('close')}
            poweredByText={t('poweredBy')}
          />
        </>
      )}
    </div>
  );
}

export default function WidgetPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-[460px] items-center justify-center bg-black/90 text-white">
          Loading...
        </div>
      }
    >
      <WidgetContent />
    </Suspense>
  );
}
