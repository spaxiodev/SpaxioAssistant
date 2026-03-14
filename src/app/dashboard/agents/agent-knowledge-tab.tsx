'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

type Source = { id: string; name: string; source_type: string };

export function AgentKnowledgeTab({
  agentId,
  initialLinkedIds,
}: {
  agentId: string;
  initialLinkedIds: string[];
}) {
  const [sources, setSources] = useState<Source[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(initialLinkedIds));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/knowledge/sources')
      .then((r) => r.json())
      .then((data) => setSources(data.sources ?? []))
      .catch(() => setSources([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setSelected(new Set(initialLinkedIds));
  }, [agentId, initialLinkedIds.join(',')]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linked_knowledge_source_ids: Array.from(selected) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({ title: 'Error', description: data.error ?? 'Failed to save', variant: 'destructive' });
        return;
      }
      toast({ title: 'Saved', description: 'Knowledge sources updated.' });
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
      <Card>
        <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading knowledge sources…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Knowledge</CardTitle>
        <CardDescription>Link knowledge sources for RAG and answers.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sources.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No knowledge sources yet. Add sources in Knowledge to link them here.
          </p>
        ) : (
          <>
            <Label className="text-sm font-medium">Linked sources</Label>
            <p className="text-xs text-muted-foreground">
              Selected sources will be used to ground this agent&apos;s answers.
            </p>
            <ul className="space-y-2">
              {sources.map((s) => (
                <li key={s.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={`src-${s.id}`}
                    checked={selected.has(s.id)}
                    onChange={() => toggle(s.id)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <label htmlFor={`src-${s.id}`} className="cursor-pointer text-sm">
                    <span className="font-medium">{s.name}</span>
                    <span className="ml-2 text-muted-foreground">({s.source_type})</span>
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
                'Save linked sources'
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
