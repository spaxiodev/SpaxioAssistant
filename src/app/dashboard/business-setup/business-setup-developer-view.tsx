'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Sparkles, Code, ChevronRight } from 'lucide-react';
import { Link } from '@/components/intl-link';
import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SourceInputs } from '@/lib/business-setup/types';
import { SECTION_LABELS } from '@/lib/business-setup/ai-business-review-service';
import type { DraftSectionKey } from '@/lib/business-setup/types';
import { formatDate } from '@/lib/utils';
import { useViewMode } from '@/contexts/view-mode-context';

type DraftSummary = { id: string; status: string; created_at: string; updated_at: string };

export function BusinessSetupDeveloperView({
  initialDrafts,
}: {
  initialDrafts: DraftSummary[];
}) {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const { setMode } = useViewMode();
  const [drafts, setDrafts] = useState<DraftSummary[]>(initialDrafts);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [describeText, setDescribeText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishSections, setPublishSections] = useState<Set<DraftSectionKey>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [reExtracting, setReExtracting] = useState(false);

  const loadDrafts = async () => {
    const res = await fetch('/api/business-setup/drafts');
    const data = await res.json();
    if (res.ok && data.drafts) setDrafts(data.drafts);
  };

  useEffect(() => {
    if (!selectedDraftId) {
      setDraft(null);
      return;
    }
    let cancelled = false;
    setLoadingDraft(true);
    setError(null);
    fetch(`/api/business-setup/drafts/${selectedDraftId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.draft) {
          setDraft(data.draft);
          const approvals = (data.draft.section_approvals ?? {}) as Record<string, string>;
          const approved = (Object.keys(approvals) as DraftSectionKey[]).filter(
            (k) => approvals[k] === 'approved' || approvals[k] === 'edited'
          );
          setPublishSections(new Set(approved));
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load draft');
      })
      .finally(() => {
        if (!cancelled) setLoadingDraft(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDraftId]);

  const createAndExtract = async () => {
    const sourceInputs: SourceInputs = {
      website_url: websiteUrl.trim() || null,
      pasted_text: pastedText.trim() || null,
      chat_summary: describeText.trim() || null,
    };
    if (!sourceInputs.website_url && !sourceInputs.pasted_text && !sourceInputs.chat_summary) {
      setError('Provide at least website URL, pasted text, or description.');
      return;
    }
    setError(null);
    setExtracting(true);
    try {
      const createRes = await fetch('/api/business-setup/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_inputs: sourceInputs }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || 'Create failed');
      const id = createData.draft?.id;
      if (!id) throw new Error('No draft ID');

      const extractRes = await fetch(`/api/business-setup/drafts/${id}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_inputs: sourceInputs }),
      });
      const extractData = await extractRes.json();
      if (!extractRes.ok) throw new Error(extractData.error || 'Extraction failed');
      setDraft(extractData.draft ?? createData.draft);
      setSelectedDraftId(id);
      setPublishSections(new Set(SECTION_ORDER));
      await loadDrafts();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setExtracting(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedDraftId || publishSections.size === 0) return;
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch(`/api/business-setup/drafts/${selectedDraftId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: Array.from(publishSections) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Publish failed');
      await loadDrafts();
      if (draft) setDraft({ ...draft, status: data.published_at ? 'partially_published' : draft.status });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  const toggleSection = (key: DraftSectionKey) => {
    setPublishSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Business Setup (Developer)</h1>
        <p className="text-muted-foreground mt-1">
          {t('businessSetupIntro')} Create a draft, run AI extraction, inspect raw JSON, and publish.
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm">
          <Link href="/dashboard/install" className="text-primary hover:underline">{t('install')}</Link>
          <span className="text-muted-foreground">·</span>
          <Link href="/dashboard/pricing" className="text-primary hover:underline">{t('pricingRules')}</Link>
          <span className="text-muted-foreground">·</span>
          <Link href="/dashboard/settings" className="text-primary hover:underline">{t('settingsTitle')}</Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New draft</CardTitle>
          <CardDescription>Website URL, pasted text, or short description. Then run extraction.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Website URL</Label>
              <Input
                type="url"
                placeholder="https://..."
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Describe your business</Label>
              <Input
                placeholder="e.g. Landscaping in Montreal..."
                value={describeText}
                onChange={(e) => setDescribeText(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Pasted content</Label>
            <Textarea
              placeholder="Paste text from site or docs..."
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              rows={3}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={createAndExtract} disabled={extracting} className="gap-2">
            {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Create draft and extract
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Drafts</CardTitle>
          <CardDescription>Select a draft to view and publish.</CardDescription>
        </CardHeader>
        <CardContent>
          {drafts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No drafts yet. Create one above to get started.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {drafts.map((d) => (
                <Button
                  key={d.id}
                  variant={selectedDraftId === d.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDraftId(d.id)}
                  className="justify-start"
                >
                  <span className="flex flex-col items-start">
                    <span className="text-xs font-medium">
                      Updated {formatDate(d.updated_at)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {d.status} · {d.id.slice(0, 8)}…
                    </span>
                  </span>
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {loadingDraft && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading draft…
        </div>
      )}

      {draft && !loadingDraft && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Extracted sections
              </CardTitle>
              <CardDescription>Toggle sections to include when publishing, or re-run extraction if your inputs changed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SECTION_ORDER.map((key) => (
                    <Button
                      key={key}
                      variant={publishSections.has(key) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleSection(key)}
                    >
                      {SECTION_LABELS[key]}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={reExtracting || !selectedDraftId}
                  onClick={async () => {
                    if (!selectedDraftId || !draft) return;
                    setError(null);
                    setReExtracting(true);
                    try {
                      const sourceInputs = (draft.source_inputs ?? {}) as Record<string, unknown>;
                      const res = await fetch(`/api/business-setup/drafts/${selectedDraftId}/extract`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ source_inputs: sourceInputs }),
                      });
                      const data = await res.json();
                      if (!res.ok) {
                        throw new Error(data.error || 'Extraction failed');
                      }
                      setDraft(data.draft ?? draft);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Extraction failed');
                    } finally {
                      setReExtracting(false);
                    }
                  }}
                  className="whitespace-nowrap"
                >
                  {reExtracting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="ml-1">Re-running extraction…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span className="ml-1">Re-run extraction</span>
                    </>
                  )}
                </Button>
              </div>
              <Tabs defaultValue="business_profile" className="w-full">
                <TabsList className="flex flex-wrap gap-1">
                  {SECTION_ORDER.map((key) => (
                    <TabsTrigger key={key} value={key}>
                      {SECTION_LABELS[key]}
                    </TabsTrigger>
                  ))}
                  <TabsTrigger value="meta">Meta</TabsTrigger>
                </TabsList>
                {SECTION_ORDER.map((key) => {
                  const sectionValue =
                    key === 'widget_config'
                      ? (draft.extracted_widget_config as unknown)
                      : (draft[`extracted_${key}` as keyof typeof draft] as unknown);
                  const json = JSON.stringify(sectionValue ?? null, null, 2);
                  return (
                    <TabsContent key={key} value={key}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-muted-foreground">
                          Raw JSON for {SECTION_LABELS[key]}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            void navigator.clipboard.writeText(json);
                          }}
                          aria-label={`Copy ${SECTION_LABELS[key]} JSON`}
                        >
                          <Code className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="rounded border bg-muted/30 p-4">
                        <pre className="text-xs overflow-auto max-h-96 whitespace-pre-wrap break-words">
                          {json}
                        </pre>
                      </div>
                    </TabsContent>
                  );
                })}
                <TabsContent value="meta">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">Assumptions, missing items, and confidence scores.</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        const metaJson = JSON.stringify(
                          {
                            assumptions: draft.assumptions,
                            missing_items: draft.missing_items,
                            confidence_scores: draft.confidence_scores,
                          },
                          null,
                          2
                        );
                        void navigator.clipboard.writeText(metaJson);
                      }}
                      aria-label="Copy meta JSON"
                    >
                      <Code className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="rounded border bg-muted/30 p-4">
                    <pre className="text-xs overflow-auto max-h-96 whitespace-pre-wrap break-words">
                      {JSON.stringify(
                        {
                          assumptions: draft.assumptions,
                          missing_items: draft.missing_items,
                          confidence_scores: draft.confidence_scores,
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="flex items-center gap-4">
            <Button onClick={handlePublish} disabled={publishSections.size === 0 || publishing} className="gap-2">
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
              Publish {publishSections.size} section(s)
            </Button>
            {error && <span className="text-sm text-destructive">{error}</span>}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Prefer the guided flow?</CardTitle>
              <CardDescription>
                Switch back to Simple mode to use the step-by-step Business Setup wizard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMode('simple');
                  router.refresh();
                }}
              >
                Switch to Simple mode
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
