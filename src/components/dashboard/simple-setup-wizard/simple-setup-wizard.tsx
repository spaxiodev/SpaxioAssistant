'use client';

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Globe,
  Loader2,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/components/intl-link';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { SimplePageHeader } from '@/components/dashboard/simple';
import { CopyScript } from '@/app/dashboard/install/copy-script';
import { WidgetPreviewWithPreset } from '@/app/dashboard/install/widget-preview-with-preset';
import { PreviewAssistantButton } from '@/components/dashboard/simple';

const SETUP_GOALS_KEY = 'spaxio-simple-setup-goals';
const TOTAL_STEPS = 8;

type SetupGoals = {
  answerQuestions: boolean;
  captureLeads: boolean;
  quoteRequests: boolean;
  recommendProducts: boolean;
  aiSearch: boolean;
  multilingual: boolean;
};

const defaultGoals: SetupGoals = {
  answerQuestions: true,
  captureLeads: true,
  quoteRequests: false,
  recommendProducts: true,
  aiSearch: false,
  multilingual: false,
};

function loadGoals(): SetupGoals {
  if (typeof window === 'undefined') return defaultGoals;
  try {
    const raw = window.localStorage.getItem(SETUP_GOALS_KEY);
    if (!raw) return defaultGoals;
    const p = JSON.parse(raw) as Partial<SetupGoals>;
    return { ...defaultGoals, ...p };
  } catch {
    return defaultGoals;
  }
}

function saveGoals(g: SetupGoals) {
  try {
    window.localStorage.setItem(SETUP_GOALS_KEY, JSON.stringify(g));
  } catch {
    /* ignore */
  }
}

export function SimpleSetupWizard() {
  return (
    <Suspense fallback={<SetupWizardFallback />}>
      <SimpleSetupWizardInner />
    </Suspense>
  );
}

function SetupWizardFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
    </div>
  );
}

function SimpleSetupWizardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const stepParam = searchParams.get('step');
  const step = Math.min(Math.max(parseInt(stepParam || '1', 10) || 1, 1), TOTAL_STEPS);

  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState<'description' | 'services' | null>(null);

  const [businessName, setBusinessName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [industry, setIndustry] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');
  const [servicesOffered, setServicesOffered] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [businessHours, setBusinessHours] = useState('');

  const [goals, setGoals] = useState<SetupGoals>(defaultGoals);

  const [installData, setInstallData] = useState<{
    scriptTag: string;
    baseUrl: string;
    widgetId: string | null;
    hasAgent: boolean;
    widgetLocale: string;
    widgetPositionPreset: string;
  } | null>(null);

  useEffect(() => {
    setGoals(loadGoals());
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: Record<string, unknown>) => {
        if (cancelled) return;
        setBusinessName(String(data.business_name ?? ''));
        setWebsiteUrl(String((data as { website_url?: string }).website_url ?? ''));
        setIndustry(String(data.industry ?? ''));
        setCompanyDescription(String(data.company_description ?? ''));
        const sv = data.services_offered;
        setServicesOffered(Array.isArray(sv) ? (sv as string[]).join('\n') : '');
        setContactEmail(String(data.contact_email ?? ''));
        setPhone(String(data.phone ?? ''));
      })
      .finally(() => {
        if (!cancelled) setLoadingSettings(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (step !== 7) return;
    let cancelled = false;
    fetch('/api/install/simple-data')
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setInstallData(d);
      })
      .catch(() => {
        if (!cancelled) setInstallData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [step]);

  const setStep = useCallback(
    (n: number) => {
      router.push(`/dashboard/setup?step=${n}`);
    },
    [router]
  );

  const mergeDescriptionWithHours = () => {
    const base = companyDescription.trim();
    const h = businessHours.trim();
    if (!h) return base;
    if (base.includes(h)) return base;
    return base ? `${base}\n\nBusiness hours:\n${h}` : `Business hours:\n${h}`;
  };

  const saveBusinessStep = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: businessName || null,
          industry: industry || null,
          companyDescription: mergeDescriptionWithHours() || null,
          servicesOffered: servicesOffered
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
          contactEmail: contactEmail || null,
          phone: phone || null,
          websiteUrl: websiteUrl || null,
        }),
      });
      if (!res.ok) throw new Error('save');
      toast({ title: 'Saved', description: 'Business information updated.' });
    } catch {
      toast({ title: 'Could not save', description: 'Check your connection and try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleAiGenerate = async (field: 'description' | 'services') => {
    const ctx = [businessName, industry].filter(Boolean).join(' ');
    if (!ctx.trim()) {
      toast({ title: 'Add context', description: 'Enter a business name or industry first.', variant: 'destructive' });
      return;
    }
    setAiLoading(field);
    try {
      const res = await fetch('/api/settings/generate-business-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: field === 'description' ? 'company_description' : 'services',
          businessName,
          industry,
          ...(field === 'services' && companyDescription ? { companyDescription } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Generation failed', description: data?.error ?? 'Try again.', variant: 'destructive' });
        return;
      }
      const content = data?.content ?? '';
      if (field === 'description') setCompanyDescription(content);
      else setServicesOffered(content);
      toast({ title: 'Generated', description: 'Review and edit as needed.' });
    } catch {
      toast({ title: 'Error', description: 'Could not generate.', variant: 'destructive' });
    } finally {
      setAiLoading(null);
    }
  };

  const progressPct = useMemo(() => Math.round((step / TOTAL_STEPS) * 100), [step]);

  const updateGoal = (key: keyof SetupGoals, value: boolean) => {
    const next = { ...goals, [key]: value };
    setGoals(next);
    saveGoals(next);
  };

  const stepTitle = [
    'Business information',
    'What should your AI do?',
    'Train your AI',
    'Quote requests',
    'Lead capture',
    'AI Search',
    'Install on your website',
    'Review & go live',
  ][step - 1];

  if (loadingSettings && step === 1) {
    return <SetupWizardFallback />;
  }

  return (
    <div className="space-y-8">
      <SimplePageHeader
        title="Guided setup"
        description="We’ll walk you through the essentials. You can leave and come back anytime—your progress is saved as you go."
        icon={<Sparkles className="h-6 w-6 text-sky-500" />}
      />

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">
            Step {step} of {TOTAL_STEPS}
          </span>
          <span className="font-medium text-foreground">{stepTitle}</span>
        </div>
        <Progress value={progressPct} className="h-2" />
      </div>

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setStep(n)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
              n === step
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border/60 text-muted-foreground hover:border-border'
            )}
          >
            {n}
          </button>
        ))}
      </div>

      {step === 1 && (
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Business information</CardTitle>
            <CardDescription>
              This is how your AI introduces your business. Accurate details mean better answers and fewer follow-up questions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="biz-name">Business name</Label>
                <Input
                  id="biz-name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Your company name"
                />
                <p className="text-xs text-muted-foreground">Shown in greetings and when the AI refers to you.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="biz-web">Website</Label>
                <Input
                  id="biz-web"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://"
                />
                <p className="text-xs text-muted-foreground">Used to learn your pages and keep answers grounded.</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="biz-ind">Industry</Label>
                <Input
                  id="biz-ind"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. Dental, HVAC, Retail"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="biz-hours">Business hours</Label>
                <Textarea
                  id="biz-hours"
                  value={businessHours}
                  onChange={(e) => setBusinessHours(e.target.value)}
                  placeholder="Mon–Fri 9–5, Sat 10–2…"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">Helps the AI answer “Are you open?” style questions.</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="biz-desc">Business description</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    disabled={aiLoading !== null}
                    onClick={() => handleAiGenerate('description')}
                  >
                    {aiLoading === 'description' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                    Help me write this
                  </Button>
                </div>
              </div>
              <Textarea
                id="biz-desc"
                value={companyDescription}
                onChange={(e) => setCompanyDescription(e.target.value)}
                placeholder="What you do, who you serve, and what makes you different."
                rows={5}
              />
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="biz-svc">Services or products</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={aiLoading !== null}
                  onClick={() => handleAiGenerate('services')}
                >
                  {aiLoading === 'services' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  Suggest from description
                </Button>
              </div>
              <Textarea
                id="biz-svc"
                value={servicesOffered}
                onChange={(e) => setServicesOffered(e.target.value)}
                placeholder="One per line"
                rows={4}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="biz-email">Contact email</Label>
                <Input
                  id="biz-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="you@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="biz-phone">Phone</Label>
                <Input id="biz-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 …" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: After saving, use{' '}
              <Link href="/dashboard/ai-setup" className="font-medium text-primary underline">
                AI Setup
              </Link>{' '}
              to generate from your full website in one pass.
            </p>
          </CardContent>
          <CardFooter className="flex flex-wrap justify-between gap-2 border-t bg-muted/20">
            <Button type="button" variant="ghost" onClick={() => setStep(2)} className="gap-2">
              Skip for now
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button type="button" disabled={saving} onClick={() => void saveBusinessStep().then(() => setStep(2))}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save & continue
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 2 && (
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>What do you want your AI to do?</CardTitle>
            <CardDescription>Turn on the jobs that matter for your business. You can change these later.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <GoalRow
              label="Answer customer questions"
              description="Instant answers from your business context—like a knowledgeable receptionist."
              checked={goals.answerQuestions}
              onCheckedChange={(v) => updateGoal('answerQuestions', v)}
            />
            <GoalRow
              label="Capture leads"
              description="Collect name, email, or phone when visitors want a follow-up."
              checked={goals.captureLeads}
              onCheckedChange={(v) => updateGoal('captureLeads', v)}
            />
            <GoalRow
              label="Collect quote requests"
              description="Structured pricing or project inquiries you can respond to on your timeline."
              checked={goals.quoteRequests}
              onCheckedChange={(v) => updateGoal('quoteRequests', v)}
            />
            <GoalRow
              label="Recommend products or services"
              description="Guide visitors to the right offer based on what they say they need."
              checked={goals.recommendProducts}
              onCheckedChange={(v) => updateGoal('recommendProducts', v)}
            />
            <GoalRow
              label="AI Search Agent"
              description="Let visitors search in plain language—not just keywords."
              checked={goals.aiSearch}
              onCheckedChange={(v) => updateGoal('aiSearch', v)}
            />
            <GoalRow
              label="Multilingual support"
              description="Respond and switch languages to match your visitors when enabled in settings."
              checked={goals.multilingual}
              onCheckedChange={(v) => updateGoal('multilingual', v)}
            />
          </CardContent>
          <CardFooter className="flex flex-wrap justify-between gap-2 border-t bg-muted/20">
            <Button type="button" variant="outline" className="gap-2" onClick={() => setStep(1)}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button type="button" onClick={() => setStep(3)}>
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 3 && (
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Train your AI</CardTitle>
            <CardDescription>
              The more your AI knows about your real business, the better it sounds. Pick one or more ways to teach it.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <TrainCard
              title="Paste or describe your business"
              body="Summarize services, policies, and FAQs in your own words."
              action={{ label: 'Open AI Setup chat', href: '/dashboard/ai-setup' }}
            />
            <TrainCard
              title="Add your website"
              body="We can scan pages you choose so answers stay aligned with your site."
              action={{ label: 'Use website URL', href: '/dashboard/ai-setup' }}
            />
            <TrainCard
              title="Upload FAQs or documents"
              body="PDFs and text files become part of what your assistant can cite."
              action={{ label: 'Go to Knowledge', href: '/dashboard/knowledge' }}
              hint="Opens Developer navigation target—you can switch mode from the header."
            />
            <TrainCard
              title="Common Q&A"
              body="Add questions customers ask all the time with short, approved answers."
              action={{ label: 'Business settings & FAQ', href: '/dashboard/settings' }}
            />
          </CardContent>
          <CardFooter className="flex flex-wrap justify-between gap-2 border-t bg-muted/20">
            <Button type="button" variant="outline" className="gap-2" onClick={() => setStep(2)}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button type="button" onClick={() => setStep(goals.quoteRequests ? 4 : goals.captureLeads ? 5 : goals.aiSearch ? 6 : 7)}>
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 4 && goals.quoteRequests && (
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Quote requests</CardTitle>
            <CardDescription>
              Use this when you want customers to request pricing through your AI. You choose which fields are required and
              how pricing hints work.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure your quote form, optional pricing rules, and notifications in one place. We’ll keep the advanced
              builder in Developer Mode so Simple Mode stays easy to scan.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/dashboard/quote-requests/form-setup">Set up quote form</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/quote-requests/pricing">Pricing rules</Link>
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap justify-between gap-2 border-t bg-muted/20">
            <Button type="button" variant="outline" className="gap-2" onClick={() => setStep(3)}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button type="button" onClick={() => setStep(goals.captureLeads ? 5 : goals.aiSearch ? 6 : 7)}>
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 5 && goals.captureLeads && (
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Lead capture</CardTitle>
            <CardDescription>
              Decide what the AI should ask before handing you a lead. Leads show up in your dashboard and can trigger
              email notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ul className="list-inside list-disc space-y-1">
              <li>Name, email, and phone are the usual starting points.</li>
              <li>Add custom questions for qualification (budget, timeline, service area).</li>
              <li>Set where notifications go in Settings so your team sees new leads quickly.</li>
            </ul>
            <Button asChild>
              <Link href="/dashboard/settings">Open lead & notification settings</Link>
            </Button>
          </CardContent>
          <CardFooter className="flex flex-wrap justify-between gap-2 border-t bg-muted/20">
            <Button type="button" variant="outline" className="gap-2" onClick={() => setStep(goals.quoteRequests ? 4 : 3)}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button type="button" onClick={() => setStep(goals.aiSearch ? 6 : 7)}>
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 6 && goals.aiSearch && (
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>AI Search Agent</CardTitle>
            <CardDescription>
              Visitors describe what they need in natural language. You choose whether to focus on products, site content,
              or both—and how results are prioritized.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Simple Mode uses sensible defaults (relevance first). Switch to Developer Mode anytime for weighting and
              boost rules.
            </p>
            <Button asChild>
              <Link href="/dashboard/ai-search">Configure AI Search</Link>
            </Button>
          </CardContent>
          <CardFooter className="flex flex-wrap justify-between gap-2 border-t bg-muted/20">
            <Button type="button" variant="outline" className="gap-2" onClick={() => setStep(goals.captureLeads ? 5 : goals.quoteRequests ? 4 : 3)}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button type="button" onClick={() => setStep(7)}>
              Continue to install
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 7 && (
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Install on your website</CardTitle>
            <CardDescription>
              Copy a single script into your site to show the chat widget, or use a full-page assistant on a dedicated
              URL—your choice.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!installData ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3">
                    <Label>Embed code</Label>
                    <CopyScript text={installData.scriptTag} />
                    <p className="text-xs text-muted-foreground">Paste before the closing {`</body>`} tag on pages where you want the assistant.</p>
                  </div>
                  <div className="min-h-[280px] overflow-hidden rounded-xl border bg-muted/20">
                    <WidgetPreviewWithPreset
                      baseUrl={installData.baseUrl}
                      widgetId={installData.widgetId ?? ''}
                      locale={installData.widgetLocale}
                      initialPreset={installData.widgetPositionPreset}
                    />
                  </div>
                </div>
                {!installData.hasAgent && (
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Connect an assistant to this widget in Install (Developer Mode) if you don’t see replies yet.
                  </p>
                )}
              </>
            )}
          </CardContent>
          <CardFooter className="flex flex-wrap justify-between gap-2 border-t bg-muted/20">
            <Button type="button" variant="outline" className="gap-2" onClick={() => setStep(goals.aiSearch ? 6 : goals.captureLeads ? 5 : goals.quoteRequests ? 4 : 3)}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/dashboard/install">Full install guide</Link>
              </Button>
              <Button type="button" onClick={() => setStep(8)}>
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}

      {step === 8 && (
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Review & go live</CardTitle>
            <CardDescription>You’re almost there—confirm what’s on and run a quick test.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-xl border bg-muted/30 p-4">
              <h3 className="text-sm font-semibold">Enabled goals</h3>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {goals.answerQuestions && <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Answer questions</li>}
                {goals.captureLeads && <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Capture leads</li>}
                {goals.quoteRequests && <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Quote requests</li>}
                {goals.recommendProducts && <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Recommend offers</li>}
                {goals.aiSearch && <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> AI Search</li>}
                {goals.multilingual && <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Multilingual</li>}
              </ul>
            </div>
            <div className="flex flex-wrap gap-2">
              <PreviewAssistantButton />
              <Button asChild variant="outline">
                <Link href="/dashboard/conversations">View conversations</Link>
              </Button>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-dashed p-3 text-sm">
              <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="font-medium">Suggested next steps</p>
                <p className="text-muted-foreground">Send a few test messages from your site, review leads weekly, and add FAQs as you hear new questions.</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap justify-between gap-2 border-t bg-muted/20">
            <Button type="button" variant="outline" className="gap-2" onClick={() => setStep(7)}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button type="button" onClick={() => router.push('/dashboard')}>
              Finish & go to Home
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Skipped-step bridges: when user lands on 4 but quotes off, etc. */}
      {step === 4 && !goals.quoteRequests && (
        <SkippedBridge message="Quote requests are off—skipping to the next relevant step." onNext={() => setStep(goals.captureLeads ? 5 : goals.aiSearch ? 6 : 7)} />
      )}
      {step === 5 && !goals.captureLeads && (
        <SkippedBridge
          message="Lead capture is turned off in your goals—we’ll skip this step."
          onNext={() => setStep(goals.aiSearch ? 6 : 7)}
        />
      )}
      {step === 6 && !goals.aiSearch && (
        <SkippedBridge message="AI Search is off in your goals—we’ll jump to install." onNext={() => setStep(7)} />
      )}
    </div>
  );
}

function GoalRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-card/50 p-4">
      <div className="min-w-0 space-y-1">
        <p className="font-medium leading-none">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
    </div>
  );
}

function TrainCard({
  title,
  body,
  action,
  hint,
}: {
  title: string;
  body: string;
  action: { label: string; href: string };
  hint?: string;
}) {
  return (
    <Card className="border-border/60 bg-background/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{body}</CardDescription>
      </CardHeader>
      <CardFooter className="flex flex-col items-start gap-2 pt-0">
        <Button asChild size="sm" variant="secondary">
          <Link href={action.href}>{action.label}</Link>
        </Button>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardFooter>
    </Card>
  );
}

function SkippedBridge({ message, onNext }: { message: string; onNext: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button type="button" onClick={onNext}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
