'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AIChatMessage } from '@/components/ui/ai-chat';
import { Loader2 } from 'lucide-react';
import type { SessionState } from '@/lib/ai-pages/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from 'next-intl';

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

export function AiPageClient({ pageId, slug, locale, handoffToken }: Props) {
  const t = useTranslations('aiPage');
  const resolvedLocale = normalizeLocale(locale);
  const [config, setConfig] = useState<{
    title: string;
    description: string | null;
    welcome_message: string | null;
    intro_copy: string | null;
    trust_copy: string | null;
    page_type: string;
    intake_schema?: { key: string; label: string; required?: boolean }[];
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
    const body: { slug?: string; page_id?: string; handoff_token?: string } = pageId
      ? { page_id: pageId }
      : { slug: slug! };
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
  }, [config, pageId, slug, handoffToken, runId]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!runId || !conversationId || loading) return;
      const trimmed = text.trim();
      if (
        config?.page_type === 'quote' &&
        Array.isArray(config?.quoteVariables) &&
        config.quoteVariables.length > 0 &&
        shouldOpenQuoteForm(trimmed, resolvedLocale)
      ) {
        setShowQuoteForm(true);
        setQuoteSubmitError(null);
        const defaults: Record<string, string> = {};
        config.quoteVariables.forEach((v) => {
          if (v.default_value != null && v.default_value !== '') defaults[v.key] = String(v.default_value);
        });
        setQuoteFormInputs(defaults);
        setMessages((m) => [
          ...m,
          { role: 'user', content: trimmed },
          { role: 'assistant', content: t('quoteFormIntro') },
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
            language: resolvedLocale,
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
    [runId, conversationId, loading, config, resolvedLocale, t]
  );

  function openQuoteFormFromQuickAction() {
    if (
      config?.page_type !== 'quote' ||
      !Array.isArray(config?.quoteVariables) ||
      config.quoteVariables.length === 0
    ) {
      return;
    }
    setShowQuoteForm(true);
    setQuoteSubmitError(null);
    const defaults: Record<string, string> = {};
    config.quoteVariables.forEach((v) => {
      if (v.default_value != null && v.default_value !== '') defaults[v.key] = String(v.default_value);
    });
    setQuoteFormInputs(defaults);
    // Add a chat message for transcript continuity
    setMessages((m) => [
      ...m,
      { role: 'user', content: t('quickQuoteUserMessage') },
      { role: 'assistant', content: t('quoteFormIntro') },
    ]);
  }

  async function submitQuoteForm() {
    if (!runId || quoteSubmitting) return;
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
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.success === false) {
        setQuoteSubmitError(data?.message || data?.error || 'Failed to submit quote');
        return;
      }

      if (data.reply) {
        setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
      }
      if (data.session_state) setSessionState(data.session_state);
      setShowQuoteForm(false);
    } catch (e) {
      setQuoteSubmitError(e instanceof Error ? e.message : 'Failed to submit quote');
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

  const aiMessages: AIChatMessage[] =
    messages.length === 0
      ? [{ sender: 'ai', text: welcome }]
      : messages.map((m) => ({
          sender: m.role === 'user' ? ('user' as const) : ('ai' as const),
          text: m.content,
        }));

  const quoteVars = config?.quoteVariables ?? [];

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
              {t('thinking')}
            </div>
          )}
        </div>
      </div>

      {showQuoteForm && quoteVars.length > 0 && (
        <div className="w-full border-t bg-background/95 backdrop-blur">
          <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-6">
            <div className="rounded-2xl border bg-card p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold">{t('quoteFormTitle')}</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowQuoteForm(false);
                    setQuoteSubmitError(null);
                  }}
                >
                  {t('backToChat')}
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="contact_name">{t('name')} *</Label>
                  <Input id="contact_name" className="mt-1" value={quoteContactName} onChange={(e) => setQuoteContactName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="contact_email">{t('email')} *</Label>
                  <Input id="contact_email" className="mt-1" value={quoteContactEmail} onChange={(e) => setQuoteContactEmail(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="contact_phone">{t('phoneOptional')}</Label>
                  <Input id="contact_phone" className="mt-1" value={quoteContactPhone} onChange={(e) => setQuoteContactPhone(e.target.value)} />
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {quoteVars.map((v) => (
                  <div key={v.key}>
                    <Label htmlFor={`quote-${v.key}`}>
                      {v.label}
                      {v.required ? ' *' : ''}
                    </Label>
                    {v.variable_type === 'boolean' ? (
                      <select
                        id={`quote-${v.key}`}
                        value={quoteFormInputs[v.key] ?? v.default_value ?? 'false'}
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

              {quoteSubmitError && <p className="mt-3 text-sm text-red-600">{quoteSubmitError}</p>}

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  onClick={submitQuoteForm}
                  disabled={quoteSubmitting}
                  className="sm:min-w-[200px]"
                >
                  {quoteSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t('submitAndGetPrice')}
                </Button>
              </div>
              {config?.quoteCurrency ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t('currency')}: {config.quoteCurrency}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <div className="sticky bottom-0 w-full border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-end gap-2 px-3 py-3 sm:px-6">
          {!showQuoteForm && config?.page_type === 'quote' && quoteVars.length > 0 && (
            <div className="mb-2 flex w-full flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={openQuoteFormFromQuickAction}>
                {t('quickQuoteButton')}
              </Button>
            </div>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('placeholder')}
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
            {t('send')}
          </button>
        </div>
      </div>
    </div>
  );
}
