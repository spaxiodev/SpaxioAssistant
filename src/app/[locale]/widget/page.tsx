'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'next/navigation';
import AIChatCard, { type AIChatMessage } from '@/components/ui/ai-chat';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';
import { getWidgetTranslation, normalizeLocale } from '@/lib/widget/translations';
import type { CustomTranslations } from '@/lib/widget/translations';
import { getQuoteUiStrings, applyFrCaEmailLabel } from '@/lib/quote-ui/i18n';
import { useTheme } from '@/components/theme-provider';
import { CheckCircle2, Moon, Sun } from 'lucide-react';

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

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const value = hex.replace('#', '');
  if (value.length === 3) {
    const r = parseInt(value[0]! + value[0]!, 16);
    const g = parseInt(value[1]! + value[1]!, 16);
    const b = parseInt(value[2]! + value[2]!, 16);
    return Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b) ? null : { r, g, b };
  }
  if (value.length !== 6) return null;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b) ? null : { r, g, b };
}

function isLightBrandColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return L > 0.7;
}

function WidgetContent() {
  const searchParams = useSearchParams();
  const widgetId = searchParams.get('widgetId');
  const initialLang = searchParams.get('lang') || 'en';
  const contentRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
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
  const [leadErrors, setLeadErrors] = useState<{ name?: string; email?: string; phone?: string }>({});
  const [quoteFieldErrors, setQuoteFieldErrors] = useState<Record<string, string>>({});
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

  // Theme fallback: follow OS only when the user has not chosen a theme in this app.
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('spaxio-theme')) return;
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

  const rawLangForUi = manualLanguageOverride ?? activeLocale;
  const qs = useMemo(
    () =>
      applyFrCaEmailLabel(
        getQuoteUiStrings(resolvedLocale, {
          widgetT: (key) => getWidgetTranslation(resolvedLocale, key, config?.customTranslations),
          customTranslations: config?.customTranslations,
        }),
        String(rawLangForUi)
      ),
    [resolvedLocale, rawLangForUi, config?.customTranslations]
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
  const brandOnAccent = isLightBrandColor(color) ? '#0b1220' : '#ffffff';
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
          setQuoteFieldErrors({});
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
    if (nameRequired && !leadName.trim()) errs.name = qs.nameRequired;
    if (emailRequired && !leadEmail.trim()) errs.email = qs.emailRequired;
    else if (emailRequired && leadEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadEmail)) errs.email = qs.invalidEmail;
    if (phoneRequired && !leadPhone.trim()) errs.phone = qs.phoneRequired;
    const dynErrs: Record<string, string> = {};
    for (const v of config?.quoteVariables ?? []) {
      if (!v.required) continue;
      const raw = quoteFormInputs[v.key] ?? '';
      if (raw === '' || raw === undefined) dynErrs[v.key] = qs.fieldRequired;
    }
    if (Object.keys(errs).length > 0 || Object.keys(dynErrs).length > 0) {
      setLeadErrors(errs);
      setQuoteFieldErrors(dynErrs);
      setQuoteSubmitError(qs.fillRequiredFields);
      return;
    }
    setLeadErrors({});
    setQuoteFieldErrors({});
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
      setQuoteSubmitError(qs.genericError);
    } finally {
      setQuoteSubmitLoading(false);
    }
  }

  const quoteVars = config?.quoteVariables ?? [];

  return (
    <div
      ref={contentRef}
      className="flex h-full w-full flex-col items-center justify-start bg-white font-sans dark:bg-black transition-colors duration-300 overflow-hidden"
      style={{ isolation: 'isolate', boxSizing: 'border-box' }}
    >
      <div className="mb-1.5 flex w-full max-w-[400px] items-center justify-between gap-2">
        {config?.showLanguageSwitcher && supportedLangs.length > 1 ? (
          <select
            aria-label={qs.languageAria}
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
        ) : (
          <span className="min-w-0 flex-1" aria-hidden />
        )}
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md border border-slate-200 bg-white text-foreground shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
            aria-label="Light theme"
            aria-pressed={theme === 'light'}
            onClick={() => setTheme('light')}
          >
            <Sun className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md border border-slate-200 bg-white text-foreground shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
            aria-label="Dark theme"
            aria-pressed={theme === 'dark'}
            onClick={() => setTheme('dark')}
          >
            <Moon className="h-4 w-4" />
          </Button>
        </div>
      </div>
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
            <div
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 [&_input]:border-slate-300 [&_input]:bg-white [&_input]:text-foreground dark:[&_input]:border-zinc-600 dark:[&_input]:bg-zinc-900 [&_input]:focus-visible:ring-2 [&_input]:focus-visible:ring-[var(--quote-brand)] [&_select]:border-slate-300 [&_select]:bg-white dark:[&_select]:border-zinc-600 dark:[&_select]:bg-zinc-900 [&_select]:focus-visible:ring-2 [&_select]:focus-visible:ring-[var(--quote-brand)]"
              style={
                {
                  ['--quote-brand' as string]: color,
                  ['--quote-brand-border' as string]: `${color}44`,
                  borderColor: `${color}33`,
                } as CSSProperties
              }
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-foreground">
                  {(config?.quoteFormConfig?.intro_text as string)?.trim() || qs.quoteFormTitle}
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
                    setQuoteFieldErrors({});
                  }}
                >
                  {qs.backToChat}
                </Button>
              </div>

              {quoteSubmitted ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600 dark:text-green-400" />
                    <p className="text-sm font-semibold text-green-700 dark:text-green-200">{qs.successTitle}</p>
                  </div>
                  {quoteSubmitResult?.estimate && (
                    <p className="rounded-lg border bg-muted/30 p-3 text-sm">
                      <span className="text-muted-foreground">{qs.estimatedPricePrefix}: </span>
                      <span className="font-semibold">{quoteSubmitResult.estimate}</span>
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">{qs.successSentToBusiness}</p>
                </div>
              ) : (
                <>
                  <div className="grid gap-3">
                    <div>
                      <Label htmlFor="quote-lead-name" className="text-sm text-foreground">
                        {qs.name} *
                      </Label>
                      <Input
                        id="quote-lead-name"
                        type="text"
                        value={leadName}
                        onChange={(e) => {
                          setLeadName(e.target.value);
                          setLeadErrors((prev) => ({ ...prev, name: undefined }));
                          setQuoteSubmitError(null);
                        }}
                        className={`mt-1 ${leadErrors.name ? 'border-red-500' : ''}`}
                        placeholder={qs.name}
                      />
                      {leadErrors.name && <p className="mt-1 text-xs text-red-600">{leadErrors.name}</p>}
                    </div>

                    <div>
                      <Label htmlFor="quote-lead-email" className="text-sm text-foreground">
                        {qs.email} *
                      </Label>
                      <Input
                        id="quote-lead-email"
                        type="email"
                        value={leadEmail}
                        onChange={(e) => {
                          setLeadEmail(e.target.value);
                          setLeadErrors((prev) => ({ ...prev, email: undefined }));
                          setQuoteSubmitError(null);
                        }}
                        className={`mt-1 ${leadErrors.email ? 'border-red-500' : ''}`}
                        placeholder={qs.email}
                      />
                      {leadErrors.email && <p className="mt-1 text-xs text-red-600">{leadErrors.email}</p>}
                    </div>

                    <div>
                      <Label htmlFor="quote-lead-phone" className="text-sm text-foreground">
                        {qs.phoneOptionalFull}
                      </Label>
                      <Input
                        id="quote-lead-phone"
                        type="tel"
                        value={leadPhone}
                        onChange={(e) => {
                          setLeadPhone(e.target.value);
                          setLeadErrors((prev) => ({ ...prev, phone: undefined }));
                          setQuoteSubmitError(null);
                        }}
                        className="mt-1"
                        placeholder={qs.phone}
                      />
                      {leadErrors.phone && <p className="mt-1 text-xs text-red-600">{leadErrors.phone}</p>}
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
                            onChange={(e) => {
                              setQuoteFormInputs((prev) => ({ ...prev, [v.key]: e.target.value }));
                              setQuoteFieldErrors((prev) => {
                                const next = { ...prev };
                                delete next[v.key];
                                return next;
                              });
                              setQuoteSubmitError(null);
                            }}
                            className={`mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${quoteFieldErrors[v.key] ? 'border-red-500' : ''}`}
                          >
                            <option value="false">{qs.no}</option>
                            <option value="true">{qs.yes}</option>
                          </select>
                        ) : v.variable_type === 'select' && Array.isArray(v.options) ? (
                          <select
                            id={`quote-${v.key}`}
                            value={quoteFormInputs[v.key] ?? v.default_value ?? ''}
                            onChange={(e) => {
                              setQuoteFormInputs((prev) => ({ ...prev, [v.key]: e.target.value }));
                              setQuoteFieldErrors((prev) => {
                                const next = { ...prev };
                                delete next[v.key];
                                return next;
                              });
                              setQuoteSubmitError(null);
                            }}
                            className={`mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${quoteFieldErrors[v.key] ? 'border-red-500' : ''}`}
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
                            onChange={(e) => {
                              setQuoteFormInputs((prev) => ({ ...prev, [v.key]: e.target.value }));
                              setQuoteFieldErrors((prev) => {
                                const next = { ...prev };
                                delete next[v.key];
                                return next;
                              });
                              setQuoteSubmitError(null);
                            }}
                            className={`mt-1 ${quoteFieldErrors[v.key] ? 'border-red-500' : ''}`}
                          />
                        )}
                        {quoteFieldErrors[v.key] && (
                          <p className="mt-1 text-xs text-red-600">{quoteFieldErrors[v.key]}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-muted-foreground">{qs.calculateSubmitHint}</p>

                  <Button
                    onClick={submitQuoteRequest}
                    disabled={quoteSubmitLoading}
                    variant="default"
                    className="w-full !border-0 !shadow-none ![background:var(--quote-brand)] !text-[var(--quote-on-brand)] hover:!opacity-90 hover:!brightness-100 focus-visible:ring-2 focus-visible:ring-[var(--quote-brand)]"
                    style={
                      {
                        ['--quote-brand' as string]: color,
                        ['--quote-on-brand' as string]: brandOnAccent,
                      } as CSSProperties
                    }
                  >
                    {quoteSubmitLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        {qs.sending}
                      </span>
                    ) : (
                      (config?.quoteFormConfig?.submit_button_label as string)?.trim() || qs.calculateAndSubmit
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
