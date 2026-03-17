'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AIChatCard, { type AIChatMessage } from '@/components/ui/ai-chat';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { getWidgetTranslation, normalizeLocale } from '@/lib/widget/translations';
import type { CustomTranslations } from '@/lib/widget/translations';

type QuoteVariable = {
  key: string;
  label: string;
  variable_type: string;
  unit_label?: string | null;
  required: boolean;
  default_value?: string | null;
  options?: unknown;
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
};

function WidgetContent() {
  const searchParams = useSearchParams();
  const widgetId = searchParams.get('widgetId');
  const initialLang = searchParams.get('lang') || 'en';
  const contentRef = useRef<HTMLDivElement>(null);
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
  const [quoteEstimateResult, setQuoteEstimateResult] = useState<{
    valid: boolean;
    total: number;
    estimate_low?: number | null;
    estimate_high?: number | null;
    applied_rules: { rule_name: string; amount: number; label?: string }[];
    currency: string;
    missing_required: string[];
  } | null>(null);
  const [quoteEstimateLoading, setQuoteEstimateLoading] = useState(false);

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
  }, [config, resolvedLocale, showQuoteForm, quoteEstimateResult, quoteSubmitted]);

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
        if (data.action.type === 'open_quote_form' && config?.quoteVariables?.length) {
          setShowQuoteForm(true);
          setQuoteEstimateResult(null);
          setQuoteSubmitted(false);
          setQuoteSubmitError(null);
          setQuoteSubmitResult(null);
          setLeadName('');
          setLeadEmail('');
          setLeadPhone('');
          setLeadErrors({});
          const defaults: Record<string, string> = {};
          config.quoteVariables.forEach((v) => {
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
    const errs: { name?: string; email?: string } = {};
    if (!leadName.trim()) errs.name = t('quoteFormNameRequired');
    if (!leadEmail.trim()) errs.email = t('quoteFormEmailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadEmail)) errs.email = t('quoteFormInvalidEmail');
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
        message: data.message ?? 'Quote request submitted',
      });
    } catch {
      setQuoteSubmitError(t('errorMessage'));
    } finally {
      setQuoteSubmitLoading(false);
    }
  }

  async function runQuoteEstimate() {
    if (!widgetId || !config?.quoteVariables?.length || quoteEstimateLoading) return;
    setQuoteEstimateLoading(true);
    setQuoteEstimateResult(null);
    try {
      const body: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(quoteFormInputs)) {
        if (v === 'true') body[k] = true;
        else if (v === 'false') body[k] = false;
        else if (v === '') continue;
        else if (/^\d+$/.test(v)) body[k] = Number(v);
        else if (/^\d+\.\d+$/.test(v)) body[k] = parseFloat(v);
        else body[k] = v;
      }
      const base = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || '');
      const res = await fetch(`${base}/api/widget/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widgetId, inputs: body }),
      });
      const data = await res.json();
      setQuoteEstimateResult({
        valid: data.valid ?? false,
        total: data.total ?? 0,
        estimate_low: data.estimate_low,
        estimate_high: data.estimate_high,
        applied_rules: data.applied_rules ?? [],
        currency: data.currency ?? 'USD',
        missing_required: data.missing_required ?? [],
      });
    } catch {
      setQuoteEstimateResult({
        valid: false,
        total: 0,
        applied_rules: [],
        currency: config?.quoteCurrency ?? 'USD',
        missing_required: [],
      });
    } finally {
      setQuoteEstimateLoading(false);
    }
  }

  const quoteVars = config?.quoteVariables ?? [];

  return (
    <div
      ref={contentRef}
      className="flex w-full flex-col items-center justify-start font-sans"
      style={{ isolation: 'isolate', boxSizing: 'border-box' }}
    >
      {config?.showLanguageSwitcher && supportedLangs.length > 1 && (
        <div className="mb-2 flex w-full max-w-[360px] items-center gap-2">
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
          className="mb-2 flex w-full max-w-[360px] items-center justify-center rounded-lg border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/20"
        >
          {pageHandoff.button_label}
        </a>
      )}
      {showQuoteForm && quoteVars.length > 0 ? (
        <div className="flex w-full max-w-[360px] flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-foreground">{t('quoteFormTitle')}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowQuoteForm(false);
                setQuoteEstimateResult(null);
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
              <p className="text-sm font-medium text-green-600 dark:text-green-500">{t('quoteFormSuccess')}</p>
              {quoteSubmitResult?.estimate && (
                <p className="rounded-lg border bg-muted/30 p-3 text-sm">
                  <span className="text-muted-foreground">{t('quoteFormYourEstimate')}: </span>
                  <span className="font-semibold">{quoteSubmitResult.estimate}</span>
                </p>
              )}
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
                onChange={(e) => { setLeadName(e.target.value); setLeadErrors((prev) => ({ ...prev, name: undefined })); }}
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
                onChange={(e) => { setLeadEmail(e.target.value); setLeadErrors((prev) => ({ ...prev, email: undefined })); }}
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
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
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
          <div className="flex gap-2">
            <Button onClick={runQuoteEstimate} disabled={quoteEstimateLoading} variant="outline" className="flex-1">
              {quoteEstimateLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t('loading')}
                </span>
              ) : (
                t('quoteFormCalculate')
              )}
            </Button>
            <Button onClick={submitQuoteRequest} disabled={quoteSubmitLoading} className="flex-1">
              {quoteSubmitLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t('loading')}
                </span>
              ) : (
                t('quoteFormSubmitRequest')
              )}
            </Button>
          </div>
          {quoteSubmitError && (
            <p className="text-xs text-red-600">{quoteSubmitError}</p>
          )}
          {quoteEstimateResult && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="mb-2 font-medium text-foreground">{t('quoteFormYourEstimate')}</p>
              {quoteEstimateResult.missing_required.length > 0 && (
                <p className="mb-2 text-amber-600">
                  {t('quoteFormMissing')}: {quoteEstimateResult.missing_required.join(', ')}
                </p>
              )}
              {quoteEstimateResult.applied_rules.length > 0 && (
                <ul className="mb-2 space-y-1">
                  {quoteEstimateResult.applied_rules.map((item, i) => (
                    <li key={i} className="flex justify-between">
                      <span className="text-muted-foreground">{item.label ?? item.rule_name}</span>
                      <span>
                        {quoteEstimateResult.currency === 'USD' ? '$' : quoteEstimateResult.currency + ' '}
                        {Number(item.amount).toLocaleString(resolvedLocale, { minimumFractionDigits: 2 })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>{t('quoteFormTotal')}</span>
                <span>
                  {quoteEstimateResult.estimate_low != null && quoteEstimateResult.estimate_high != null
                    ? `${quoteEstimateResult.currency === 'USD' ? '$' : ''}${Number(quoteEstimateResult.estimate_low).toLocaleString(resolvedLocale, { minimumFractionDigits: 2 })} – ${quoteEstimateResult.currency === 'USD' ? '$' : ''}${Number(quoteEstimateResult.estimate_high).toLocaleString(resolvedLocale, { minimumFractionDigits: 2 })}`
                    : `${quoteEstimateResult.currency === 'USD' ? '$' : quoteEstimateResult.currency + ' '}${Number(quoteEstimateResult.total).toLocaleString(resolvedLocale, { minimumFractionDigits: 2 })}`}
                </span>
              </div>
            </div>
          )}
          <Button onClick={submitQuoteRequest} disabled={quoteSubmitLoading} variant="default" className="w-full">
            {quoteSubmitLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {t('loading')}
              </span>
            ) : (
              t('quoteFormSubmitRequest')
            )}
          </Button>
          {quoteSubmitError && <p className="text-sm text-red-600">{quoteSubmitError}</p>}
          </>
          )}
        </div>
      ) : (
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
