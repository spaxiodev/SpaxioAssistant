'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

const PAGE_TYPES = [
  { value: 'quote', label: 'Quote Assistant' },
  { value: 'support', label: 'Support Assistant' },
  { value: 'intake', label: 'Intake / Booking' },
  { value: 'general', label: 'General' },
] as const;

const DEPLOYMENT_MODES = [
  { value: 'page_only', label: 'Page only' },
  { value: 'widget_and_page', label: 'Widget + Page' },
  { value: 'widget_handoff_to_page', label: 'Widget can hand off to this page' },
] as const;

const TEMPLATES: Record<string, { title: string; slug: string; welcome_message: string; intro_copy: string }> = {
  quote: {
    title: 'Quote Assistant',
    slug: 'quote',
    welcome_message: 'Tell us about your project and our AI assistant will gather the right details for an accurate estimate.',
    intro_copy: 'Answer a few questions so we can prepare a quote for you.',
  },
  support: {
    title: 'Support Assistant',
    slug: 'support',
    welcome_message: 'Describe the issue and I\'ll help troubleshoot it step by step.',
    intro_copy: 'We\'ll try to resolve your issue or create a support ticket.',
  },
  intake: {
    title: 'Intake Assistant',
    slug: 'intake',
    welcome_message: 'I\'ll ask a few quick questions to prepare the best next step.',
    intro_copy: 'Share your details and we\'ll get you set up.',
  },
  general: {
    title: 'Assistant',
    slug: 'assistant',
    welcome_message: 'How can I help you today?',
    intro_copy: '',
  },
};

type Agent = { id: string; name: string };

type Props = {
  agents: Agent[];
  initial?: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    page_type: string;
    deployment_mode: string;
    agent_id: string | null;
    welcome_message: string | null;
    intro_copy: string | null;
    trust_copy: string | null;
  };
};

export function AiPageForm({ agents, initial }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [pageType, setPageType] = useState(initial?.page_type ?? 'quote');
  const [deploymentMode, setDeploymentMode] = useState(initial?.deployment_mode ?? 'page_only');
  const [agentId, setAgentId] = useState(initial?.agent_id ?? '');
  const [welcomeMessage, setWelcomeMessage] = useState(initial?.welcome_message ?? TEMPLATES.quote.welcome_message);
  const [introCopy, setIntroCopy] = useState(initial?.intro_copy ?? TEMPLATES.quote.intro_copy);
  const [trustCopy, setTrustCopy] = useState(initial?.trust_copy ?? '');

  function applyTemplate(type: string) {
    const t = TEMPLATES[type] ?? TEMPLATES.general;
    setTitle(t.title);
    setSlug(t.slug);
    setWelcomeMessage(t.welcome_message);
    setIntroCopy(t.intro_copy);
    setPageType(type);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast({ title: 'Title required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const url = initial
        ? `/api/dashboard/ai-pages/${initial.id}`
        : '/api/dashboard/ai-pages';
      const method = initial ? 'PUT' : 'POST';
      const body = {
        title: trimmedTitle,
        slug: slug.trim() || trimmedTitle.toLowerCase().replace(/\s+/g, '-'),
        description: description.trim() || null,
        page_type: pageType,
        deployment_mode: deploymentMode,
        agent_id: agentId.trim() || null,
        welcome_message: welcomeMessage.trim() || null,
        intro_copy: introCopy.trim() || null,
        trust_copy: trustCopy.trim() || null,
      };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || 'Failed to save', variant: 'destructive' });
        return;
      }
      toast({ title: initial ? 'Updated' : 'AI Page created' });
      if (!initial) router.push(`/dashboard/ai-pages/${data.page.id}`);
      else router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
          <div className="flex flex-wrap gap-2">
            {PAGE_TYPES.map(({ value, label }) => (
              <Button
                key={value}
                type="button"
                variant={pageType === value ? 'default' : 'outline'}
                size="sm"
                onClick={() => applyTemplate(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Quote Assistant"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="slug">URL slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="quote"
            />
            <p className="text-xs text-muted-foreground">
              Public URL: /a/{slug || '…'}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description for the page header"
            />
          </div>
          <div className="grid gap-2">
            <Label>Page type</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={pageType}
              onChange={(e) => setPageType(e.target.value)}
            >
              {PAGE_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label>Deployment mode</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={deploymentMode}
              onChange={(e) => setDeploymentMode(e.target.value)}
            >
              {DEPLOYMENT_MODES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          {agents.length > 0 && (
            <div className="grid gap-2">
              <Label>Agent (optional)</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
              >
                <option value="">Default / business settings</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="welcome">Welcome message</Label>
            <Input
              id="welcome"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="First message visitors see"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="intro">Intro copy</Label>
            <Input
              id="intro"
              value={introCopy}
              onChange={(e) => setIntroCopy(e.target.value)}
              placeholder="Short instructions"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="trust">Trust copy</Label>
            <Input
              id="trust"
              value={trustCopy}
              onChange={(e) => setTrustCopy(e.target.value)}
              placeholder="e.g. Your information is secure"
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {initial ? 'Update' : 'Create'} AI Page
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
