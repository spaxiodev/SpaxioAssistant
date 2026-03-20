'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Wand2,
  Users,
  Globe,
  Loader2,
  CheckCircle2,
  MessageSquare,
  ArrowRight,
  Copy,
  TrendingUp,
  AlertCircle,
  FileText,
  X,
  ChevronRight,
  Star,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  SimplePageHeader,
  SimpleQuickActionCard,
  SimpleStatusCard,
  SimpleRecommendations,
  SimpleActionCard,
  NextBestActionCard,
  PreviewAssistantButton,
  MilestoneSuccessPanel,
} from '@/components/dashboard/simple';
import type { DashboardIntelligenceResponse } from '@/app/api/dashboard/intelligence/route';

const INTENT_STORAGE_KEY = 'spaxio-ai-setup-intent';

type SetupRunStatus =
  | 'pending'
  | 'scanning'
  | 'building_knowledge'
  | 'creating_agents'
  | 'creating_automations'
  | 'configuring_widget'
  | 'done'
  | 'failed';

type SetupProgress = {
  businessInfoDone: boolean;
  aiTrainedDone: boolean;
  widgetReadyDone: boolean;
  hasWebsiteUrl: boolean;
};

export function SimpleDashboardOverview() {
  const router = useRouter();
  const [intent, setIntent] = useState('');
  const [runningDoItForMe, setRunningDoItForMe] = useState(false);
  const [websiteSetupStatus, setWebsiteSetupStatus] = useState<{
    status: SetupRunStatus;
    current_step?: string;
    run_id?: string;
  } | null>(null);
  const [setupProgress, setSetupProgress] = useState<SetupProgress | null>(null);
  const [intelligence, setIntelligence] = useState<DashboardIntelligenceResponse | null>(null);
  const [loadingIntelligence, setLoadingIntelligence] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  // Fetch latest website setup run
  useEffect(() => {
    let cancelled = false;
    async function fetchLatestRun() {
      try {
        const res = await fetch('/api/website-auto-setup/latest');
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        if (data.run_id && data.status) {
          setWebsiteSetupStatus({ status: data.status, current_step: data.current_step, run_id: data.run_id });
        }
      } catch { /* ignore */ }
    }
    fetchLatestRun();
    return () => { cancelled = true; };
  }, []);

  // Fetch setup progress
  useEffect(() => {
    let cancelled = false;
    async function fetchProgress() {
      try {
        const res = await fetch('/api/setup-progress');
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setSetupProgress(data);
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoadingProgress(false); }
    }
    fetchProgress();
    return () => { cancelled = true; };
  }, []);

  // Fetch live intelligence (leads, quotes, suggestions, signals)
  useEffect(() => {
    let cancelled = false;
    async function fetchIntelligence() {
      try {
        const res = await fetch('/api/dashboard/intelligence');
        if (!res.ok || cancelled) return;
        const data: DashboardIntelligenceResponse = await res.json();
        if (!cancelled) setIntelligence(data);
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoadingIntelligence(false); }
    }
    fetchIntelligence();
    return () => { cancelled = true; };
  }, []);

  const handleDismissSuggestion = useCallback(async (id: string) => {
    setDismissedSuggestions((prev) => new Set([...prev, id]));
    try {
      await fetch('/api/ai-suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'dismiss' }),
      });
    } catch { /* ignore */ }
  }, []);

  const progress = setupProgress ?? {
    businessInfoDone: false,
    aiTrainedDone: false,
    widgetReadyDone: false,
    hasWebsiteUrl: false,
  };

  const isSetupRunning = websiteSetupStatus?.status &&
    ['pending', 'scanning', 'building_knowledge', 'creating_agents', 'creating_automations', 'configuring_widget'].includes(websiteSetupStatus.status);

  const step1Done = progress.businessInfoDone || websiteSetupStatus?.status === 'done';
  const step2Done = progress.aiTrainedDone || websiteSetupStatus?.status === 'done';
  const step3Done = progress.widgetReadyDone;
  const step4Done = false;
  const completedSteps = [step1Done, step2Done, step3Done, step4Done].filter(Boolean).length;
  const totalSteps = 4;
  const percentComplete = Math.round((completedSteps / totalSteps) * 100);

  const stats = intelligence?.stats;
  const highPriorityLeads = intelligence?.high_priority_leads ?? [];
  const pendingQuotes = intelligence?.pending_quotes ?? [];
  const activeSuggestions = (intelligence?.suggestions ?? []).filter((s) => !dismissedSuggestions.has(s.id));
  const signals = intelligence?.signals ?? [];

  // Primary CTA
  const getPrimaryCta = () => {
    if (isSetupRunning) return null;
    if (!step1Done || !step2Done) {
      return { label: step1Done ? 'Continue setup' : 'Set up my assistant', href: '/dashboard/ai-setup', icon: Sparkles };
    }
    if (!step3Done) return { label: 'Finish setup', href: '/dashboard/ai-setup', icon: Sparkles };
    if (!step4Done) return { label: 'Install on my website', href: '/dashboard/install', icon: Copy };
    if ((stats?.total_leads ?? 0) > 0 || (stats?.pending_quotes ?? 0) > 0) {
      return { label: 'View leads & conversations', href: '/dashboard/leads', icon: Users };
    }
    return { label: 'Test your widget', href: '/dashboard/install', icon: Globe };
  };
  const primaryCta = getPrimaryCta();

  const handleGoToAiSetup = () => {
    try { if (intent.trim()) window.localStorage.setItem(INTENT_STORAGE_KEY, intent.trim()); } catch { /* ignore */ }
    router.push('/dashboard/ai-setup');
  };

  const handleDoItForMe = () => {
    setRunningDoItForMe(true);
    try {
      window.localStorage.setItem(
        INTENT_STORAGE_KEY,
        intent.trim() || 'Set up my website assistant, lead capture, and follow-up. Ask me a few simple questions and configure everything for me.'
      );
    } catch { /* ignore */ }
    router.push('/dashboard/ai-setup?mode=guided');
  };

  // Build simple recommendations from state
  const recommendations = [
    !step1Done && 'Add your business info so the assistant can introduce itself properly.',
    !step2Done && !isSetupRunning && 'Connect your website URL so the assistant learns your business.',
    step2Done && !step3Done && 'Review and publish your assistant settings.',
    step3Done && !step4Done && 'Copy the install code and add it to your website.',
    step4Done && (stats?.total_leads ?? 0) === 0 && 'Test the widget on your site to make sure it works.',
    (stats?.total_leads ?? 0) > 0 && 'Review new leads and follow up from the Leads page.',
    (stats?.pending_quotes ?? 0) > 0 && 'Check quote requests and send estimates.',
  ].filter(Boolean) as string[];

  if (recommendations.length === 0) {
    recommendations.push('Your assistant is live. Check Conversations and Leads regularly.');
  }

  const isLive = step1Done && step2Done;

  return (
    <div className="space-y-8">
      {/* Next best action - prominent guidance */}
      {!isSetupRunning && <NextBestActionCard />}

      <SimplePageHeader
        title="Your AI receptionist"
        description="Answer questions 24/7, capture leads, qualify requests, and collect quote estimates — all from one smart assistant on your site."
      />

      {/* === LIVE INTELLIGENCE PANEL (shown when active) === */}
      {isLive && !loadingIntelligence && signals.length > 0 && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">What needs your attention</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {signals.map((signal, i) => (
              <button
                key={i}
                onClick={() => router.push(signal.href)}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <SignalIcon type={signal.type} />
                  <span>{signal.label}</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* === HIGH-PRIORITY LEADS === */}
      {isLive && highPriorityLeads.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-sm font-semibold">High-priority leads</CardTitle>
            </div>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => router.push('/dashboard/leads')}>
              View all <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {highPriorityLeads.slice(0, 3).map((lead) => (
              <button
                key={lead.id}
                onClick={() => router.push('/dashboard/leads')}
                className="flex w-full items-start gap-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5 text-left hover:bg-muted/60 transition-colors"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-semibold dark:bg-amber-900/30 dark:text-amber-400">
                  {lead.name?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{lead.name}</span>
                    {lead.qualification_score != null && (
                      <span className="text-xs text-muted-foreground shrink-0">Score: {lead.qualification_score}</span>
                    )}
                  </div>
                  {lead.qualification_summary && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{lead.qualification_summary}</p>
                  )}
                  {lead.next_recommended_action && (
                    <p className="text-xs text-primary font-medium mt-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {lead.next_recommended_action}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* === PENDING QUOTE REQUESTS === */}
      {isLive && pendingQuotes.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <CardTitle className="text-sm font-semibold">Quote requests pending review</CardTitle>
            </div>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => router.push('/dashboard/quote-requests')}>
              Review <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingQuotes.slice(0, 3).map((quote) => (
              <button
                key={quote.id}
                onClick={() => router.push('/dashboard/quote-requests')}
                className="flex w-full items-center gap-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5 text-left hover:bg-muted/60 transition-colors"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-semibold dark:bg-blue-900/30 dark:text-blue-400">
                  {quote.name?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium truncate">{quote.name}</span>
                  {quote.service_type && (
                    <p className="text-xs text-muted-foreground truncate">{quote.service_type}</p>
                  )}
                </div>
                <Badge variant="outline" className="text-xs shrink-0">Pending</Badge>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Setup progress */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Setup progress</CardTitle>
          {!loadingProgress && (
            <span className="text-sm text-muted-foreground">{percentComplete}%</span>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={percentComplete} className="h-2" />
          <ul className="space-y-2 text-sm">
            <StepItem label="Business info" done={step1Done} />
            <StepItem label="AI trained on your business" done={step2Done} />
            <StepItem label="Widget ready" done={step3Done} />
            <StepItem label="Installed on your site" done={step4Done} />
          </ul>
          {primaryCta && (
            <Button size="sm" className="gap-2 mt-1" onClick={() => router.push(primaryCta.href)}>
              <primaryCta.icon className="h-4 w-4" />
              {primaryCta.label}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Setup in progress */}
      {isSetupRunning && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-3 pt-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
            <div>
              <p className="font-medium">Preparing your assistant</p>
              <p className="text-sm text-muted-foreground">
                {(() => {
                  const step = websiteSetupStatus?.current_step ?? websiteSetupStatus?.status ?? '';
                  const labels: Record<string, string> = {
                    pending: 'Starting…',
                    scanning: 'Analyzing your website…',
                    building_knowledge: 'Building your knowledge base…',
                    creating_agents: 'Creating your assistant…',
                    creating_automations: 'Setting up auto follow-up…',
                    configuring_widget: 'Configuring your chat widget…',
                  };
                  return labels[step] ?? step;
                })()}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Website setup complete */}
      {websiteSetupStatus?.status === 'done' && (
        <MilestoneSuccessPanel
          headline="Setup complete"
          description="Your assistant is ready. Go to Install to copy the code and add it to your website."
          nextStep={{ label: 'Install on my website', href: '/dashboard/install' }}
          icon={CheckCircle2}
        />
      )}

      {/* Setup failed */}
      {websiteSetupStatus?.status === 'failed' && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-base">Setup had an issue</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/ai-setup')}>
              Try again
            </Button>
          </CardHeader>
          <CardContent>
            <CardDescription>Something went wrong. You can run setup again from AI Setup.</CardDescription>
          </CardContent>
        </Card>
      )}

      {/* === STATS GRID === */}
      {!loadingIntelligence && stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SimpleStatusCard
            title="Total leads"
            value={stats.total_leads}
            subtitle={stats.leads_last_7d > 0 ? `+${stats.leads_last_7d} this week` : 'From your assistant'}
            icon={<Users className="h-4 w-4" />}
          />
          <SimpleStatusCard
            title="Quote requests"
            value={stats.pending_quotes > 0 ? `${stats.pending_quotes} pending` : (intelligence?.stats.total_leads ?? 0).toString()}
            subtitle={stats.pending_quotes > 0 ? 'Need your review' : 'All reviewed'}
            icon={<FileText className="h-4 w-4" />}
          />
          <SimpleStatusCard
            title="Conversations"
            value={stats.conversations_last_7d}
            subtitle="Last 7 days"
            icon={<MessageSquare className="h-4 w-4" />}
          />
          {stats.conversion_rate_pct != null ? (
            <SimpleStatusCard
              title="Lead conversion"
              value={`${stats.conversion_rate_pct}%`}
              subtitle="Conversations → leads (30d)"
              icon={<TrendingUp className="h-4 w-4" />}
            />
          ) : (
            <SimpleStatusCard
              title="High priority"
              value={stats.high_priority_leads}
              subtitle="High-intent leads this month"
              icon={<Star className="h-4 w-4" />}
            />
          )}
        </div>
      )}

      {/* === AI SUGGESTIONS === */}
      {activeSuggestions.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Recommended improvements</h2>
          </div>
          <div className="space-y-3">
            {activeSuggestions.slice(0, 3).map((suggestion) => (
              <AiSuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onDismiss={() => handleDismissSuggestion(suggestion.id)}
                onAction={() => {
                  if (suggestion.action_href) router.push(suggestion.action_href);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Quick actions</h2>
          <PreviewAssistantButton />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SimpleQuickActionCard
            title="Set up from website URL"
            description="Scan your site so the assistant learns your business."
            icon={Globe}
            onClick={() => router.push('/dashboard/ai-setup')}
          />
          <SimpleQuickActionCard
            title="Install on my site"
            description="Copy the code and add the chat to your website."
            icon={Copy}
            onClick={() => router.push('/dashboard/install')}
          />
          <SimpleQuickActionCard
            title="View leads"
            description="See who contacted you through the assistant."
            icon={Users}
            onClick={() => router.push('/dashboard/leads')}
          />
        </div>
      </div>

      {/* Guided setup */}
      <SimpleActionCard
        title="Describe what you want"
        description="Tell us your goals and we'll guide you step by step."
        icon={<Wand2 className="h-5 w-5" />}
        variant="primary"
      >
        <div className="space-y-3">
          <Textarea
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="e.g. Answer questions, capture leads, collect quote requests. Email me when someone needs a quote."
            className="min-h-[80px] resize-y text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="gap-2" onClick={handleDoItForMe} disabled={runningDoItForMe}>
              <Wand2 className="h-4 w-4" />
              Start guided setup
            </Button>
            <Button size="sm" variant="outline" className="gap-2" onClick={handleGoToAiSetup}>
              <Sparkles className="h-4 w-4" />
              Open AI Setup
            </Button>
          </div>
        </div>
      </SimpleActionCard>

      <SimpleRecommendations items={recommendations} />
    </div>
  );
}

// --- Sub-components ---

function StepItem({ label, done }: { label: string; done: boolean }) {
  return (
    <li className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${done ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
      <span className={done ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </li>
  );
}

function SignalIcon({ type }: { type: string }) {
  switch (type) {
    case 'high_priority_lead':
      return <Star className="h-3.5 w-3.5 text-amber-500 shrink-0" />;
    case 'pending_quote':
      return <FileText className="h-3.5 w-3.5 text-blue-500 shrink-0" />;
    case 'new_lead':
      return <Users className="h-3.5 w-3.5 text-green-500 shrink-0" />;
    case 'active_conversation':
      return <MessageSquare className="h-3.5 w-3.5 text-primary shrink-0" />;
    default:
      return <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
  }
}

function AiSuggestionCard({
  suggestion,
  onDismiss,
  onAction,
}: {
  suggestion: { id: string; title: string; description: string; action_href: string | null; action_label: string | null };
  onDismiss: () => void;
  onAction: () => void;
}) {
  return (
    <Card className="border-primary/15 bg-primary/5">
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{suggestion.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{suggestion.description}</p>
            {suggestion.action_href && (
              <Button size="sm" variant="link" className="h-auto px-0 py-1 text-xs text-primary" onClick={onAction}>
                {suggestion.action_label ?? 'Take action'} <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            )}
          </div>
          <button
            onClick={onDismiss}
            aria-label="Dismiss suggestion"
            className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
