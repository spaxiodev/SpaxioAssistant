'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

type Endpoint = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_failure_message: string | null;
  created_at: string;
};

type Mapping = {
  id: string;
  source_path: string;
  target_key: string;
  value_type: string;
  required: boolean;
  default_value: string | null;
};

const VALUE_TYPES = ['text', 'email', 'phone', 'number', 'boolean', 'date', 'json'];

type Props = {
  endpoint: Endpoint;
  initialMappings: Mapping[];
  baseUrl: string;
};

export function WebhookEndpointClient({ endpoint, initialMappings, baseUrl }: Props) {
  const [mappings, setMappings] = useState<Mapping[]>(initialMappings);
  const [addPath, setAddPath] = useState('');
  const [addTarget, setAddTarget] = useState('');
  const [addType, setAddType] = useState('text');
  const [addRequired, setAddRequired] = useState(false);
  const [addDefault, setAddDefault] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const effectiveBase = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const webhookUrl = `${effectiveBase}/api/webhooks/incoming/${endpoint.id}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({ title: 'URL copied to clipboard' });
  };

  const addMapping = async () => {
    const source_path = addPath.trim();
    const target_key = addTarget.trim();
    if (!source_path || !target_key) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/webhooks/endpoints/${endpoint.id}/mappings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_path,
          target_key,
          value_type: addType,
          required: addRequired,
          default_value: addDefault.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add mapping');
      setMappings((prev) => [...prev, data.mapping]);
      setAddPath('');
      setAddTarget('');
      setAddDefault('');
      toast({ title: 'Mapping added' });
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const removeMapping = async (mappingId: string) => {
    try {
      const res = await fetch(`/api/webhooks/endpoints/${endpoint.id}/mappings/${mappingId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setMappings((prev) => prev.filter((m) => m.id !== mappingId));
      toast({ title: 'Mapping removed' });
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Endpoint URL</CardTitle>
          <CardDescription>POST to this URL to send data. Use the secret in a header (e.g. X-Webhook-Secret) for verification.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-sm">{webhookUrl}</code>
          <Button variant="outline" size="sm" onClick={copyUrl}>
            <Copy className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Field mappings</CardTitle>
          <CardDescription>Map JSON paths from the incoming payload to internal variable names for use in automations (e.g. trigger.payload.email).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mappings.length > 0 && (
            <ul className="divide-y divide-border">
              {mappings.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-2">
                  <span className="font-mono text-sm">{m.source_path}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-mono text-sm">{m.target_key}</span>
                  <span className="text-xs text-muted-foreground">({m.value_type}{m.required ? ', required' : ''})</span>
                  <Button variant="ghost" size="sm" onClick={() => removeMapping(m.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <Input
              placeholder="Source path (e.g. body.email)"
              value={addPath}
              onChange={(e) => setAddPath(e.target.value)}
            />
            <Input
              placeholder="Target key (e.g. email)"
              value={addTarget}
              onChange={(e) => setAddTarget(e.target.value)}
            />
            <select
              value={addType}
              onChange={(e) => setAddType(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {VALUE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="required"
                checked={addRequired}
                onChange={(e) => setAddRequired(e.target.checked)}
              />
              <Label htmlFor="required">Required</Label>
            </div>
            <Input
              placeholder="Default value"
              value={addDefault}
              onChange={(e) => setAddDefault(e.target.value)}
            />
          </div>
          <Button onClick={addMapping} disabled={saving || !addPath.trim() || !addTarget.trim()}>
            <Plus className="mr-2 h-4 w-4" />
            Add mapping
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
