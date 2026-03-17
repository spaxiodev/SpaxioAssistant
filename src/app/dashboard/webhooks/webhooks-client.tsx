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
  agent_id?: string | null;
  agent_name?: string | null;
};

type Agent = { id: string; name: string };

type Props = {
  initialEndpoints: Endpoint[];
  initialAgents: Agent[];
  baseUrl: string;
};

export function WebhooksClient({ initialEndpoints, initialAgents, baseUrl }: Props) {
  const [endpoints, setEndpoints] = useState<Endpoint[]>(initialEndpoints);
  const [agentFilter, setAgentFilter] = useState<string>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createSlug, setCreateSlug] = useState('');
  const [createAgentId, setCreateAgentId] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [endpointToDelete, setEndpointToDelete] = useState<Endpoint | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [secretById, setSecretById] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const filteredEndpoints = agentFilter
    ? endpoints.filter((e) => e.agent_id === agentFilter)
    : endpoints;

  const effectiveBase = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');

  const handleCreate = async () => {
    const name = createName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch('/api/webhooks/endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug: createSlug.trim() || undefined,
          ...(createAgentId && { agent_id: createAgentId }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      const newEp = {
        ...data.endpoint,
        agent_id: data.endpoint.agent_id ?? null,
        agent_name: createAgentId ? initialAgents.find((a) => a.id === createAgentId)?.name ?? null : null,
      };
      setEndpoints((prev) => [newEp, ...prev]);
      if (data.endpoint.secret) {
        setSecretById((s) => ({ ...s, [data.endpoint.id]: data.endpoint.secret }));
      }
      setCreateOpen(false);
      setCreateName('');
      setCreateSlug('');
      setCreateAgentId('');
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

  const handleDeleteEndpointConfirm = async () => {
    if (!endpointToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/webhooks/endpoints/${endpointToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setEndpoints((prev) => prev.filter((e) => e.id !== endpointToDelete.id));
      setEndpointToDelete(null);
      toast({ title: 'Endpoint deleted' });
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const copyUrl = (ep: Endpoint) => {
    const url = `${effectiveBase}/api/webhooks/incoming/${ep.id}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'URL copied to clipboard' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">Agent:</label>
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All agents</option>
            {initialAgents.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add endpoint
        </Button>
      </div>

      {filteredEndpoints.length === 0 ? (
        <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          {agentFilter ? 'No webhook endpoints for this agent.' : 'No webhook endpoints yet. Create one to receive data from external systems.'}
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {filteredEndpoints.map((ep) => (
            <li key={ep.id} className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0">
              <div>
                <p className="font-medium">{ep.name}</p>
                {ep.agent_name && (
                  <p className="text-xs text-muted-foreground">Agent: {ep.agent_name}</p>
                )}
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
                <Button variant="destructive" size="sm" onClick={() => setEndpointToDelete(ep)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!endpointToDelete} onOpenChange={(open) => !open && setEndpointToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete webhook endpoint?</DialogTitle>
            <DialogDescription>
              Delete this endpoint? Incoming webhooks will stop working. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-4">
            <Button variant="outline" onClick={() => setEndpointToDelete(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteEndpointConfirm} disabled={deleting}>
              {deleting ? '…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <Label htmlFor="wh-agent">Agent (optional)</Label>
              <select
                id="wh-agent"
                value={createAgentId}
                onChange={(e) => setCreateAgentId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Workspace (all agents)</option>
                {initialAgents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">Leave empty for a workspace-level endpoint.</p>
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
