'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

type Tool = { id: string; name: string; description: string };

export function AgentEnabledTools({
  agentId,
  initialEnabledIds,
}: {
  agentId: string;
  initialEnabledIds: string[];
}) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(initialEnabledIds));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/tools/list')
      .then((r) => r.json())
      .then((data) => {
        setTools(data.tools ?? []);
      })
      .catch(() => setTools([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setSelected(new Set(initialEnabledIds));
  }, [agentId, initialEnabledIds.join(',')]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled_tools: Array.from(selected) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({ title: 'Error', description: data.error ?? 'Failed to save', variant: 'destructive' });
        return;
      }
      toast({ title: 'Saved', description: 'Enabled tools updated. Widget chat will use them on the next message.' });
    } finally {
      setSaving(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading tools…
      </div>
    );
  }

  if (tools.length === 0) {
    return <p className="text-sm text-muted-foreground">No tools available.</p>;
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Enabled tools (used in widget chat)</Label>
      <p className="text-xs text-muted-foreground">
        When visitors chat on your website, the agent can use these tools. Enable the ones you want.
      </p>
      <ul className="space-y-2">
        {tools.map((t) => (
          <li key={t.id} className="flex items-start gap-3">
            <input
              type="checkbox"
              id={`tool-${t.id}`}
              checked={selected.has(t.id)}
              onChange={() => toggle(t.id)}
              className="mt-1 h-4 w-4 rounded border-input"
            />
            <label htmlFor={`tool-${t.id}`} className="flex-1 cursor-pointer text-sm">
              <span className="font-medium">{t.name}</span>
              {t.description && (
                <span className="block text-muted-foreground">{t.description}</span>
              )}
            </label>
          </li>
        ))}
      </ul>
      <Button size="sm" onClick={handleSave} disabled={saving}>
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving…
          </>
        ) : (
          'Save enabled tools'
        )}
      </Button>
    </div>
  );
}
