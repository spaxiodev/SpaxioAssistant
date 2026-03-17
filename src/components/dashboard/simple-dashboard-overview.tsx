'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Wand2,
  Upload,
  Users,
  Globe,
  Loader2,
  CheckCircle2,
  MessageSquare,
  Zap,
  FileText,
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
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

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

  const totalSteps = 5;
  const completedSteps = websiteSetupStatus?.status === 'done' ? 2 : 0;
  const percentComplete = Math.min(100, Math.round((completedSteps / totalSteps) * 100) + (overview?.leadsCount ? 20 : 0));

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
    percentComplete < 100 && 'Finish setup so your assistant can go live on your website.',
    (overview?.leadsCount ?? 0) === 0 && 'Add your website URL so the assistant learns your business and can answer accurately.',
    (overview?.leadsCount ?? 0) > 0 && 'Review new leads and follow up from the Leads page.',
    'Install the widget on your site and preview it.',
  ].filter(Boolean) as string[];

  if (recommendations.length === 0) {
    recommendations.push('Check Analytics to see how your assistant is performing.');
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary w-fit">
        Simple Mode
      </div>
      <SimplePageHeader
        title="Your website assistant, ready to launch"
        description="Teach it your business, answer customer questions, capture leads, collect quote requests, and automate follow-up—without extra admin work."
      />

      {/* Setup progress */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Launch checklist</CardTitle>
          <span className="text-sm text-muted-foreground">{percentComplete}%</span>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={percentComplete} />
          <ul className="space-y-2 text-sm">
            <StepItem label="Add your website URL" done={websiteSetupStatus?.status === 'done' || completedSteps > 0} />
            <StepItem label="Review business info" done={websiteSetupStatus?.status === 'done' || completedSteps > 0} />
            <StepItem label="Set what to capture (leads + quote requests)" done={(overview?.leadsCount ?? 0) > 0} />
            <StepItem label="Install the widget on your site" done={false} />
            <StepItem label="Go live" done={percentComplete >= 80} />
          </ul>
        </CardContent>
      </Card>

      {/* Widget / auto-setup status */}
      {websiteSetupStatus?.status && ['pending', 'scanning', 'building_knowledge', 'creating_agents', 'creating_automations', 'configuring_widget'].includes(websiteSetupStatus.status) && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-3 pt-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="font-medium">Setup in progress</p>
              <p className="text-sm text-muted-foreground">{websiteSetupStatus.current_step ?? websiteSetupStatus.status}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {(websiteSetupStatus?.status === 'done' || websiteSetupStatus?.status === 'failed') && (
        <Card
          className={
            websiteSetupStatus.status === 'done'
              ? 'border-green-500/30 bg-green-500/5'
              : 'border-amber-500/30 bg-amber-500/5'
          }
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              {websiteSetupStatus.status === 'done' ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Globe className="h-5 w-5 text-amber-600" />
              )}
              <CardTitle className="text-base">
                {websiteSetupStatus.status === 'done' ? 'Website setup complete' : 'Website setup had an issue'}
              </CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/ai-setup')}>
              Set up again
            </Button>
          </CardHeader>
          <CardContent>
            <CardDescription>
              {websiteSetupStatus.status === 'done'
                ? 'Your site was scanned and your website assistant was set up with starting knowledge and follow-up options.'
                : 'Something went wrong. You can run setup again from AI Setup.'}
            </CardDescription>
          </CardContent>
        </Card>
      )}

      {/* Business snapshot / recent activity */}
      {!loadingOverview && (overview?.leadsCount !== undefined || overview?.quoteRequestsCount !== undefined) && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(overview?.leadsCount ?? 0) >= 0 && (
            <SimpleStatusCard
              title="Leads captured"
              value={loadingOverview ? '…' : (overview?.leadsCount ?? 0)}
              subtitle="From your assistant"
              icon={<Users className="h-4 w-4" />}
            />
          )}
          {(overview?.quoteRequestsCount ?? 0) >= 0 && (
            <SimpleStatusCard
              title="Quote requests"
              value={loadingOverview ? '…' : (overview?.quoteRequestsCount ?? 0)}
              subtitle="Recent requests"
              icon={<MessageSquare className="h-4 w-4" />}
            />
          )}
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SimpleQuickActionCard
            title="Set up from your website URL"
            description="Scan your site so the assistant learns your business and you can go live faster."
            icon={Globe}
            onClick={() => router.push('/dashboard/ai-setup')}
          />
          <SimpleQuickActionCard
            title="Review business info"
            description="Make sure your services, pricing notes, and FAQ are accurate."
            icon={FileText}
            onClick={() => router.push('/dashboard/settings')}
          />
          <SimpleQuickActionCard
            title="Install & preview widget"
            description="Install the assistant on your website and preview it."
            icon={Globe}
            onClick={() => router.push('/dashboard/install')}
          />
          <SimpleQuickActionCard
            title="Review leads"
            description="View and manage people who contacted you through the assistant."
            icon={Users}
            onClick={() => router.push('/dashboard/leads')}
          />
          <SimpleQuickActionCard
            title="Add more knowledge"
            description="Add pages or files so the assistant answers from your real content."
            icon={Upload}
            onClick={() => router.push('/dashboard/knowledge')}
          />
          <SimpleQuickActionCard
            title="Set up follow-up"
            description="Notify your team or follow up automatically when someone reaches out."
            icon={Zap}
            onClick={() => router.push('/dashboard/automations')}
          />
        </div>
      </div>

      {/* Do It For Me – one option among others */}
      <SimpleActionCard
        title="Tell us what you want to achieve"
        description="Describe your business and what you want the assistant to handle. We’ll guide you through setup step by step."
        icon={<Wand2 className="h-5 w-5" />}
        variant="primary"
      >
        <div className="space-y-3">
          <Textarea
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="e.g. Answer common questions, capture leads, and collect quote requests. Email me when someone needs a quote."
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
        className={`h-2.5 w-2.5 rounded-full ${done ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`}
      />
      <span className={done ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </li>
  );
}
