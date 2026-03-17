'use client';

import { useState, useEffect } from 'react';
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
import type { SourceInputs } from '@/lib/business-setup/types';
import { SECTION_LABELS } from '@/lib/business-setup/ai-business-review-service';
import type { DraftSectionKey } from '@/lib/business-setup/types';

type DraftSummary = { id: string; status: string; updated_at: string };

export function BusinessSetupDeveloperView({
  initialDrafts,
}: {
  initialDrafts: DraftSummary[];
}) {
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
          Create a draft, run AI extraction, inspect raw JSON, and publish selected sections.
        </p>
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
          <div className="flex flex-wrap gap-2">
            {drafts.map((d) => (
              <Button
                key={d.id}
                variant={selectedDraftId === d.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedDraftId(d.id)}
              >
                {d.id.slice(0, 8)}… <Badge variant="secondary" className="ml-1">{d.status}</Badge>
              </Button>
            ))}
          </div>
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
              <CardDescription>Toggle sections to include when publishing. Raw JSON below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
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
              <div className="rounded border bg-muted/30 p-4">
                <pre className="text-xs overflow-auto max-h-96 whitespace-pre-wrap break-words">
                  {JSON.stringify(
                    {
                      business_profile: draft.extracted_business_profile,
                      services: draft.extracted_services,
                      knowledge: draft.extracted_knowledge,
                      pricing: draft.extracted_pricing,
                      agents: draft.extracted_agents,
                      automations: draft.extracted_automations,
                      widget_config: draft.extracted_widget_config,
                      ai_pages: draft.extracted_ai_pages,
                      branding: draft.extracted_branding,
                      assumptions: draft.assumptions,
                      missing_items: draft.missing_items,
                      confidence_scores: draft.confidence_scores,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-4">
            <Button onClick={handlePublish} disabled={publishSections.size === 0 || publishing} className="gap-2">
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
              Publish {publishSections.size} section(s)
            </Button>
            {error && <span className="text-sm text-destructive">{error}</span>}
          </div>
        </>
      )}
    </div>
  );
}
