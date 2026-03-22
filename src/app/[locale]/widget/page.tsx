'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AIChatCard, { type AIChatMessage } from '@/components/ui/ai-chat';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';
import { getWidgetTranslation, normalizeLocale } from '@/lib/widget/translations';
import type { CustomTranslations } from '@/lib/widget/translations';
import { useTheme } from '@/components/theme-provider';
import { CheckCircle2 } from 'lucide-react';

type QuoteVariable = {
  key: string;
  label: string;
  variable_type: string;
  unit_label?: string | null;
  required: boolean;
  default_value?: string | null;
  options?: unknown;
};

type QuoteFormConfig = {
  intro_text?: string;
  submit_button_label?: string;
  name_required?: boolean;
  email_required?: boolean;
  phone_required?: boolean;
  show_estimate_instantly?: boolean;
  show_exact_estimate?: boolean;
};

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
  quoteProfileId?: string;
  quoteVariables?: QuoteVariable[];
  quoteCurrency?: string;
  quoteFormConfig?: QuoteFormConfig | null;
};

function WidgetContent() {
  const searchParams = useSearchParams();
  const widgetId = searchParams.get('widgetId');
  const initialLang = searchParams.get('lang') || 'en';
  const contentRef = useRef<HTMLDivElement>(null);
  const { setTheme } = useTheme();
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  /** Active UI/API language: from URL, then postMessage, or manual override. */
  const [activeLocale, setActiveLocale] = useState(() => normalizeLocale(initialLang));
  /** Manual override from language switcher (session-only). */
  const [manualLanguageOverride, setManualLanguageOverride] = useState<string | null>(null);

  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [pageHandoff, setPageHandoff] = useState<{
    target_page_slug: string;
    button_label: string;
    context_token?: string;
  } | null>(null);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteFormInputs, setQuoteFormInputs] = useState<Record<string, string>>({});
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadErrors, setLeadErrors] = useState<{ name?: string; email?: string }>({});
  const [quoteSubmitted, setQuoteSubmitted] = useState(false);
  const [quoteSubmitLoading, setQuoteSubmitLoading] = useState(false);
  const [quoteSubmitError, setQuoteSubmitError] = useState<string | null>(null);
  const [quoteSubmitResult, setQuoteSubmitResult] = useState<{ estimate?: string; message: string } | null>(null);

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
      if (e.data?.type === 'spaxio-theme-change' && typeof e.data.theme === 'string') {
        // If the message targets a specific widget, respect it.
        if (typeof e.data.widgetId === 'string' && e.data.widgetId !== widgetId) return;
        const next = e.data.theme === 'light' ? 'light' : 'dark';
        setTheme(next);
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

  // Theme fallback: if the host doesn't provide theme info, follow prefers-color-scheme.
  useEffect(() => {
    try {
      const mql = window.matchMedia?.('(prefers-color-scheme: dark)');
      setTheme(mql && mql.matches ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [setTheme]);

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
  }, [config, resolvedLocale, showQuoteForm, quoteSubmitted]);

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
      const base = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || '');
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
      if (data.action && typeof data.action === 'object' && typeof data.action.type === 'string') {
        if (data.action.type === 'open_quote_form') {
          setShowQuoteForm(true);
          setQuoteSubmitted(false);
          setQuoteSubmitError(null);
          setQuoteSubmitResult(null);
          setLeadName('');
          setLeadEmail('');
          setLeadPhone('');
          setLeadErrors({});
          const defaults: Record<string, string> = {};
          (config?.quoteVariables ?? []).forEach((v) => {
            if (v.default_value != null && v.default_value !== '') defaults[v.key] = String(v.default_value);
          });
          setQuoteFormInputs(defaults);
        }
        try {
          window.parent?.postMessage?.({ type: 'spaxio-action', action: data.action }, '*');
        } catch {
          // ignore
        }
      }
      if (data.page_handoff && typeof data.page_handoff === 'object' && data.page_handoff.target_page_slug) {
        setPageHandoff({
          target_page_slug: data.page_handoff.target_page_slug,
          button_label: data.page_handoff.button_label || 'Continue in full assistant',
          context_token: data.page_handoff.context_token,
        });
        try {
          window.parent?.postMessage?.({ type: 'spaxio-page-handoff', page_handoff: data.page_handoff }, '*');
        } catch {
          // ignore
        }
      } else {
        setPageHandoff(null);
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

  async function submitQuoteRequest() {
    if (!widgetId || quoteSubmitLoading) return;
    const qfc = config?.quoteFormConfig;
    const nameRequired = qfc?.name_required !== false;
    const emailRequired = qfc?.email_required !== false;
    const phoneRequired = qfc?.phone_required === true;
    const errs: { name?: string; email?: string; phone?: string } = {};
    if (nameRequired && !leadName.trim()) errs.name = t('quoteFormNameRequired');
    if (emailRequired && !leadEmail.trim()) errs.email = t('quoteFormEmailRequired');
    else if (emailRequired && leadEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadEmail)) errs.email = t('quoteFormInvalidEmail');
    if (phoneRequired && !leadPhone.trim()) errs.phone = t('quoteFormPhoneRequired') ?? 'Phone is required';
    if (Object.keys(errs).length > 0) {
      setLeadErrors(errs);
      return;
    }
    setLeadErrors({});
    setQuoteSubmitError(null);
    setQuoteSubmitLoading(true);
    try {
      const answers: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(quoteFormInputs)) {
        if (v === 'true') answers[k] = true;
        else if (v === 'false') answers[k] = false;
        else if (v === '') continue;
        else if (/^\d+$/.test(v)) answers[k] = Number(v);
        else if (/^\d+\.\d+$/.test(v)) answers[k] = parseFloat(v);
        else answers[k] = v;
      }
      const base = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || '');
      const res = await fetch(`${base}/api/widget/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgetId,
          conversationId,
          name: leadName.trim(),
          email: leadEmail.trim(),
          phone: leadPhone.trim() || undefined,
          answers,
          // Language context for language-aware persistence + emails
          language: resolvedLocale,
          activeLocale: activeLocale,
          detectedLocale: activeLocale,
          manualLanguageOverride: manualLanguageOverride ?? undefined,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setQuoteSubmitError(data.error);
        return;
      }
      setQuoteSubmitted(true);
      setQuoteSubmitResult({
        estimate: data.estimate,
        message: data.message ?? '',
      });
    } catch {
      setQuoteSubmitError(t('errorMessage'));
    } finally {
      setQuoteSubmitLoading(false);
    }
  }

  const quoteVars = config?.quoteVariables ?? [];

  return (
    <div
      ref={contentRef}
      className="flex h-full w-full flex-col items-center justify-start bg-white font-sans dark:bg-[#0f172a] transition-colors duration-300 overflow-hidden"
      style={{ isolation: 'isolate', boxSizing: 'border-box' }}
    >
      {config?.showLanguageSwitcher && supportedLangs.length > 1 && (
        <div className="mb-1.5 flex w-full max-w-[400px] items-center gap-2">
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
        </div>
      )}
      {pageHandoff && (
        <a
          href={`${baseUrl}/${resolvedLocale}/a/${pageHandoff.target_page_slug}${pageHandoff.context_token ? `?handoff=${encodeURIComponent(pageHandoff.context_token)}` : ''}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-1.5 flex w-full max-w-[400px] items-center justify-center rounded-lg border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/20"
        >
          {pageHandoff.button_label}
        </a>
      )}
      <AnimatePresence mode="wait">
        {showQuoteForm ? (
          <motion.div
            key="quote-form"
            initial={{ opacity: 0, y: 10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="flex w-full max-w-[400px] flex-col gap-4"
          >
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-foreground">
                  {(config?.quoteFormConfig?.intro_text as string)?.trim() || t('quoteFormTitle')}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowQuoteForm(false);
                    setQuoteSubmitted(false);
                    setQuoteSubmitResult(null);
                    setQuoteSubmitError(null);
                    setLeadErrors({});
                  }}
                >
                  {t('quoteFormBackToChat')}
                </Button>
              </div>

              {quoteSubmitted ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600 dark:text-green-400" />
                    <p className="text-sm font-semibold text-green-700 dark:text-green-200">{t('quoteFormSuccess')}</p>
                  </div>
                  {quoteSubmitResult?.estimate && (
                    <p className="rounded-lg border bg-muted/30 p-3 text-sm">
                      <span className="text-muted-foreground">{t('quoteFormYourEstimate')}: </span>
                      <span className="font-semibold">{quoteSubmitResult.estimate}</span>
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">{t('quoteFormSuccessSentToBusiness')}</p>
                </div>
              ) : (
                <>
                  <div className="grid gap-3">
                    <div>
                      <Label htmlFor="quote-lead-name" className="text-sm text-foreground">
                        {t('leadFormName')} *
                      </Label>
                      <Input
                        id="quote-lead-name"
                        type="text"
                        value={leadName}
                        onChange={(e) => {
                          setLeadName(e.target.value);
                          setLeadErrors((prev) => ({ ...prev, name: undefined }));
                        }}
                        className={`mt-1 ${leadErrors.name ? 'border-red-500' : ''}`}
                        placeholder={t('leadFormName')}
                      />
                      {leadErrors.name && <p className="mt-1 text-xs text-red-600">{leadErrors.name}</p>}
                    </div>

                    <div>
                      <Label htmlFor="quote-lead-email" className="text-sm text-foreground">
                        {t('leadFormEmail')} *
                      </Label>
                      <Input
                        id="quote-lead-email"
                        type="email"
                        value={leadEmail}
                        onChange={(e) => {
                          setLeadEmail(e.target.value);
                          setLeadErrors((prev) => ({ ...prev, email: undefined }));
                        }}
                        className={`mt-1 ${leadErrors.email ? 'border-red-500' : ''}`}
                        placeholder={t('leadFormEmail')}
                      />
                      {leadErrors.email && <p className="mt-1 text-xs text-red-600">{leadErrors.email}</p>}
                    </div>

                    <div>
                      <Label htmlFor="quote-lead-phone" className="text-sm text-foreground">
                        {t('leadFormPhone')} <span className="text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        id="quote-lead-phone"
                        type="tel"
                        value={leadPhone}
                        onChange={(e) => setLeadPhone(e.target.value)}
                        className="mt-1"
                        placeholder={t('leadFormPhone')}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {quoteVars.map((v) => (
                      <div key={v.key}>
                        <Label htmlFor={`quote-${v.key}`} className="text-sm text-foreground">
                          {v.label}
                          {v.required ? ' *' : ''}
                        </Label>
                        {v.variable_type === 'boolean' ? (
                          <select
                            id={`quote-${v.key}`}
                            value={quoteFormInputs[v.key] ?? v.default_value ?? ''}
                            onChange={(e) => setQuoteFormInputs((prev) => ({ ...prev, [v.key]: e.target.value }))}
                            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="false">No</option>
                            <option value="true">Yes</option>
                          </select>
                        ) : v.variable_type === 'select' && Array.isArray(v.options) ? (
                          <select
                            id={`quote-${v.key}`}
                            value={quoteFormInputs[v.key] ?? v.default_value ?? ''}
                            onChange={(e) => setQuoteFormInputs((prev) => ({ ...prev, [v.key]: e.target.value }))}
                            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            {(v.options as { value: string; label: string }[]).map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            id={`quote-${v.key}`}
                            type={v.variable_type === 'number' || v.variable_type === 'area' || v.variable_type === 'quantity' ? 'number' : 'text'}
                            placeholder={v.unit_label ?? ''}
                            value={quoteFormInputs[v.key] ?? ''}
                            onChange={(e) => setQuoteFormInputs((prev) => ({ ...prev, [v.key]: e.target.value }))}
                            className="mt-1"
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-muted-foreground">{t('quoteFormCalculateSubmitHint')}</p>

                  <Button onClick={submitQuoteRequest} disabled={quoteSubmitLoading} variant="default" className="w-full">
                    {quoteSubmitLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        {t('loading')}
                      </span>
                    ) : (
                      (config?.quoteFormConfig?.submit_button_label as string)?.trim() || t('quoteFormCalculate')
                    )}
                  </Button>

                  {quoteSubmitError && <p className="text-sm text-red-600">{quoteSubmitError}</p>}
                </>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="h-full w-full"
          >
            <AIChatCard
              className="w-full max-w-[420px] h-full shrink-0"
              primaryBrandColor={color}
              chatbotName={chatbotName}
              assistantSubtitle={config?.businessName ?? null}
              assistantAvatarUrl={config?.widgetLogoUrl ?? null}
              welcomeMessage={welcome}
              messages={aiMessages}
              onSend={send}
              isTyping={loading}
              input={input}
              onInputChange={setInput}
              placeholder={t('placeholder')}
              suggestions={[t('suggestionQuote'), t('suggestionServices'), t('suggestionHours')]}
              typingIndicatorText={t('typingIndicator')}
              onClose={() => window.parent?.postMessage({ type: 'spaxio-close' }, '*')}
              showPoweredBy
              ariaLabelSend={t('send')}
              ariaLabelClose={t('close')}
              poweredByText={t('poweredBy')}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function WidgetPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-[560px] items-center justify-center bg-black/90 text-white">
          Loading...
        </div>
      }
    >
      <WidgetContent />
    </Suspense>
  );
}
