'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

export function AgentMemoryTab({
  agentId,
  initialShortTerm,
  initialLongTerm,
}: {
  agentId: string;
  initialShortTerm: boolean;
  initialLongTerm: boolean;
}) {
  const [shortTerm, setShortTerm] = useState(initialShortTerm);
  const [longTerm, setLongTerm] = useState(initialLongTerm);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memory_short_term_enabled: shortTerm,
          memory_long_term_enabled: longTerm,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({ title: 'Error', description: data.error ?? 'Failed to save', variant: 'destructive' });
        return;
      }
      toast({ title: 'Saved', description: 'Memory settings updated.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Memory</CardTitle>
        <CardDescription>Short-term and long-term memory settings.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="memory_short"
            checked={shortTerm}
            onChange={(e) => setShortTerm(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          <Label htmlFor="memory_short" className="cursor-pointer">
            Short-term memory (conversation context)
          </Label>
        </div>
        <p className="text-xs text-muted-foreground">
          Keeps recent messages in context for the duration of the conversation.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="memory_long"
            checked={longTerm}
            onChange={(e) => setLongTerm(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          <Label htmlFor="memory_long" className="cursor-pointer">
            Long-term memory (contact/lead)
          </Label>
        </div>
        <p className="text-xs text-muted-foreground">
          Persists facts and preferences per contact or lead across conversations.
        </p>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Save memory settings'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
