'use client';

import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CopyScript } from '@/app/dashboard/install/copy-script';
import { useToast } from '@/components/ui/use-toast';
import {
  Loader2,
  Send,
  Sparkles,
  CheckCircle2,
  Copy,
  ChevronDown,
  ChevronRight,
  Bot,
  User,
  ImageIcon,
  X,
} from 'lucide-react';
import type { AssistantPlannerConfig } from '@/lib/ai-setup/types';
import { stripAllCodeBlocksFromMessage } from '@/lib/ai-setup/parse-json-block';
import { AI_SETUP_SESSION_STORAGE_KEY, AI_SETUP_SESSION_TTL_HOURS } from '@/lib/ai-setup/session-ttl-constants';
import { cn } from '@/lib/utils';

type Message = { id?: string; role: 'user' | 'assistant'; content: string; created_at?: string };

const STARTER_KEYS = [
  'aiSetupStarterPrompt1',
  'aiSetupStarterPrompt2',
  'aiSetupStarterPrompt3',
  'aiSetupStarterPrompt4',
] as const;

/** Format assistant message for display: strip code/JSON blocks and render paragraphs and lists. */
function FormattedAssistantMessage({ content }: { content: string }) {
  const cleaned = stripAllCodeBlocksFromMessage(content);
  if (!cleaned) return null;
  const paragraphs = cleaned.split(/\n\n+/).filter(Boolean);
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {paragraphs.map((para, i) => {
        const trimmed = para.trim();
        const lines = trimmed.split('\n');
        const isList = lines.every((l) => /^[\s]*[-*•]\s/.test(l) || /^[\s]*\d+\.\s/.test(l));
        if (isList && lines.length > 0) {
          const items = lines.map((l) => l.replace(/^[\s]*[-*•]\s|^[\s]*\d+\.\s/, '').trim()).filter(Boolean);
          return (
            <ul key={i} className="list-disc list-inside space-y-1 pl-1">
              {items.map((item, j) => (
                <li key={j}>{formatInlineBold(item)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="min-w-0 break-words">
            {lines.map((line, j) => (
              <span key={j}>
                {formatInlineBold(line)}
                {j < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function formatInlineBold(text: string): ReactNode {
  const parts: React.ReactNode[] = [];
  let last = 0;
  const re = /\*\*([^*]+)\*\*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<strong key={m.index} className="font-semibold">{m[1]}</strong>);
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : <>{parts}</>;
}

function useAutoResizeTextarea(minHeight: number, maxHeight: number = 200) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }
      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight));
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) textarea.style.height = `${minHeight}px`;
  }, [minHeight]);

  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
}

export function AISetupClient() {
  const t = useTranslations('dashboard');
  const { toast } = useToast();
  const [accessAllowed, setAccessAllowed] = useState<boolean | null>(null);
  const [customBranding, setCustomBranding] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [plannerConfig, setPlannerConfig] = useState<AssistantPlannerConfig>({});
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [applyingSafe, setApplyingSafe] = useState(false);
  const [pendingLogoUrl, setPendingLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [publishResult, setPublishResult] = useState<{
    embed_code: string;
    webhook_url: string | null;
    webhook_secret: string | null;
    logs: { action: string; details: Record<string, unknown> }[];
  } | null>(null);
  const [testModeOpen, setTestModeOpen] = useState(false);
  const [progressStep, setProgressStep] = useState<number | null>(null);
  const [starterPromptsOpen, setStarterPromptsOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea(56, 200);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, loading, scrollToBottom]);

  const checkAccessAndLoad = useCallback(async () => {
    const res = await fetch('/api/ai-setup/sessions');
    if (res.status === 403) {
      setAccessAllowed(false);
      return;
    }
    setAccessAllowed(true);
    const data = await res.json().catch(() => ({}));
    setCustomBranding(data.entitlements?.custom_branding === true);

    let storedId: string | null = null;
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(AI_SETUP_SESSION_STORAGE_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw) as { sessionId?: string };
        storedId = typeof parsed.sessionId === 'string' ? parsed.sessionId : null;
      }
    } catch {
      storedId = null;
    }

    if (storedId) {
      const sessionRes = await fetch(`/api/ai-setup/sessions/${storedId}`);
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        const planner =
          typeof sessionData.planner_config === 'object' && sessionData.planner_config !== null
            ? (sessionData.planner_config as AssistantPlannerConfig)
            : {};
        setSessionId(sessionData.id as string);
        setPlannerConfig(planner);
        const rows = (sessionData.messages ?? []).filter(
          (m: { role: string }) => m.role === 'user' || m.role === 'assistant'
        );
        setMessages(
          rows.map((m: { id?: string; role: string; content: string; created_at?: string }) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content ?? '',
            created_at: m.created_at,
          }))
        );
        return;
      }
      try {
        localStorage.removeItem(AI_SETUP_SESSION_STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    checkAccessAndLoad();
  }, [checkAccessAndLoad]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (sessionId) {
        localStorage.setItem(AI_SETUP_SESSION_STORAGE_KEY, JSON.stringify({ sessionId }));
      } else {
        localStorage.removeItem(AI_SETUP_SESSION_STORAGE_KEY);
      }
    } catch {
      /* ignore */
    }
  }, [sessionId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = 'spaxio-ai-setup-intent';
    const stored = window.localStorage.getItem(key);
    if (stored && !input) {
      setInput(stored);
      window.localStorage.removeItem(key);
    }
  }, [input]);

  // Collapse starter prompts when user sends first message
  useEffect(() => {
    if (messages.length > 0) setStarterPromptsOpen(false);
  }, [messages.length]);

  const createSession = useCallback(async () => {
    const res = await fetch('/api/ai-setup/sessions', { method: 'POST' });
    if (!res.ok) return;
    const data = await res.json();
    setSessionId(data.id);
    setMessages([]);
    setPlannerConfig({});
    setPublishResult(null);
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    const hasLogo = !!pendingLogoUrl;
    if ((!text && !hasLogo) || loading) return;
    const contentToSend = text || (hasLogo ? t('aiSetupUseThisLogo') : '');
    if (!contentToSend && !hasLogo) return;

    // Ensure we have a session
    let effectiveSessionId = sessionId;
    if (!effectiveSessionId) {
      const createRes = await fetch('/api/ai-setup/sessions', { method: 'POST' });
      if (!createRes.ok) return;
      const createData = await createRes.json();
      effectiveSessionId = createData.id;
      setSessionId(effectiveSessionId);
      setMessages([]);
      setPlannerConfig({});
      setPublishResult(null);
    }

    const logoToSend = pendingLogoUrl;
    setInput('');
    setPendingLogoUrl(null);
    adjustHeight(true);
    setMessages((prev) => [...prev, { role: 'user', content: contentToSend || (hasLogo ? t('aiSetupLogoAttached') : '') }]);
    setLoading(true);
    setProgressStep(0);

    try {
      // Detect website URL — run quick-setup first for infer→draft→apply flow
      const urlMatch = contentToSend.match(/\b(https?:\/\/[^\s]+)/i);
      const websiteUrl = urlMatch ? urlMatch[1].replace(/[.,;:!?)]+$/, '') : null;

      let quickSetupResult: { applied?: string[]; analysis?: { business_name?: string | null; services_count?: number; faq_count?: number }; draft?: AssistantPlannerConfig } | null = null;
      if (websiteUrl && websiteUrl.startsWith('http')) {
        try {
          const quickRes = await fetch('/api/ai-setup/quick-setup-from-website', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: websiteUrl,
              session_id: effectiveSessionId,
            }),
          });
          const quickData = await quickRes.json();
          if (quickData.ok && quickData.draft) {
            quickSetupResult = {
              applied: quickData.applied ?? [],
              analysis: quickData.analysis ?? {},
              draft: quickData.draft,
            };
            setPlannerConfig(quickData.draft);
          }
        } catch {
          // Continue to chat even if quick-setup fails
        }
      }

      const res = await fetch(`/api/ai-setup/sessions/${effectiveSessionId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: contentToSend,
          ...(logoToSend ? { logo_url: logoToSend } : {}),
          ...(quickSetupResult ? { quick_setup_result: quickSetupResult } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.message) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.display_message || data.message.content }]);
      }
      if (data.planner_config) {
        setPlannerConfig(data.planner_config);
      }
      setProgressStep(null);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
      setProgressStep(null);
    } finally {
      setLoading(false);
    }
  }, [input, sessionId, loading, pendingLogoUrl, adjustHeight, t]);

  const handleLogoUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        toast({ title: t('aiSetupLogoInvalid'), variant: 'destructive' });
        return;
      }
      setLogoUploading(true);
      try {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch('/api/ai-setup/logo-upload', { method: 'POST', body: form });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast({ title: data.error || 'Upload failed', variant: 'destructive' });
          return;
        }
        if (data.url) setPendingLogoUrl(data.url);
      } finally {
        setLogoUploading(false);
        logoInputRef.current?.form?.reset();
      }
    },
    [toast, t]
  );

  const handlePublish = useCallback(async () => {
    if (!sessionId || publishing) return;
    setPublishing(true);
    setProgressStep(0);
    const steps = [1, 2, 3, 4];
    const stepInterval = setInterval(() => {
      setProgressStep((s) => (s === null ? 1 : Math.min(4, (s ?? 0) + 1)));
    }, 600);
    try {
      const res = await fetch('/api/ai-setup/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
      clearInterval(stepInterval);
      setProgressStep(null);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: 'Publish failed', description: data.error || 'Unknown error', variant: 'destructive' });
        return;
      }
      setPublishResult({
        embed_code: data.embed_code ?? '',
        webhook_url: data.webhook_url ?? null,
        webhook_secret: data.webhook_secret ?? null,
        logs: data.logs ?? [],
      });
      setPlannerConfig((c) => ({ ...c, publish_status: 'published' }));
      toast({ title: 'Setup published', description: 'Your website assistant and follow-up are live.' });
    } catch {
      clearInterval(stepInterval);
      setProgressStep(null);
      toast({ title: 'Publish failed', description: 'Network error', variant: 'destructive' });
    } finally {
      setPublishing(false);
    }
  }, [sessionId, publishing, toast]);

  const handleApplySafeChanges = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch('/api/ai-setup/apply-safe-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.applied?.length) {
        toast({ title: 'Safe changes applied', description: `${data.applied.length} field(s) updated in Settings.` });
      } else if (!res.ok) {
        toast({ title: data.error || 'Could not apply', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not apply changes', variant: 'destructive' });
    }
  }, [sessionId, toast]);

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: t('aiSetupCopied'), description: `${label} copied.` });
  }, [t, toast]);

  if (accessAllowed === null) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (accessAllowed === false) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('aiSetupAssistant')}</h1>
          <p className="text-muted-foreground">{t('aiSetupDescription')}</p>
        </div>
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-6">
            <p className="text-muted-foreground">{t('aiSetupSubscribeRequired')}</p>
            <Button className="mt-4" asChild>
              <a href="/dashboard/billing">{t('aiSetupUpgrade')} →</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('aiSetupAssistant')}</h1>
        <p className="text-muted-foreground">{t('aiSetupDescription')}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chat – v0-style layout, roomy messages area, starter prompts kept */}
        <div className="lg:col-span-2">
          <Card className="flex min-h-[640px] flex-col border-white/10 bg-card/80 backdrop-blur">
            <CardHeader className="border-b border-border/50 px-6 py-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-5 w-5 shrink-0 text-primary" />
                    {t('aiSetupChatTitle')}
                  </CardTitle>
                  <CardDescription>
                    {t('aiSetupChatDescription')}
                    <span className="mt-2 block text-xs text-muted-foreground/90">
                      {t('aiSetupChatRetentionHint', { hours: AI_SETUP_SESSION_TTL_HOURS })}
                    </span>
                  </CardDescription>
                </div>
                {sessionId && (
                  <Button variant="outline" size="sm" className="shrink-0 self-start" onClick={createSession}>
                    {t('aiSetupNewChat')}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
              {!sessionId ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12">
                  <Button onClick={createSession} className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    {t('aiSetupStartChat')}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto px-6 py-5">
                    <div className="mx-auto max-w-3xl space-y-5">
                      <div className="rounded-xl border border-dashed border-border/50 bg-muted/20 overflow-hidden">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
                          onClick={() => setStarterPromptsOpen((open) => !open)}
                        >
                          <span>{t('aiSetupStarterPrompts')}</span>
                          {starterPromptsOpen ? (
                            <ChevronDown className="h-4 w-4 shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0" />
                          )}
                        </button>
                        {starterPromptsOpen && (
                          <div className="space-y-1 border-t border-border/50 px-3 pb-3 pt-2">
                            {STARTER_KEYS.map((key) => (
                              <button
                                key={key}
                                type="button"
                                className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
                                onClick={() => setInput(t(key))}
                              >
                                {t(key)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {messages.map((m, i) => (
                        <div
                          key={i}
                          className={cn(
                            'flex gap-3 rounded-xl px-4 py-3 overflow-hidden',
                            m.role === 'user' ? 'bg-primary/10' : 'bg-muted/30'
                          )}
                        >
                          {m.role === 'user' ? (
                            <User className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                          ) : (
                            <Bot className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                          )}
                          <div className="min-w-0 flex-1">
                            {m.role === 'user' ? (
                              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.content}</p>
                            ) : (
                              <FormattedAssistantMessage content={m.content} />
                            )}
                          </div>
                        </div>
                      ))}
                      {loading && (
                        <div className="flex gap-3 rounded-xl bg-muted/30 px-4 py-3">
                          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary mt-0.5" />
                          <p className="text-sm text-muted-foreground">{t('aiSetupThinking')}</p>
                        </div>
                      )}
                      <div ref={messagesEndRef} aria-hidden />
                    </div>
                  </div>
                  <div className="border-t border-border/50 px-4 py-4">
                    <div className="mx-auto max-w-3xl">
                      {pendingLogoUrl && (
                        <div className="mb-3 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm">
                          <ImageIcon className="h-4 w-4 text-primary" />
                          <span className="flex-1">{t('aiSetupLogoAttached')}</span>
                          <button
                            type="button"
                            className="rounded p-1 hover:bg-black/10 dark:hover:bg-white/10"
                            onClick={() => setPendingLogoUrl(null)}
                            aria-label={t('aiSetupRemoveLogo')}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                      <div className="relative rounded-xl border border-border bg-muted/30 focus-within:ring-2 focus-within:ring-ring/50 focus-within:ring-offset-2 focus-within:ring-offset-background">
                        <div className="overflow-hidden">
                          <Textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => {
                              setInput(e.target.value);
                              adjustHeight();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage();
                              }
                            }}
                            placeholder={t('aiSetupChatPlaceholder')}
                            className={cn(
                              'min-h-[56px] w-full resize-none border-0 bg-transparent px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0'
                            )}
                            style={{ overflow: 'hidden' }}
                            disabled={loading}
                          />
                        </div>
                        <div className="flex items-center justify-between border-t border-border/50 px-2 py-2">
                          <div className="flex items-center gap-1">
                            {customBranding && (
                              <>
                                <input
                                  ref={logoInputRef}
                                  type="file"
                                  accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                                  className="hidden"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleLogoUpload(f);
                                  }}
                                />
                                <button
                                  type="button"
                                  className="flex items-center gap-1.5 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                  onClick={() => logoInputRef.current?.click()}
                                  disabled={logoUploading}
                                  title={t('aiSetupAttachLogo')}
                                >
                                  {logoUploading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <ImageIcon className="h-4 w-4" />
                                  )}
                                  <span className="text-xs hidden sm:inline">{t('aiSetupAttachLogo')}</span>
                                </button>
                              </>
                            )}
                          </div>
                          <Button
                            onClick={sendMessage}
                            disabled={loading || (!input.trim() && !pendingLogoUrl)}
                            size="sm"
                            className="rounded-lg gap-1.5"
                          >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            <span className="sr-only">{t('aiSetupSend')}</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary panel */}
        <div className="space-y-4">
          <Card className="border-white/10 bg-card/80 backdrop-blur">
            <CardHeader className="py-4">
              <CardTitle className="text-base">{t('aiSetupSummary')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{t('aiSetupGoal')}</p>
                <p className="mt-0.5">{plannerConfig.primary_goal || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">{t('aiSetupLeadFields')}</p>
                <p className="mt-0.5">
                  {plannerConfig.capture_fields?.length
                    ? plannerConfig.capture_fields.map((f) => f.label).join(', ')
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">{t('aiSetupAutomations')}</p>
                <p className="mt-0.5">
                  {plannerConfig.applied_templates?.length
                    ? plannerConfig.applied_templates.join(', ')
                    : plannerConfig.automation_type
                      ? Array.isArray(plannerConfig.automation_type)
                        ? plannerConfig.automation_type.join(', ')
                        : plannerConfig.automation_type
                      : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">{t('aiSetupNotification')}</p>
                <p className="mt-0.5">{plannerConfig.notification_email || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">{t('aiSetupWidgetStatus')}</p>
                <p className="mt-0.5">{plannerConfig.widget_enabled !== false ? 'Enabled' : 'Disabled'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">{t('aiSetupWebhookStatus')}</p>
                <p className="mt-0.5">{plannerConfig.webhook_enabled ? 'Enabled' : '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">{t('aiSetupPublishStatus')}</p>
                <p className="mt-0.5">
                  {plannerConfig.publish_status === 'published' ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="h-4 w-4" /> Published
                    </span>
                  ) : (
                    'Draft'
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {sessionId && plannerConfig.publish_status !== 'published' && (
            <>
              <Button variant="outline" size="sm" className="w-full" onClick={handleApplySafeChanges}>
                Apply safe changes to live settings
              </Button>
              {progressStep !== null && (
                <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-xs">
                  <p className="font-medium text-muted-foreground">Progress</p>
                  <ul className="mt-2 space-y-1">
                    {[t('aiSetupProgressUnderstanding'), t('aiSetupProgressBuilding'), t('aiSetupProgressAutomations'), t('aiSetupProgressDeploying')].map((label, i) => (
                      <li key={i} className={cn('flex items-center gap-2', progressStep !== null && i + 1 <= progressStep && 'text-primary')}>
                        {progressStep !== null && i + 1 <= progressStep ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />}
                        {label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Button className="w-full gap-2" onClick={handlePublish} disabled={publishing}>
                {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {publishing ? t('aiSetupPublishing') : t('aiSetupPublish')}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Test mode */}
      <Card className="border-white/10 bg-card/80 backdrop-blur">
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-left"
          onClick={() => setTestModeOpen((o) => !o)}
        >
          <CardTitle className="text-base">{t('aiSetupTestMode')}</CardTitle>
          {testModeOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        {testModeOpen && (
          <CardContent className="border-t border-border/50 pt-4">
            <p className="text-sm text-muted-foreground">{t('aiSetupTestModeDescription')}</p>
            <div className="mt-3 rounded-lg border border-dashed border-border/50 bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">
                Simulated visitor would see: welcome message &quot;{plannerConfig.widget_config?.welcomeMessage || 'Hi! How can I help you today?'}&quot;. 
                Fields to collect: {plannerConfig.capture_fields?.length ? plannerConfig.capture_fields.map((f) => f.label).join(', ') : 'none yet'}.
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Generated outputs (after publish) */}
      {publishResult && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              {t('aiSetupGeneratedOutputs')}
            </CardTitle>
            <CardDescription>{t('aiSetupWhatCreated')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {publishResult.embed_code && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">{t('aiSetupEmbedCode')}</p>
                <pre className="mt-1 overflow-x-auto rounded-lg bg-muted/50 p-3 text-xs">{publishResult.embed_code}</pre>
                <div className="mt-2 flex gap-2">
                  <CopyScript text={publishResult.embed_code} copyCodeLabel={t('aiSetupCopyCode')} copiedButtonLabel={t('aiSetupCopied')} />
                </div>
              </div>
            )}
            {publishResult.webhook_url && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">{t('aiSetupWebhookUrl')}</p>
                <p className="mt-1 break-all font-mono text-xs">{publishResult.webhook_url}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => copyToClipboard(publishResult.webhook_url!, 'Webhook URL')}>
                  <Copy className="mr-2 h-4 w-4" /> {t('aiSetupCopyCode')}
                </Button>
              </div>
            )}
            {publishResult.webhook_secret && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">{t('aiSetupWebhookSecret')}</p>
                <p className="mt-1 break-all font-mono text-xs">{publishResult.webhook_secret}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => copyToClipboard(publishResult!.webhook_secret!, 'Webhook secret')}>
                  <Copy className="mr-2 h-4 w-4" /> {t('aiSetupCopyCode')}
                </Button>
              </div>
            )}
            {publishResult.logs.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">{t('aiSetupActivityLog')}</p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {publishResult.logs.map((log, i) => (
                    <li key={i}>{log.action}: {JSON.stringify(log.details)}</li>
                  ))}
                </ul>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={createSession}>
              {t('aiSetupRegenerateEdit')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
