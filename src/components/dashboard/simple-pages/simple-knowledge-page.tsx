'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Link2,
  Upload,
  FileText,
  Sparkles,
  BookOpen,
  ListPlus,
  LayoutList,
  Globe,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  SimplePageHeader,
  SimpleActionCard,
  SimpleAiAssistPanel,
  SimpleDeveloperModeLink,
} from '@/components/dashboard/simple';
import { useViewMode } from '@/contexts/view-mode-context';

const INTENT_STORAGE_KEY = 'spaxio-ai-setup-intent';

type KnowledgeSource = { id: string; name: string; source_type?: string; created_at?: string };

export function SimpleKnowledgePage() {
  const router = useRouter();
  const { setMode } = useViewMode();
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [submittingUrl, setSubmittingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const openInDeveloperMode = (path: string) => {
    setMode('developer');
    router.push(path);
  };

  useEffect(() => {
    let cancelled = false;
    fetch('/api/knowledge/sources')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setSources(Array.isArray(data.sources) ? data.sources : []);
      })
      .catch(() => {
        if (!cancelled) setSources([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAddUrl = async () => {
    const u = url.trim();
    if (!u || !u.startsWith('http')) {
      setUrlError('Please enter a valid URL (e.g. https://yoursite.com)');
      return;
    }
    setUrlError(null);
    setSubmittingUrl(true);
    try {
      const res = await fetch('/api/knowledge/ingest-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: u }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUrlError(data.error || 'Failed to add URL');
        return;
      }
      setUrl('');
      setSources((prev) => [
        ...prev,
        { id: data.sourceId ?? String(Date.now()), name: u, source_type: 'website_crawl', created_at: new Date().toISOString() },
      ]);
    } catch {
      setUrlError('Something went wrong');
    } finally {
      setSubmittingUrl(false);
    }
  };

  const goToAiSetup = (prompt: string) => {
    try {
      window.localStorage.setItem(INTENT_STORAGE_KEY, prompt);
    } catch {
      // ignore
    }
    router.push('/dashboard/ai-setup');
  };

  return (
    <div className="space-y-8">
      <SimplePageHeader
        title="What should your assistant know?"
        description="Add the information your assistant uses to answer visitors: your website, files, or text."
        icon={<BookOpen className="h-6 w-6" />}
      />

      {/* Manual actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <SimpleActionCard
          title="Add website link"
          description="We’ll read your page and add it to your assistant’s knowledge."
          icon={<Link2 className="h-5 w-5" />}
        >
          <div className="space-y-2">
            <Label htmlFor="knowledge-url">Website URL</Label>
            <div className="flex gap-2">
              <Input
                id="knowledge-url"
                type="url"
                placeholder="https://yoursite.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={submittingUrl}
              />
              <Button onClick={handleAddUrl} disabled={submittingUrl || !url.trim()}>
                {submittingUrl ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
              </Button>
            </div>
            {urlError && <p className="text-xs text-destructive">{urlError}</p>}
          </div>
        </SimpleActionCard>

        <SimpleActionCard
          title="Upload a file"
          description="PDFs and documents get added to your knowledge base."
          icon={<Upload className="h-5 w-5" />}
        >
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => openInDeveloperMode('/dashboard/knowledge')}
          >
            <Upload className="h-4 w-4" />
            Open upload in Developer Mode
          </Button>
        </SimpleActionCard>

        <SimpleActionCard
          title="Paste your business info"
          description="Add text or FAQs directly."
          icon={<FileText className="h-5 w-5" />}
        >
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => openInDeveloperMode('/dashboard/knowledge')}
          >
            <FileText className="h-4 w-4" />
            Add text in Developer Mode
          </Button>
        </SimpleActionCard>

        <SimpleActionCard
          title="Add common questions manually"
          description="Create FAQs your assistant can use."
          icon={<ListPlus className="h-5 w-5" />}
        >
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => openInDeveloperMode('/dashboard/settings')}
          >
            <LayoutList className="h-4 w-4" />
            Manage FAQs in Settings
          </Button>
        </SimpleActionCard>
      </div>

      {/* Current knowledge status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your knowledge sources</CardTitle>
          <CardDescription>
            {loading ? 'Loading…' : sources.length === 0 ? 'No sources yet. Add a website or file above.' : `${sources.length} source(s) added.`}
          </CardDescription>
        </CardHeader>
        {!loading && sources.length > 0 && (
          <CardContent>
            <ul className="space-y-2 text-sm">
              {sources.slice(0, 10).map((s) => (
                <li key={s.id} className="flex items-center gap-2">
                  {s.source_type === 'url' ? <Globe className="h-4 w-4 text-muted-foreground" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
                  <span className="truncate">{s.name}</span>
                </li>
              ))}
              {sources.length > 10 && <li className="text-muted-foreground">+{sources.length - 10} more</li>}
            </ul>
          </CardContent>
        )}
      </Card>

      {/* AI assist */}
      <SimpleAiAssistPanel
        title="AI can help"
        description="Use AI to organize or improve your content."
        actions={[
          { label: 'Turn this into FAQs', onClick: () => goToAiSetup('Turn my website content into FAQs for my assistant.') },
          { label: 'Organize my content', onClick: () => goToAiSetup('Organize and structure my knowledge content.') },
          { label: 'Summarize my website', onClick: () => goToAiSetup('Summarize my website and add it to my assistant knowledge.') },
          { label: 'Improve my assistant knowledge', onClick: () => goToAiSetup('Improve what my assistant knows and how it answers.') },
        ]}
      />

      <SimpleDeveloperModeLink developerPath="/dashboard/knowledge" linkLabel="Open Knowledge in Developer Mode" />
    </div>
  );
}
