'use client';

import { useState, useEffect, useCallback, useMemo, type CSSProperties } from 'react';
import type { AIChatMessage } from '@/components/ui/ai-chat';
import { Loader2 } from 'lucide-react';
import type { IntakeFieldSchema, SessionState } from '@/lib/ai-pages/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getAiPageTranslation } from '@/lib/ai-page/translations';
import { getWidgetTranslation, normalizeLocale as normalizeWidgetLocale } from '@/lib/widget/translations';
import { getQuoteUiStrings, applyFrCaEmailLabel } from '@/lib/quote-ui/i18n';
import { useTheme } from '@/components/theme-provider';
import ReactMarkdown from 'react-markdown';
import { AnimatePresence, motion } from 'framer-motion';

const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

type QuoteVariable = {
  key: string;
  label: string;
  variable_type: string;
  unit_label?: string | null;
  required: boolean;
  default_value?: string | null;
  options?: unknown;
};

type Props = {
  /** Use for unique page-by-ID URLs (/a/p/[id]). Prefer over slug. */
  pageId?: string;
  /** Use for slug-based URLs (/a/[slug]). May collide across orgs. */
  slug?: string;
  locale: string;
  /** Override locale from URL (?lang=) or parent (postMessage) for embedded pages on client websites. */
  langOverride?: string;
  handoffToken?: string;
};

function normalizeLocale(locale: string): string {
  const l = (locale || '').toLowerCase();
  if (l.startsWith('fr-ca')) return 'fr-CA';
  if (l.startsWith('fr')) return 'fr';
  if (l.startsWith('en')) return 'en';
  if (l.startsWith('es')) return 'es';
  if (l.startsWith('de')) return 'de';
  if (l.startsWith('pt')) return 'pt';
  if (l.startsWith('it')) return 'it';
  return 'en';
}

function shouldOpenQuoteForm(text: string, locale: string): boolean {
  const s = text.toLowerCase();
  // Strong signals: currency, explicit amount talk
  if (/[€$£¥]/.test(s)) return true;
  if (/\b\d+\s*(usd|eur|gbp|cad|aud|chf)\b/i.test(s)) return true;
  // "how much" patterns (language-specific)
  const lang = normalizeLocale(locale);
  const patternsByLang: Record<string, RegExp[]> = {
    en: [
      /\b(price|pricing|cost|quote|estimate|rate|rates|fee|fees|charge|charges)\b/i,
      /\bhow\s+much\b/i,
      /\bwhat('?s|\s+is)\s+the\s+(price|cost)\b/i,
      /\bcan\s+i\s+get\s+a\s+quote\b/i,
    ],
    fr: [
      /\b(prix|tarif|tarifs|co[uû]t|co[uû]ts|devis|estimation|combien)\b/i,
      /\bquel\s+est\s+le\s+prix\b/i,
      /\bcombien\s+(co[uû]te|ça\s+co[uû]te)\b/i,
    ],
    'fr-CA': [
      /\b(prix|tarif|tarifs|co[uû]t|co[uû]ts|devis|estimation|combien)\b/i,
      /\bcombien\s+ça\s+co[uû]te\b/i,
    ],
    es: [
      /\b(precio|precios|tarifa|tarifas|costo|coste|presupuesto|cotizaci[oó]n|estimaci[oó]n|cu[aá]nto)\b/i,
      /\bcu[aá]nto\s+cuesta\b/i,
    ],
    de: [
      /\b(preis|preise|kosten|kostet|angebot|sch[aä]tzung|quote)\b/i,
      /\bwie\s+viel\b/i,
    ],
    pt: [
      /\b(pre[cç]o|pre[cç]os|valor|valores|custo|custos|or[cç]amento|cota[cç][aã]o|estima[cç][aã]o|quanto)\b/i,
      /\bquanto\s+custa\b/i,
    ],
    it: [
      /\b(prezzo|prezzi|costo|costi|preventivo|stima|quanto)\b/i,
      /\bquanto\s+costa\b/i,
    ],
  };

  const patterns = patternsByLang[lang] ?? patternsByLang.en;
  return patterns.some((re) => re.test(s));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const value = (hex || "").replace("#", "");
  if (value.length === 3) {
    const r = parseInt(value[0] + value[0], 16);
    const g = parseInt(value[1] + value[1], 16);
    const b = parseInt(value[2] + value[2], 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }
  if (value.length !== 6) return null;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
}

function isLightColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return L > 0.7;
}

export function AiPageClient({ pageId, slug, locale, langOverride, handoffToken }: Props) {
  const resolvedLocale = normalizeLocale(locale);
  const { setTheme } = useTheme();
  const [activeLangOverride, setActiveLangOverride] = useState<string | null>(langOverride ?? null);
  const effectiveDisplayLocale = activeLangOverride ?? resolvedLocale;

  useEffect(() => {
    if (langOverride) setActiveLangOverride(normalizeLocale(langOverride));
  }, [langOverride]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'spaxio-theme-change' && typeof e.data.theme === 'string') {
        const next = e.data.theme === 'light' ? 'light' : 'dark';
        setTheme(next);
      }
      if (e.data?.type === 'spaxio-lang-change' && typeof e.data.language === 'string') {
        const next = normalizeLocale(e.data.language);
        if (next) setActiveLangOverride(next);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Theme fallback: match widget — only follow OS when there is no stored choice (embed postMessage still wins via setTheme).
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('spaxio-theme')) return;
      const mql = window.matchMedia?.('(prefers-color-scheme: dark)');
      const apply = () => setTheme(mql && mql.matches ? 'dark' : 'light');
      apply();
      mql?.addEventListener?.('change', apply);
      return () => mql?.removeEventListener?.('change', apply);
    } catch {
      // ignore
    }
  }, [setTheme]);

  const t = (key: Parameters<typeof getAiPageTranslation>[1]) =>
    getAiPageTranslation(effectiveDisplayLocale, key);
  const [config, setConfig] = useState<{
    title: string;
    description: string | null;
    welcome_message: string | null;
    intro_copy: string | null;
    trust_copy: string | null;
    page_type: string;
    intake_schema?: IntakeFieldSchema[];
    branding_config?: Record<string, unknown>;
    handoff_context?: { intro_message?: string; context_snippet?: Record<string, unknown> };
    quoteVariables?: QuoteVariable[];
    quoteCurrency?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [completionPercent, setCompletionPercent] = useState(0);

  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteContactName, setQuoteContactName] = useState('');
  const [quoteContactEmail, setQuoteContactEmail] = useState('');
  const [quoteContactPhone, setQuoteContactPhone] = useState('');
  const [quoteFormInputs, setQuoteFormInputs] = useState<Record<string, string>>({});
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);
  const [quoteSubmitError, setQuoteSubmitError] = useState<string | null>(null);
  const [quoteSuccessFlash, setQuoteSuccessFlash] = useState<string | null>(null);
  const [quoteFieldErrors, setQuoteFieldErrors] = useState<Record<string, string>>({});

  const qs = useMemo(() => {
    const wloc = normalizeWidgetLocale(effectiveDisplayLocale);
    return applyFrCaEmailLabel(
      getQuoteUiStrings(effectiveDisplayLocale, {
        widgetT: (key) => getWidgetTranslation(wloc, key),
      }),
      effectiveDisplayLocale
    );
  }, [effectiveDisplayLocale]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (pageId) params.set('pageId', pageId);
    else if (slug) params.set('slug', slug);
    else return setError('Page not found or not published');
    if (handoffToken) params.set('handoff', handoffToken);
    const url = `${baseUrl}/api/ai-page/config?${params.toString()}`;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('Page not found');
        return r.json();
      })
      .then((d) => setConfig(d))
      .catch(() => setError('Page not found or not published'));
  }, [pageId, slug, handoffToken]);

  useEffect(() => {
    if (!config || runId) return;
    const body: { slug?: string; page_id?: string; handoff_token?: string; language?: string } = pageId
      ? { page_id: pageId }
      : { slug: slug! };
    if (handoffToken) body.handoff_token = handoffToken;
    body.language = effectiveDisplayLocale;
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
  }, [config, pageId, slug, handoffToken, runId]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!runId || !conversationId || loading) return;
      const trimmed = text.trim();
      if (
        config?.page_type === 'quote' &&
        Array.isArray(config?.intake_schema) &&
        config.intake_schema.length > 0 &&
        shouldOpenQuoteForm(trimmed, resolvedLocale)
      ) {
        setShowQuoteForm(true);
        setQuoteSubmitError(null);
        setQuoteFieldErrors({});
        const defaults: Record<string, string> = {};
        (config.quoteVariables ?? []).forEach((v) => {
          if (v.default_value != null && v.default_value !== '') defaults[v.key] = String(v.default_value);
        });
        setQuoteFormInputs(defaults);
        setMessages((m) => [
          ...m,
          { role: 'user', content: trimmed },
          { role: 'assistant', content: qs.quoteFormIntro },
        ]);
        setInput('');
        return;
      }
      setInput('');
      setMessages((m) => [...m, { role: 'user', content: trimmed }]);
      setLoading(true);
      try {
        const res = await fetch(`${baseUrl}/api/ai-page/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            run_id: runId,
            conversation_id: conversationId,
            message: trimmed,
            language: effectiveDisplayLocale,
          }),
        });
        const data = await res.json();
        if (data.reply) {
          setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
        }
        if (data.session_state) setSessionState(data.session_state);
        if (typeof data.completion_percent === 'number') setCompletionPercent(data.completion_percent);
        // Show quote form when AI returns open_quote_form action (e.g. user asked for a quote)
        if (
          data.action?.type === 'open_quote_form' &&
          config?.page_type === 'quote' &&
          Array.isArray(config?.intake_schema) &&
          config.intake_schema.length > 0
        ) {
          setShowQuoteForm(true);
          setQuoteSubmitError(null);
          setQuoteFieldErrors({});
          const defaults: Record<string, string> = {};
          (config.quoteVariables ?? []).forEach((v) => {
            if (v.default_value != null && v.default_value !== '') defaults[v.key] = String(v.default_value);
          });
          setQuoteFormInputs(defaults);
        }
      } finally {
        setLoading(false);
      }
    },
    [runId, conversationId, loading, config, effectiveDisplayLocale, resolvedLocale, qs]
  );

  function openQuoteFormFromQuickAction() {
    if (
      config?.page_type !== 'quote' ||
      !Array.isArray(config?.intake_schema) ||
      config.intake_schema.length === 0
    ) {
      return;
    }
    setShowQuoteForm(true);
    setQuoteSubmitError(null);
    setQuoteFieldErrors({});
    const defaults: Record<string, string> = {};
    (config.quoteVariables ?? []).forEach((v) => {
      if (v.default_value != null && v.default_value !== '') defaults[v.key] = String(v.default_value);
    });
    setQuoteFormInputs(defaults);
    // Add a chat message for transcript continuity
    setMessages((m) => [
      ...m,
      { role: 'user', content: qs.quickQuoteUserMessage },
      { role: 'assistant', content: qs.quoteFormIntro },
    ]);
  }

  async function submitQuoteForm() {
    if (!runId || quoteSubmitting || !config) return;
    const errs: Record<string, string> = {};
    if (!quoteContactName.trim()) errs.contact_name = qs.nameRequired;
    if (!quoteContactEmail.trim()) errs.contact_email = qs.emailRequired;
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(quoteContactEmail.trim())) errs.contact_email = qs.invalidEmail;
    const dyn: Record<string, string> = {};
    const proj = (config.intake_schema ?? []).filter((f) => !['contact_name', 'contact_email', 'phone'].includes(f.key));
    for (const field of proj) {
      if (!field.required) continue;
      const raw = quoteFormInputs[field.key] ?? '';
      if (raw === '') dyn[field.key] = qs.fieldRequired;
    }
    if (Object.keys(errs).length > 0 || Object.keys(dyn).length > 0) {
      setQuoteFieldErrors({ ...dyn, ...errs });
      setQuoteSubmitError(qs.fillRequiredFields);
      return;
    }
    setQuoteFieldErrors({});
    setQuoteSubmitting(true);
    setQuoteSubmitError(null);
    try {
      const collected: Record<string, unknown> = {
        contact_name: quoteContactName.trim(),
        contact_email: quoteContactEmail.trim(),
      };
      if (quoteContactPhone.trim()) collected.phone = quoteContactPhone.trim();

      // Convert dynamic variable inputs into types the server expects
      for (const [k, v] of Object.entries(quoteFormInputs)) {
        if (v === 'true') collected[k] = true;
        else if (v === 'false') collected[k] = false;
        else if (v === '') continue;
        else if (/^\d+$/.test(v)) collected[k] = Number(v);
        else if (/^\d+\.\d+$/.test(v)) collected[k] = parseFloat(v);
        else collected[k] = v;
      }

      const res = await fetch(`${baseUrl}/api/ai-page/quote-submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          run_id: runId,
          conversation_id: conversationId,
          collected,
          language: effectiveDisplayLocale,
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.success === false) {
        setQuoteSubmitError(
          typeof data?.message === 'string'
            ? data.message
            : typeof data?.error === 'string'
              ? data.error
              : qs.genericError
        );
        return;
      }

      if (data.reply) {
        setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
      }
      if (data.session_state) setSessionState(data.session_state);
      if (data?.success) {
        setQuoteSuccessFlash(`${qs.successTitle}\n${qs.successSentToBusiness}`);
        window.setTimeout(() => setQuoteSuccessFlash(null), 5000);
      }
      setShowQuoteForm(false);
    } catch (e) {
      setQuoteSubmitError(e instanceof Error ? e.message : qs.genericError);
    } finally {
      setQuoteSubmitting(false);
    }
  }

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

  const branding = (config.branding_config ?? {}) as Record<string, unknown>;
  const accentColor =
    (typeof branding.primaryBrandColor === 'string' ? branding.primaryBrandColor : null) ||
    (typeof branding.primary_brand_color === 'string' ? branding.primary_brand_color : null) ||
    '#0f172a';
  const accentTextColor = isLightColor(accentColor) ? '#0b1220' : '#ffffff';
  const assistantLogoUrl =
    (typeof branding.widgetLogoUrl === 'string' ? branding.widgetLogoUrl : null) ||
    (typeof branding.widget_logo_url === 'string' ? branding.widget_logo_url : null) ||
    null;
  const businessName =
    (typeof branding.businessName === 'string' ? branding.businessName : null) ||
    (typeof branding.business_name === 'string' ? branding.business_name : null) ||
    null;

  const aiMessages: AIChatMessage[] =
    messages.length === 0
      ? [{ sender: 'ai', text: welcome }]
      : messages.map((m) => ({
          sender: m.role === 'user' ? ('user' as const) : ('ai' as const),
          text: m.content,
        }));

  const quoteVars = config?.quoteVariables ?? [];
  const quoteIntakeFields = config?.intake_schema ?? [];
  const hasQuoteIntake = config?.page_type === 'quote' && Array.isArray(quoteIntakeFields) && quoteIntakeFields.length > 0;

  const quoteVarsByKey = new Map(quoteVars.map((v) => [v.key, v]));
  const projectFields = quoteIntakeFields.filter((f) => !['contact_name', 'contact_email', 'phone'].includes(f.key));

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto w-full max-w-3xl">
          <div className="rounded-3xl border border-border-soft bg-card/60 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/50 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div
                  className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-border-soft"
                  style={
                    accentColor
                      ? {
                          backgroundColor: accentColor,
                          color: accentTextColor,
                        }
                      : undefined
                  }
                  aria-hidden="true"
                >
                  {assistantLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={assistantLogoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm font-semibold">AI</span>
                  )}
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-semibold text-foreground">{config.title}</h1>
                  {businessName ? (
                    <p className="truncate text-sm text-muted-foreground">{businessName}</p>
                  ) : null}
                  {config.description ? (
                    <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{config.description}</p>
                  ) : null}
                </div>
              </div>

              {typeof completionPercent === 'number' && completionPercent > 0 ? (
                <div className="sm:mt-1">
                  <p className="text-right text-xs font-medium text-muted-foreground">{completionPercent}%</p>
                  <div className="mt-1 h-1.5 w-44 rounded-full bg-muted/40">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(0, completionPercent))}%`,
                        backgroundColor: accentColor,
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <AnimatePresence>
              {quoteSuccessFlash ? (
                <motion.div
                  key={quoteSuccessFlash}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                  className="mt-4 whitespace-pre-line rounded-2xl border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-200"
                >
                  {quoteSuccessFlash}
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div className="mt-4 flex flex-col gap-3">
              {aiMessages.map((msg, i) => {
                const isUser = msg.sender === 'user';
                return (
                  <motion.div
                    key={i}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className={
                      isUser
                        ? 'ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm shadow-sm sm:max-w-[70%]'
                        : 'mr-auto max-w-[85%] whitespace-pre-wrap rounded-2xl border border-border-soft bg-card/70 px-4 py-2 text-sm text-foreground sm:max-w-[70%]'
                    }
                    style={
                      isUser
                        ? {
                            backgroundColor: accentColor,
                            color: accentTextColor,
                          }
                        : undefined
                    }
                  >
                    {isUser ? (
                      msg.text
                    ) : (
                      <div className="chat-markdown [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:my-0.5 [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_a]:underline [&_a]:underline-offset-2">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    )}
                  </motion.div>
                );
              })}
              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mr-auto max-w-[85%] rounded-2xl border border-border-soft bg-card/70 px-4 py-2 text-sm text-muted-foreground sm:max-w-[70%]"
                >
                  {t('thinking')}
                </motion.div>
              )}

              <AnimatePresence>
                {showQuoteForm && hasQuoteIntake ? (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    transition={{ duration: 0.2 }}
                    className="mt-4 w-full"
                  >
                    <div
                      className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm ring-1 ring-black/[0.04] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:ring-white/[0.06] supports-[backdrop-filter]:bg-white/95 dark:supports-[backdrop-filter]:bg-zinc-950/95 [&_input]:border-slate-400 [&_input]:bg-white [&_input]:text-slate-900 [&_input]:placeholder:text-slate-500 dark:[&_input]:border-zinc-600 dark:[&_input]:bg-zinc-900 dark:[&_input]:text-zinc-100 dark:[&_input]:placeholder:text-zinc-500 [&_select]:border-slate-400 [&_select]:bg-white [&_select]:text-slate-900 dark:[&_select]:border-zinc-600 dark:[&_select]:bg-zinc-900 dark:[&_select]:text-zinc-100 [&_textarea]:border-slate-400 [&_textarea]:bg-white [&_textarea]:text-slate-900 [&_textarea]:placeholder:text-slate-500 dark:[&_textarea]:border-zinc-600 dark:[&_textarea]:bg-zinc-900 dark:[&_textarea]:text-zinc-100 dark:[&_textarea]:placeholder:text-zinc-500"
                      style={
                        accentColor
                          ? { boxShadow: `0 0 0 1px ${accentColor}22, 0 12px 40px -12px ${accentColor}44` }
                          : undefined
                      }
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <h2 className="text-base font-semibold text-inherit">{qs.quoteFormTitle}</h2>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowQuoteForm(false);
                            setQuoteSubmitError(null);
                            setQuoteFieldErrors({});
                          }}
                        >
                          {qs.backToChat}
                        </Button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="contact_name">{qs.name} *</Label>
                          <Input
                            id="contact_name"
                            className={`mt-1 ${quoteFieldErrors.contact_name ? 'border-red-500' : ''}`}
                            value={quoteContactName}
                            onChange={(e) => {
                              setQuoteContactName(e.target.value);
                              setQuoteFieldErrors((p) => {
                                const n = { ...p };
                                delete n.contact_name;
                                return n;
                              });
                              setQuoteSubmitError(null);
                            }}
                          />
                          {quoteFieldErrors.contact_name && (
                            <p className="mt-1 text-xs text-red-600">{quoteFieldErrors.contact_name}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="contact_email">{qs.email} *</Label>
                          <Input
                            id="contact_email"
                            className={`mt-1 ${quoteFieldErrors.contact_email ? 'border-red-500' : ''}`}
                            value={quoteContactEmail}
                            onChange={(e) => {
                              setQuoteContactEmail(e.target.value);
                              setQuoteFieldErrors((p) => {
                                const n = { ...p };
                                delete n.contact_email;
                                return n;
                              });
                              setQuoteSubmitError(null);
                            }}
                          />
                          {quoteFieldErrors.contact_email && (
                            <p className="mt-1 text-xs text-red-600">{quoteFieldErrors.contact_email}</p>
                          )}
                        </div>
                        <div className="sm:col-span-2">
                          <Label htmlFor="contact_phone">{qs.phoneOptionalFull}</Label>
                          <Input
                            id="contact_phone"
                            className="mt-1"
                            value={quoteContactPhone}
                            onChange={(e) => setQuoteContactPhone(e.target.value)}
                            placeholder={qs.phone}
                          />
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {projectFields.map((field) => {
                          const qv = quoteVarsByKey.get(field.key);
                          return (
                            <div key={field.key}>
                              <Label htmlFor={`quote-${field.key}`}>
                                {field.label}
                                {field.required ? ' *' : ''}
                              </Label>
                              {qv ? (
                                qv.variable_type === 'boolean' ? (
                                  <select
                                    id={`quote-${field.key}`}
                                    value={quoteFormInputs[field.key] ?? qv.default_value ?? 'false'}
                                    onChange={(e) => {
                                      setQuoteFormInputs((prev) => ({ ...prev, [field.key]: e.target.value }));
                                      setQuoteFieldErrors((p) => {
                                        const n = { ...p };
                                        delete n[field.key];
                                        return n;
                                      });
                                      setQuoteSubmitError(null);
                                    }}
                                    className={`mt-1 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-sm text-slate-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 ${quoteFieldErrors[field.key] ? 'border-red-500' : ''}`}
                                  >
                                    <option value="false">{qs.no}</option>
                                    <option value="true">{qs.yes}</option>
                                  </select>
                                ) : qv.variable_type === 'select' && Array.isArray(qv.options) ? (
                                  <select
                                    id={`quote-${field.key}`}
                                    value={quoteFormInputs[field.key] ?? qv.default_value ?? ''}
                                    onChange={(e) => {
                                      setQuoteFormInputs((prev) => ({ ...prev, [field.key]: e.target.value }));
                                      setQuoteFieldErrors((p) => {
                                        const n = { ...p };
                                        delete n[field.key];
                                        return n;
                                      });
                                      setQuoteSubmitError(null);
                                    }}
                                    className={`mt-1 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-sm text-slate-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 ${quoteFieldErrors[field.key] ? 'border-red-500' : ''}`}
                                  >
                                    {(qv.options as { value: string; label: string }[]).map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <Input
                                    id={`quote-${field.key}`}
                                    type={
                                      qv.variable_type === 'number' || qv.variable_type === 'area' || qv.variable_type === 'quantity'
                                        ? 'number'
                                        : 'text'
                                    }
                                    placeholder={qv.unit_label ?? ''}
                                    value={quoteFormInputs[field.key] ?? ''}
                                    onChange={(e) => {
                                      setQuoteFormInputs((prev) => ({ ...prev, [field.key]: e.target.value }));
                                      setQuoteFieldErrors((p) => {
                                        const n = { ...p };
                                        delete n[field.key];
                                        return n;
                                      });
                                      setQuoteSubmitError(null);
                                    }}
                                    className={`mt-1 ${quoteFieldErrors[field.key] ? 'border-red-500' : ''}`}
                                  />
                                )
                              ) : field.type === 'boolean' ? (
                                <select
                                  id={`quote-${field.key}`}
                                  value={quoteFormInputs[field.key] ?? 'false'}
                                  onChange={(e) => {
                                    setQuoteFormInputs((prev) => ({ ...prev, [field.key]: e.target.value }));
                                    setQuoteFieldErrors((p) => {
                                      const n = { ...p };
                                      delete n[field.key];
                                      return n;
                                    });
                                    setQuoteSubmitError(null);
                                  }}
                                  className={`mt-1 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-sm text-slate-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 ${quoteFieldErrors[field.key] ? 'border-red-500' : ''}`}
                                >
                                  <option value="false">{qs.no}</option>
                                  <option value="true">{qs.yes}</option>
                                </select>
                              ) : field.type === 'text' ? (
                                <Textarea
                                  id={`quote-${field.key}`}
                                  className={`mt-1 min-h-[80px] ${quoteFieldErrors[field.key] ? 'border-red-500' : ''}`}
                                  value={quoteFormInputs[field.key] ?? ''}
                                  onChange={(e) => {
                                    setQuoteFormInputs((prev) => ({ ...prev, [field.key]: e.target.value }));
                                    setQuoteFieldErrors((p) => {
                                      const n = { ...p };
                                      delete n[field.key];
                                      return n;
                                    });
                                    setQuoteSubmitError(null);
                                  }}
                                />
                              ) : (
                                <Input
                                  id={`quote-${field.key}`}
                                  type={field.type === 'number' ? 'number' : 'text'}
                                  value={quoteFormInputs[field.key] ?? ''}
                                  onChange={(e) => {
                                    setQuoteFormInputs((prev) => ({ ...prev, [field.key]: e.target.value }));
                                    setQuoteFieldErrors((p) => {
                                      const n = { ...p };
                                      delete n[field.key];
                                      return n;
                                    });
                                    setQuoteSubmitError(null);
                                  }}
                                  className={`mt-1 ${quoteFieldErrors[field.key] ? 'border-red-500' : ''}`}
                                />
                              )}
                              {quoteFieldErrors[field.key] && (
                                <p className="mt-1 text-xs text-red-600">{quoteFieldErrors[field.key]}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {quoteSubmitError && <p className="mt-3 text-sm text-red-600">{quoteSubmitError}</p>}

                      <p className="mt-4 text-xs text-slate-600 dark:text-zinc-400">{qs.calculateSubmitHint}</p>

                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <Button
                          onClick={submitQuoteForm}
                          disabled={quoteSubmitting}
                          className="w-full sm:min-w-[220px]"
                          style={
                            accentColor
                              ? {
                                  backgroundColor: accentColor,
                                  color: accentTextColor,
                                }
                              : undefined
                          }
                        >
                          {quoteSubmitting ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {qs.sending}
                            </span>
                          ) : (
                            qs.calculateAndSubmit
                          )}
                        </Button>
                      </div>
                      {config?.quoteCurrency ? (
                        <p className="mt-2 text-xs text-slate-600 dark:text-zinc-400">
                          {qs.currency}: {config.quoteCurrency}
                        </p>
                      ) : null}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {!showQuoteForm ? (
        <div
          className="sticky bottom-0 w-full border-t border-border-soft/70 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80"
          style={accentColor ? ({ ['--accent' as string]: accentColor } as CSSProperties) : undefined}
        >
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-3 py-3 sm:px-6">
            {hasQuoteIntake && (
              <div className="flex w-full flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={openQuoteFormFromQuickAction}
                  className="rounded-full border border-border-soft/70 bg-background/40 px-4 shadow-sm hover:bg-background/70"
                >
                  {qs.quickQuoteButton}
                </Button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('placeholder')}
                rows={1}
                className="min-h-[44px] max-h-[160px] flex-1 resize-none rounded-2xl border border-border-soft bg-background/50 px-4 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/35"
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
                className="h-[44px] rounded-2xl px-4 text-sm font-medium shadow-sm transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                style={
                  accentColor
                    ? {
                        backgroundColor: accentColor,
                        color: accentTextColor,
                      }
                    : undefined
                }
              >
                {t('send')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
