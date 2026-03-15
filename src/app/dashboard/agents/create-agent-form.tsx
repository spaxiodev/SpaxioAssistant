'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Link } from '@/components/intl-link';

const ROLE_TYPES = [
  { value: 'website_chatbot', label: 'Website chatbot' },
  { value: 'support_agent', label: 'Support agent' },
  { value: 'lead_qualification', label: 'Lead qualification' },
  { value: 'sales_agent', label: 'Sales agent' },
  { value: 'booking_agent', label: 'Booking agent' },
  { value: 'quote_assistant', label: 'Quote assistant' },
  { value: 'faq_agent', label: 'FAQ agent' },
  { value: 'follow_up_agent', label: 'Follow-up agent' },
  { value: 'internal_knowledge', label: 'Internal knowledge' },
  { value: 'workflow_agent', label: 'Workflow agent' },
  { value: 'custom', label: 'Custom' },
] as const;

const MODEL_PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'custom', label: 'Custom' },
] as const;

const DEFAULT_MODELS: Record<string, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-haiku-20240307',
  openrouter: 'openai/gpt-4o-mini',
  custom: 'gpt-4o-mini',
};

export function CreateAgentForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [roleType, setRoleType] = useState<string>('website_chatbot');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [modelProvider, setModelProvider] = useState('openai');
  const [modelId, setModelId] = useState('gpt-4o-mini');
  const [temperature, setTemperature] = useState(0.7);
  const [widgetEnabled, setWidgetEnabled] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast({ title: 'Name required', description: 'Give your agent a name.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || null,
          role_type: roleType,
          system_prompt: systemPrompt.trim() || null,
          model_provider: modelProvider,
          model_id: modelId.trim() || DEFAULT_MODELS[modelProvider] || 'gpt-4o-mini',
          temperature: Number(temperature),
          enabled_tools: [],
          widget_enabled: widgetEnabled,
          webhook_enabled: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const isUpgradeRequired = data.code === 'PLAN_UPGRADE_REQUIRED' || data.code === 'plan_limit';
        toast({
          title: isUpgradeRequired ? 'Plan limit reached' : 'Could not create agent',
          description: isUpgradeRequired
            ? 'Upgrade your plan to create more agents. Go to Billing or Pricing to upgrade.'
            : (data.error ?? data.message ?? 'Something went wrong.'),
          variant: 'destructive',
        });
        return;
      }
      toast({ title: 'Agent created', description: `"${data.name}" is ready. You can configure tools and deployment next.` });
      router.push(`/dashboard/agents/${data.id}`);
    } catch (err) {
      toast({
        title: 'Error',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>New agent</CardTitle>
        <CardDescription>
          Choose a type, name, and model. You can add instructions, tools, and knowledge after creation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="agent-name">Name *</Label>
            <Input
              id="agent-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sales assistant"
              className="mt-1 max-w-md"
              maxLength={200}
            />
          </div>

          <div>
            <Label htmlFor="agent-role">Type</Label>
            <select
              id="agent-role"
              value={roleType}
              onChange={(e) => setRoleType(e.target.value)}
              className="mt-1 flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {ROLE_TYPES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="agent-desc">Description (optional)</Label>
            <Input
              id="agent-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of what this agent does"
              className="mt-1 max-w-md"
              maxLength={2000}
            />
          </div>

          <div>
            <Label htmlFor="agent-prompt">System instructions (optional)</Label>
            <textarea
              id="agent-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="e.g. You are a friendly sales assistant. Always ask for the prospect's timeline."
              className="mt-1 flex min-h-[120px] w-full max-w-2xl rounded-md border border-input bg-background px-3 py-2 text-sm"
              maxLength={16000}
              rows={5}
            />
          </div>

          <div className="flex flex-wrap gap-6">
            <div>
              <Label htmlFor="agent-provider">Model provider</Label>
              <select
                id="agent-provider"
                value={modelProvider}
                onChange={(e) => {
                  const p = e.target.value;
                  setModelProvider(p);
                  setModelId(DEFAULT_MODELS[p] ?? 'gpt-4o-mini');
                }}
                className="mt-1 flex h-10 w-full min-w-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {MODEL_PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="agent-model">Model ID</Label>
              <Input
                id="agent-model"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                placeholder="gpt-4o-mini"
                className="mt-1 w-56 font-mono text-sm"
                maxLength={128}
              />
            </div>
            <div>
              <Label htmlFor="agent-temp">Temperature (0–2)</Label>
              <Input
                id="agent-temp"
                type="number"
                min={0}
                max={2}
                step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value) || 0.7)}
                className="mt-1 w-24"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="agent-widget"
              checked={widgetEnabled}
              onChange={(e) => setWidgetEnabled(e.target.checked)}
              className="rounded border-input"
            />
            <Label htmlFor="agent-widget">Available for website widget</Label>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                'Create agent'
              )}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/dashboard/agents">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to agents
              </Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
