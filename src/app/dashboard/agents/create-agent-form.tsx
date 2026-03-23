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

// Streamlined list: only types with real behavioral differentiation (website-scanner, automations, etc.)
const ROLE_TYPES = [
  { value: 'website_chatbot', label: 'Website assistant' },
  { value: 'support_agent', label: 'Support assistant' },
  { value: 'lead_qualification', label: 'Lead qualification' },
  { value: 'sales_agent', label: 'Sales assistant' },
  { value: 'quote_assistant', label: 'Quote assistant' },
  { value: 'faq_agent', label: 'FAQ assistant' },
  { value: 'custom', label: 'Custom' },
] as const;

export function CreateAgentForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [roleType, setRoleType] = useState<string>('website_chatbot');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast({ title: 'Name required', description: 'Give your assistant a name.', variant: 'destructive' });
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
          deployment_type: 'widget',
          enabled_tools: [],
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
          Choose a type and name. Assistants deploy as a chat widget on your site. You can add instructions and knowledge after creation.
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
