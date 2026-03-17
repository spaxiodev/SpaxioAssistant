'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SimplePageHeader, SimpleDeveloperModeLink } from '@/components/dashboard/simple';
import {
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Building2,
  FileText,
  Globe,
  ChevronRight,
  ThumbsUp,
  Send,
} from 'lucide-react';
import type { SourceInputs } from '@/lib/business-setup/types';
import { SECTION_LABELS } from '@/lib/business-setup/ai-business-review-service';
import type { DraftSectionKey } from '@/lib/business-setup/types';

type WizardStep = 'input' | 'extracting' | 'review' | 'publish_done';

const SECTION_ORDER: DraftSectionKey[] = [
  'business_profile',
  'services',
  'knowledge',
  'pricing',
  'agents',
  'automations',
  'widget_config',
  'ai_pages',
  'branding',
];

export function SimpleBusinessSetupPage() {
  const [step, setStep] = useState<WizardStep>('input');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [describeText, setDescribeText] = useState('');
  const [pricingText, setPricingText] = useState('');
  const [faqText, setFaqText] = useState('');
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sectionApprovals, setSectionApprovals] = useState<Record<string, 'approved' | 'rejected' | 'edited'>>({});
  const [publishing, setPublishing] = useState(false);
  const [publishDone, setPublishDone] = useState(false);

  const hasInput =
    websiteUrl.trim().startsWith('http') ||
    pastedText.trim().length > 20 ||
    describeText.trim().length > 20 ||
    pricingText.trim().length > 5 ||
    faqText.trim().length > 5;

  const startExtraction = useCallback(async () => {
    if (!hasInput) {
      setError('Add your website URL, paste content, or describe your business.');
      return;
    }
    setError(null);
    setLoading(true);
    setStep('extracting');
    try {
      const createRes = await fetch('/api/business-setup/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_inputs: {
            website_url: websiteUrl.trim() || null,
            pasted_text: pastedText.trim() || null,
            chat_summary: describeText.trim() || null,
            pricing_text: pricingText.trim() || null,
            faq_text: faqText.trim() || null,
          } as SourceInputs,
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        setError(createData.error || 'Failed to create draft');
        setStep('input');
        setLoading(false);
        return;
      }
      const id = createData.draft?.id;
      if (!id) {
        setError('No draft ID returned');
        setStep('input');
        setLoading(false);
        return;
      }
      setDraftId(id);

      const extractRes = await fetch(`/api/business-setup/drafts/${id}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_inputs: {
            website_url: websiteUrl.trim() || null,
            pasted_text: pastedText.trim() || null,
            chat_summary: describeText.trim() || null,
            pricing_text: pricingText.trim() || null,
            faq_text: faqText.trim() || null,
          } as SourceInputs,
        }),
      });
      const extractData = await extractRes.json();
      if (!extractRes.ok) {
        setError(extractData.error || 'Extraction failed');
        setStep('input');
        setLoading(false);
        return;
      }
      setDraft(extractData.draft ?? createData.draft);
      setStep('review');
      SECTION_ORDER.forEach((s) => {
        setSectionApprovals((prev) => ({ ...prev, [s]: 'approved' }));
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setStep('input');
    } finally {
      setLoading(false);
    }
  }, [hasInput, websiteUrl, pastedText, describeText, pricingText, faqText]);

  const handlePublish = async () => {
    if (!draftId) return;
    setPublishing(true);
    setError(null);
    try {
      const sections = SECTION_ORDER.filter((s) => sectionApprovals[s] === 'approved' || sectionApprovals[s] === 'edited');
      const res = await fetch(`/api/business-setup/drafts/${draftId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Publish failed');
        return;
      }
      setPublishDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  const approvedCount = SECTION_ORDER.filter((s) => sectionApprovals[s] === 'approved' || sectionApprovals[s] === 'edited').length;

  return (
    <div className="space-y-8">
      <SimplePageHeader
        title="Tell us about your business"
        description="Let AI build your assistant setup from your website, documents, or a short description. Review what we find, then approve and go live."
        icon={<Building2 className="h-6 w-6" />}
      />

      {step === 'input' && (
        <Card>
          <CardHeader>
            <CardTitle>How would you like to share your business info?</CardTitle>
            <CardDescription>
              Add one or more: website URL, pasted text, pricing sheet, FAQs, or describe your business in a few sentences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="website">Website URL</Label>
              <div className="flex gap-2">
                <Globe className="h-4 w-4 mt-3 text-muted-foreground shrink-0" />
                <Input
                  id="website"
                  type="url"
                  placeholder="https://yoursite.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="describe">Describe your business</Label>
              <Textarea
                id="describe"
                placeholder="e.g. We are a landscaping company in Montreal. We do lawn mowing, bush trimming, seasonal cleanup, and mulch installation."
                value={describeText}
                onChange={(e) => setDescribeText(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pasted">Paste content (services, policies, about)</Label>
              <Textarea
                id="pasted"
                placeholder="Paste text from your site or documents…"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pricing">Pricing information (optional)</Label>
              <Textarea
                id="pricing"
                placeholder="e.g. We charge by lot size; bush trimming is per bush; cleanup is flat fee."
                value={pricingText}
                onChange={(e) => setPricingText(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="faq">FAQs / support info (optional)</Label>
              <Textarea
                id="faq"
                placeholder="Common questions and answers…"
                value={faqText}
                onChange={(e) => setFaqText(e.target.value)}
                rows={2}
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            <Button
              className="gap-2"
              disabled={!hasInput || loading}
              onClick={startExtraction}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Building your setup…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Let AI build your setup
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 'extracting' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Analyzing your business
            </CardTitle>
            <CardDescription>
              We’re extracting your profile, services, knowledge, pricing, and assistant suggestions. This usually takes a minute.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {step === 'review' && draft && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Review what we found</CardTitle>
              <CardDescription>
                Approve the sections you want to apply. You can edit details in Settings after publishing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {draft.assumptions && Array.isArray(draft.assumptions) && (draft.assumptions as string[]).length > 0 ? (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  <p className="font-medium text-muted-foreground mb-1">Assumptions</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {(draft.assumptions as string[]).map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {draft.missing_items && Array.isArray(draft.missing_items) && (draft.missing_items as string[]).length > 0 ? (
                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">Missing or unclear</p>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-700 dark:text-amber-300">
                    {(draft.missing_items as string[]).map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {SECTION_ORDER.map((sectionKey) => {
              const label = SECTION_LABELS[sectionKey];
              const approved = sectionApprovals[sectionKey] === 'approved' || sectionApprovals[sectionKey] === 'edited';
              const dataKey = sectionKey === 'widget_config' ? 'extracted_widget_config' : `extracted_${sectionKey}`;
              const data = draft[dataKey];
              const hasData = data !== null && data !== undefined && (typeof data !== 'object' || Object.keys(data as object).length > 0) && (Array.isArray(data) ? data.length > 0 : true);
              return (
                <Card key={sectionKey}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{label}</CardTitle>
                      <Button
                        variant={approved ? 'default' : 'outline'}
                        size="sm"
                        onClick={() =>
                          setSectionApprovals((prev) => ({
                            ...prev,
                            [sectionKey]: approved ? 'rejected' : 'approved',
                          }))
                        }
                      >
                        {approved ? <ThumbsUp className="h-4 w-4" /> : 'Include'}
                      </Button>
                    </div>
                  </CardHeader>
                  {hasData && (
                    <CardContent className="pt-0 text-xs">
                      {sectionKey === 'widget_config' && typeof data === 'object' && data !== null && 'welcome_message' in data && (data as { welcome_message?: string }).welcome_message && (
                        <p className="rounded bg-muted/50 p-2 text-foreground">{(data as { welcome_message: string }).welcome_message}</p>
                      )}
                      {sectionKey === 'agents' && Array.isArray(data) && (data as unknown[]).length > 0 && (
                        <p className="text-muted-foreground">{(data as { name?: string }[])[0]?.name ?? 'Agent'} and {(data as unknown[]).length - 1} more</p>
                      )}
                      {sectionKey !== 'widget_config' && sectionKey !== 'agents' && (
                        <p className="line-clamp-2 text-muted-foreground">
                          {Array.isArray(data) ? `${(data as unknown[]).length} item(s)` : typeof data === 'object' ? Object.keys(data as object).slice(0, 3).join(', ') : String(data)}
                        </p>
                      )}
                    </CardContent>
                  )}
                  {!hasData && (
                    <CardContent className="pt-0 text-sm text-muted-foreground">
                      No data extracted for this section.
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Button
              className="gap-2"
              disabled={approvedCount === 0 || publishing}
              onClick={handlePublish}
            >
              {publishing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Publishing…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Approve and go live ({approvedCount} sections)
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setStep('input');
                setDraftId(null);
                setDraft(null);
              }}
            >
              Start over
            </Button>
            {error && (
              <span className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {error}
              </span>
            )}
          </div>
        </>
      )}

      {publishDone && (
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              Setup applied
            </CardTitle>
            <CardDescription>
              Your approved sections have been applied. Check Settings, Agents, Automations, and Pricing to refine anything.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href="/dashboard/settings">
                Open Settings
                <ChevronRight className="h-4 w-4 ml-1" />
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      <SimpleDeveloperModeLink
        title="Full control"
        description="In Developer Mode you can see raw extracted JSON, edit each section in detail, and publish section by section."
        developerPath="/dashboard/business-setup"
        linkLabel="Open Business Setup in Developer Mode"
      />
    </div>
  );
}
