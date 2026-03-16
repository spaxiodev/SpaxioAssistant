import { redirect } from 'next/navigation';
import { DASHBOARD_PREVIEW_DATA } from '@/lib/dashboard-preview-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from '@/components/intl-link';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const SECTIONS = [
  'overview',
  'assistants',
  'widget',
  'knowledge',
  'inbox',
  'analytics',
  'automations',
  'team',
  'billing',
] as const;

type Section = (typeof SECTIONS)[number];

function isSection(value: string): value is Section {
  return (SECTIONS as readonly string[]).includes(value);
}

function LockedAction({ feature, children }: { feature: string; children: React.ReactNode }) {
  return (
    <span data-preview-lock={feature} className="inline-flex">
      {children}
    </span>
  );
}

function Overview() {
  const d = DASHBOARD_PREVIEW_DATA;
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Workspace</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{d.businessName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Assistant: <span className="text-foreground">{d.assistantName}</span> · Website:{' '}
            <span className="text-foreground">{d.websiteUrl.replace('https://', '')}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/pricing">View pricing</Link>
          </Button>
          <LockedAction feature="Launch widget">
            <Button className="rounded-xl">Launch</Button>
          </LockedAction>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-white/30 bg-card/70 backdrop-blur dark:border-white/10">
          <CardHeader className="space-y-1">
            <CardDescription>Conversations (7d)</CardDescription>
            <CardTitle className="text-3xl">{d.analytics.conversationsThisWeek}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-white/30 bg-card/70 backdrop-blur dark:border-white/10">
          <CardHeader className="space-y-1">
            <CardDescription>Deflection rate</CardDescription>
            <CardTitle className="text-3xl">{d.analytics.deflectionRatePct}%</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-white/30 bg-card/70 backdrop-blur dark:border-white/10">
          <CardHeader className="space-y-1">
            <CardDescription>Leads captured</CardDescription>
            <CardTitle className="text-3xl">{d.analytics.leadsCaptured}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-white/30 bg-card/70 backdrop-blur dark:border-white/10">
          <CardHeader className="space-y-1">
            <CardDescription>Avg. first response</CardDescription>
            <CardTitle className="text-3xl">{d.analytics.avgFirstResponseSeconds}s</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-white/30 bg-card/70 backdrop-blur dark:border-white/10">
          <CardHeader>
            <CardTitle>Recent conversations</CardTitle>
            <CardDescription>Preview of your inbox activity (demo data)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {d.recentConversations.map((c) => (
              <LockedAction key={c.id} feature="Conversation details">
                <div className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border/60 bg-background/60 p-4 hover:bg-background/80">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{c.from}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.summary}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Badge variant={c.status === 'open' ? 'default' : 'secondary'}>
                      {c.status === 'open' ? 'Open' : 'Resolved'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{c.createdAtLabel}</span>
                  </div>
                </div>
              </LockedAction>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-white/30 bg-card/70 backdrop-blur dark:border-white/10">
            <CardHeader>
              <CardTitle>Widget</CardTitle>
              <CardDescription>{d.widgetStatusLabel}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-border/60 bg-background/60 p-4">
                <p className="text-sm font-medium text-foreground">Install snippet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Your widget install code appears here after you connect a website.
                </p>
                <div className="mt-3 flex gap-2">
                  <LockedAction feature="Copy install code">
                    <Button size="sm" className="rounded-lg">
                      Copy snippet
                    </Button>
                  </LockedAction>
                  <LockedAction feature="Open install instructions">
                    <Button size="sm" variant="outline" className="rounded-lg">
                      View instructions
                    </Button>
                  </LockedAction>
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/60 p-4">
                <p className="text-sm font-medium text-foreground">Preview</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Demo: “How can we help you today?” widget anchored on acmedental.com
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/30 bg-card/70 backdrop-blur dark:border-white/10">
            <CardHeader>
              <CardTitle>Knowledge</CardTitle>
              <CardDescription>{d.knowledgeStatusLabel}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/60 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">Website crawl</p>
                  <p className="mt-1 text-xs text-muted-foreground">Last updated: 3 hours ago (demo)</p>
                </div>
                <Badge variant="secondary">Healthy</Badge>
              </div>
              <LockedAction feature="Train on website content">
                <Button className="w-full rounded-xl">Train on my website</Button>
              </LockedAction>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-white/30 bg-[linear-gradient(135deg,hsl(var(--primary))/0.16,rgba(14,165,233,0.10))] backdrop-blur dark:border-white/10">
        <CardHeader>
          <CardTitle>Ready to go live?</CardTitle>
          <CardDescription>
            Create your free account to connect your domain, launch the widget, and unlock live analytics & automations.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row">
          <Button asChild className="rounded-xl">
            <Link href="/signup">Create free account</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/login">Log in</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function LockedSection({ title, description, feature }: { title: string; description: string; feature: string }) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <Card className="border-white/30 bg-card/70 backdrop-blur dark:border-white/10">
        <CardHeader>
          <CardTitle>Preview content</CardTitle>
          <CardDescription>Explore the layout with demo data — actions are locked until you create an account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-background/60 p-4">
              <p className="text-sm font-medium text-foreground">Demo setup</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Acme Dental · {DASHBOARD_PREVIEW_DATA.assistantName} · acmedental.com
              </p>
              <div className="mt-3">
                <Progress value={72} />
                <p className="mt-2 text-xs text-muted-foreground">Setup progress (demo): 72%</p>
              </div>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/60 p-4">
              <p className="text-sm font-medium text-foreground">What you unlock</p>
              <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
                <li>Connect your domain</li>
                <li>Train knowledge on your website</li>
                <li>View and reply to conversations</li>
                <li>Enable automations and webhooks</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <LockedAction feature={feature}>
              <Button className="rounded-xl">Try {title}</Button>
            </LockedAction>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/signup">Create free account</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function DashboardPreviewSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!isSection(section)) {
    redirect('/dashboard-preview/overview');
  }

  if (section === 'overview') return <Overview />;

  if (section === 'assistants') {
    return (
      <LockedSection
        title="Assistants"
        description="Create and manage assistants for each site and use case."
        feature="Create assistant"
      />
    );
  }
  if (section === 'widget') {
    return (
      <LockedSection
        title="Widget"
        description="Customize your chat widget and publish it to your website."
        feature="Open widget install code"
      />
    );
  }
  if (section === 'knowledge') {
    return (
      <LockedSection
        title="Knowledge"
        description="Train your assistant on your website, docs, and FAQs."
        feature="Train knowledge"
      />
    );
  }
  if (section === 'inbox') {
    return (
      <LockedSection
        title="Inbox"
        description="View conversations, reply to customers, and capture leads."
        feature="View conversation"
      />
    );
  }
  if (section === 'analytics') {
    return (
      <LockedSection
        title="Analytics"
        description="Track deflection, leads, and conversion — live, in real time."
        feature="Open analytics details"
      />
    );
  }
  if (section === 'automations') {
    return (
      <LockedSection
        title="Automations"
        description="Route leads, trigger actions, and connect your stack."
        feature="Enable automation"
      />
    );
  }
  if (section === 'team') {
    return (
      <LockedSection
        title="Team"
        description="Invite teammates and manage roles and access."
        feature="Invite team member"
      />
    );
  }
  if (section === 'billing') {
    return (
      <LockedSection
        title="Billing"
        description="View plan details and manage subscription."
        feature="Open billing"
      />
    );
  }

  redirect('/dashboard-preview/overview');
}

