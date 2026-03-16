'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Wand2, Upload, BookOpen, Users, PlayCircle, Globe, Loader2, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';

const INTENT_STORAGE_KEY = 'spaxio-ai-setup-intent';

type SetupRunStatus = 'pending' | 'scanning' | 'building_knowledge' | 'creating_agents' | 'creating_automations' | 'configuring_widget' | 'done' | 'failed';

export function SimpleDashboardOverview() {
  const router = useRouter();
  const [intent, setIntent] = useState('');
  const [runningDoItForMe, setRunningDoItForMe] = useState(false);
  const [websiteSetupStatus, setWebsiteSetupStatus] = useState<{ status: SetupRunStatus; current_step?: string; run_id?: string } | null>(null);

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
    return () => { cancelled = true; };
  }, []);

  const totalSteps = 5;
  const completedSteps = 0;
  const percentComplete = Math.round((completedSteps / totalSteps) * 100);

  const handleGoToAiSetup = () => {
    try {
      if (intent.trim()) {
        window.localStorage.setItem(INTENT_STORAGE_KEY, intent.trim());
      }
    } catch {
      // ignore storage errors
    }
    router.push('/dashboard/ai-setup');
  };

  const handleDoItForMe = () => {
    setRunningDoItForMe(true);
    try {
      window.localStorage.setItem(
        INTENT_STORAGE_KEY,
        intent.trim() ||
          'Set up my chatbot, lead capture, and automations. Ask me a few simple questions and configure everything for me.'
      );
    } catch {
      // ignore storage errors
    }
    router.push('/dashboard/ai-setup?mode=guided');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Welcome to Spaxio Assistant</h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Tell Spaxio what you want, and it sets everything up for you. Your AI chatbot, lead capture, and automations—configured in plain language.
        </p>
      </div>

      <Card className="border-primary/40 bg-primary/5">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5 text-primary" />
              Setup AI control center
            </CardTitle>
            <CardDescription>
              Tell Spaxio what you want to build. The AI will configure your chatbot, lead capture, automations, and notifications.
            </CardDescription>
          </div>
          <Button
            size="lg"
            className="gap-2"
            onClick={handleDoItForMe}
            disabled={runningDoItForMe}
          >
            <Wand2 className="h-4 w-4" />
            Do It For Me
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border bg-background/70 p-4">
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              Tell Spaxio what you want to build
            </p>
            <Textarea
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="e.g. Build my chatbot, set up lead capture, and send me an email when someone fills out the form."
              className="min-h-[96px] resize-vertical"
            />
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>Example prompts:</span>
              <button
                type="button"
                className="rounded-full border bg-background px-3 py-1 hover:border-primary/40 hover:text-foreground"
                onClick={() => setIntent('Build my chatbot and add it to my website')}
              >
                Build my chatbot
              </button>
              <button
                type="button"
                className="rounded-full border bg-background px-3 py-1 hover:border-primary/40 hover:text-foreground"
                onClick={() => setIntent('Set up lead capture and email me new leads')}
              >
                Set up lead capture
              </button>
              <button
                type="button"
                className="rounded-full border bg-background px-3 py-1 hover:border-primary/40 hover:text-foreground"
                onClick={() => setIntent('Create automations when someone becomes a lead')}
              >
                Create automations
              </button>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <Button size="sm" className="gap-1.5" onClick={handleGoToAiSetup}>
                <Sparkles className="h-4 w-4" />
                Set up with AI
              </Button>
              <p className="text-xs text-muted-foreground">
                Spaxio will guide you and configure everything based on your answers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {(websiteSetupStatus?.status === 'done' || websiteSetupStatus?.status === 'failed') && (
        <Card className={websiteSetupStatus.status === 'done' ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/30 bg-amber-500/5'}>
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
                ? 'Your site was scanned and your chatbot, knowledge base, and automations were configured.'
                : (websiteSetupStatus as { error_message?: string }).error_message || 'Something went wrong. You can run setup again.'}
            </CardDescription>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Do it from your website</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/ai-setup')}>
            Set up from URL
          </Button>
        </CardHeader>
        <CardContent>
          <CardDescription>
            Enter your website URL and we&apos;ll scan it, learn your business, and configure your chatbot, knowledge base, and automations automatically.
          </CardDescription>
          {websiteSetupStatus?.status && ['pending', 'scanning', 'building_knowledge', 'creating_agents', 'creating_automations', 'configuring_widget'].includes(websiteSetupStatus.status) && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{websiteSetupStatus.current_step ?? websiteSetupStatus.status}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-5">
        <QuickActionCard
          title="Set up with AI"
          description="Let the AI ask a few simple questions and configure everything for you."
          icon={Sparkles}
          onClick={() => router.push('/dashboard/ai-setup')}
        />
        <QuickActionCard
          title="Add your content"
          description="Add URLs and documents so your AI can answer using your business knowledge."
          icon={Upload}
          onClick={() => router.push('/dashboard/knowledge')}
        />
        <QuickActionCard
          title="Chat Widget"
          description="Get the code to add your chatbot to your website."
          icon={BookOpen}
          onClick={() => router.push('/dashboard/install')}
        />
        <QuickActionCard
          title="Leads"
          description="View and manage leads captured from your chatbot."
          icon={Users}
          onClick={() => router.push('/dashboard/leads')}
        />
        <QuickActionCard
          title="Preview widget"
          description="See how your chatbot looks on desktop and mobile."
          icon={PlayCircle}
          onClick={() => router.push('/dashboard-preview/overview')}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Setup progress</CardTitle>
          <CardDescription>You're {percentComplete}% ready to launch.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={percentComplete} />
          <ul className="space-y-2 text-sm">
            <StepItem label="AI setup" done={completedSteps > 0} />
            <StepItem label="Chatbot configured" done={false} />
            <StepItem label="Lead capture set up" done={false} />
            <StepItem label="Widget on your site" done={false} />
            <StepItem label="Ready to launch" done={false} />
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI recommendations</CardTitle>
          <CardDescription>Next best steps for your assistant.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>&ldquo;You&apos;re {percentComplete}% ready to launch.&rdquo;</p>
          <p>&ldquo;Set up your chatbot with the AI—it only takes a few answers.&rdquo;</p>
          <p>&ldquo;Add your website and documents so the AI can answer from your content.&rdquo;</p>
          <p>&ldquo;Get your install code and add the widget to your site.&rdquo;</p>
        </CardContent>
      </Card>
    </div>
  );
}

type QuickActionCardProps = {
  title: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  onClick: () => void;
};

function QuickActionCard({ title, description, icon: Icon, onClick }: QuickActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-2 rounded-xl border bg-card px-3 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
  );
}

function StepItem({ label, done }: { label: string; done: boolean }) {
  return (
    <li className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${done ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
      <span className={done ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </li>
  );
}

