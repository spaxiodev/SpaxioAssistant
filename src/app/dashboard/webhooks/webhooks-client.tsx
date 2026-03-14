'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Copy, Plus, Trash2, Key, Check, X } from 'lucide-react';
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

type Props = {
  initialEndpoints: Endpoint[];
  baseUrl: string;
};

export function WebhooksClient({ initialEndpoints, baseUrl }: Props) {
  const [endpoints, setEndpoints] = useState<Endpoint[]>(initialEndpoints);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createSlug, setCreateSlug] = useState('');
  const [creating, setCreating] = useState(false);
  const [secretById, setSecretById] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const effectiveBase = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');

  const handleCreate = async () => {
    const name = createName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch('/api/webhooks/endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug: createSlug.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      setEndpoints((prev) => [data.endpoint, ...prev]);
      if (data.endpoint.secret) {
        setSecretById((s) => ({ ...s, [data.endpoint.id]: data.endpoint.secret }));
      }
      setCreateOpen(false);
      setCreateName('');
      setCreateSlug('');
      toast({ title: 'Endpoint created', description: 'Copy the secret now; it won’t be shown again.' });
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      const res = await fetch(`/api/webhooks/endpoints/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setEndpoints((prev) => prev.map((e) => (e.id === id ? { ...e, active } : e)));
      toast({ title: active ? 'Endpoint enabled' : 'Endpoint paused' });
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const deleteEndpoint = async (id: string) => {
    if (!confirm('Delete this endpoint? Incoming webhooks will stop working.')) return;
    try {
      const res = await fetch(`/api/webhooks/endpoints/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setEndpoints((prev) => prev.filter((e) => e.id !== id));
      toast({ title: 'Endpoint deleted' });
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const copyUrl = (ep: Endpoint) => {
    const url = `${effectiveBase}/api/webhooks/incoming/${ep.id}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'URL copied to clipboard' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add endpoint
        </Button>
      </div>

      {endpoints.length === 0 ? (
        <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          No webhook endpoints yet. Create one to receive data from external systems.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {endpoints.map((ep) => (
            <li key={ep.id} className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0">
              <div>
                <p className="font-medium">{ep.name}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {effectiveBase ? `${effectiveBase}/api/webhooks/incoming/${ep.id}` : `…/api/webhooks/incoming/${ep.id}`}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Header: X-Webhook-Secret: [your secret]</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant={ep.active ? 'default' : 'secondary'}>{ep.active ? 'Active' : 'Paused'}</Badge>
                  {ep.last_failure_at && (
                    <span className="text-xs text-destructive">
                      Last failure: {new Date(ep.last_failure_at).toLocaleString()}
                      {ep.last_failure_message ? ` — ${ep.last_failure_message.slice(0, 80)}` : ''}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => copyUrl(ep)}>
                  <Copy className="h-4 w-4" />
                </Button>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={ep.active}
                    onChange={(e) => toggleActive(ep.id, e.target.checked)}
                    className="rounded border-input"
                  />
                  Active
                </label>
                <Button variant="ghost" size="sm" asChild>
                  <a href={`/dashboard/webhooks/${ep.id}`}>Configure</a>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => deleteEndpoint(ep.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create webhook endpoint</DialogTitle>
            <DialogDescription>Name and slug are used to build the URL. A secret will be generated for verification.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="wh-name">Name</Label>
              <Input
                id="wh-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. CRM sync"
              />
            </div>
            <div>
              <Label htmlFor="wh-slug">Slug (optional)</Label>
              <Input
                id="wh-slug"
                value={createSlug}
                onChange={(e) => setCreateSlug(e.target.value)}
                placeholder="e.g. crm-sync"
              />
              <p className="text-xs text-muted-foreground mt-1">URL path will be /api/webhooks/incoming/[slug]</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !createName.trim()}>
              {creating ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
