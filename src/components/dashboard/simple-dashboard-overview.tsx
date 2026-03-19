'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
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

type OverviewData = {
  leadsCount?: number;
  quoteRequestsCount?: number;
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
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchLatestRun() {
      try {
        const res = await fetch('/api/website-auto-setup/latest');
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        if (data.run_id && data.status) {
          setWebsiteSetupStatus({
            status: data.status,
            current_step: data.current_step,
            run_id: data.run_id,
          });
        }
      } catch {
        // ignore
      }
    }
    fetchLatestRun();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchProgress() {
      try {
        const res = await fetch('/api/setup-progress');
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setSetupProgress(data);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingProgress(false);
      }
    }
    fetchProgress();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchOverview() {
      try {
        const [leadsRes, quotesRes] = await Promise.all([
          fetch('/api/leads?limit=100'),
          fetch('/api/inbox/leads?type=quote_requests&limit=100'),
        ]);
        if (cancelled) return;
        const overviewData: OverviewData = {};
        if (leadsRes.ok) {
          const leadsData = await leadsRes.json();
          overviewData.leadsCount = Array.isArray(leadsData.leads) ? leadsData.leads.length : 0;
        }
        if (quotesRes.ok) {
          const quotesData = await quotesRes.json();
          overviewData.quoteRequestsCount = Array.isArray(quotesData.items) ? quotesData.items.length : 0;
        }
        if (!cancelled) setOverview(overviewData);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingOverview(false);
      }
    }
    fetchOverview();
    return () => {
      cancelled = true;
    };
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
  const step4Done = false; // No way to verify widget install yet
  const completedSteps = [step1Done, step2Done, step3Done, step4Done].filter(Boolean).length;
  const totalSteps = 4;
  const percentComplete = Math.round((completedSteps / totalSteps) * 100);

  // Primary CTA based on progress
  const getPrimaryCta = () => {
    if (isSetupRunning) return null;
    if (!step1Done || !step2Done) {
      return {
        label: step1Done ? 'Continue setup' : 'Set up my assistant',
        href: '/dashboard/ai-setup',
        icon: Sparkles,
      };
    }
    if (!step3Done) {
      return {
        label: 'Finish setup',
        href: '/dashboard/ai-setup',
        icon: Sparkles,
      };
    }
    if (!step4Done) {
      return {
        label: 'Install on my website',
        href: '/dashboard/install',
        icon: Copy,
      };
    }
    if ((overview?.leadsCount ?? 0) > 0 || (overview?.quoteRequestsCount ?? 0) > 0) {
      return {
        label: 'View leads & conversations',
        href: '/dashboard/leads',
        icon: Users,
      };
    }
    return {
      label: 'Test your widget',
      href: '/dashboard/install',
      icon: Globe,
    };
  };

  const primaryCta = getPrimaryCta();

  const handleGoToAiSetup = () => {
    try {
      if (intent.trim()) window.localStorage.setItem(INTENT_STORAGE_KEY, intent.trim());
    } catch {
      // ignore
    }
    router.push('/dashboard/ai-setup');
  };

  const handleDoItForMe = () => {
    setRunningDoItForMe(true);
    try {
      window.localStorage.setItem(
        INTENT_STORAGE_KEY,
        intent.trim() ||
          'Set up my website assistant, lead capture, and follow-up. Ask me a few simple questions and configure everything for me.'
      );
    } catch {
      // ignore
    }
    router.push('/dashboard/ai-setup?mode=guided');
  };

  const recommendations = [
    !step1Done && 'Add your business info so the assistant can introduce itself properly.',
    !step2Done && !isSetupRunning && 'Connect your website URL so the assistant learns your business.',
    step2Done && !step3Done && 'Review and publish your assistant settings.',
    step3Done && !step4Done && 'Copy the install code and add it to your website.',
    step4Done && (overview?.leadsCount ?? 0) === 0 && (overview?.quoteRequestsCount ?? 0) === 0 && 'Test the widget on your site to make sure it works.',
    (overview?.leadsCount ?? 0) > 0 && 'Review new leads and follow up from the Leads page.',
    (overview?.quoteRequestsCount ?? 0) > 0 && 'Check quote requests and send estimates.',
  ].filter(Boolean) as string[];

  if (recommendations.length === 0) {
    recommendations.push('Your assistant is live. Check Conversations and Leads regularly.');
  }

  return (
    <div className="space-y-8">
      {/* Next best action - prominent guidance */}
      {!isSetupRunning && <NextBestActionCard />}

      <SimplePageHeader
        title="Your website assistant"
        description="Answer questions, capture leads, and collect quote requests—all from one chat on your site."
      />

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
        </CardContent>
      </Card>

      {/* Setup in progress - visible status so user knows what's happening */}
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

      {/* Website setup complete – milestone success */}
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
              <Globe className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-base">Setup had an issue</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/ai-setup')}>
              Try again
            </Button>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Something went wrong. You can run setup again from AI Setup.
            </CardDescription>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {!loadingOverview && (overview?.leadsCount !== undefined || overview?.quoteRequestsCount !== undefined) && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(overview?.leadsCount ?? 0) >= 0 && (
            <SimpleStatusCard
              title="Leads"
              value={loadingOverview ? '…' : (overview?.leadsCount ?? 0)}
              subtitle="From your assistant"
              icon={<Users className="h-4 w-4" />}
            />
          )}
          {(overview?.quoteRequestsCount ?? 0) >= 0 && (
            <SimpleStatusCard
              title="Quote requests"
              value={loadingOverview ? '…' : (overview?.quoteRequestsCount ?? 0)}
              subtitle="Recent"
              icon={<MessageSquare className="h-4 w-4" />}
            />
          )}
        </div>
      )}

      {/* Quick actions - contextual */}
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

function StepItem({ label, done }: { label: string; done: boolean }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${done ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`}
      />
      <span className={done ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </li>
  );
}
