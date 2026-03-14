'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

type AgentInstructionFields = {
  id: string;
  system_prompt?: string | null;
  goal?: string | null;
  tone?: string | null;
  fallback_behavior?: string | null;
  escalation_behavior?: string | null;
};

export function AgentInstructionsTab({ agent }: { agent: AgentInstructionFields }) {
  const [systemPrompt, setSystemPrompt] = useState(agent.system_prompt ?? '');
  const [goal, setGoal] = useState(agent.goal ?? '');
  const [tone, setTone] = useState(agent.tone ?? '');
  const [fallback, setFallback] = useState(agent.fallback_behavior ?? '');
  const [escalation, setEscalation] = useState(agent.escalation_behavior ?? '');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_prompt: systemPrompt || null,
          goal: goal || null,
          tone: tone || null,
          fallback_behavior: fallback || null,
          escalation_behavior: escalation || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({ title: 'Error', description: data.error ?? 'Failed to save', variant: 'destructive' });
        return;
      }
      toast({ title: 'Saved', description: 'Instructions updated.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Instructions</CardTitle>
        <CardDescription>System prompt, goal, tone, and fallback behavior.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="system_prompt">System prompt</Label>
          <Textarea
            id="system_prompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={6}
            className="font-mono text-sm"
            placeholder="You are a helpful assistant..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="goal">Goal</Label>
          <Textarea
            id="goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={2}
            placeholder="Primary objective for this agent"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tone">Tone</Label>
          <Input
            id="tone"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            placeholder="e.g. Professional, friendly, concise"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fallback">Fallback behavior</Label>
          <Textarea
            id="fallback"
            value={fallback}
            onChange={(e) => setFallback(e.target.value)}
            rows={2}
            placeholder="What to do when the agent cannot answer"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="escalation">Escalation behavior</Label>
          <Textarea
            id="escalation"
            value={escalation}
            onChange={(e) => setEscalation(e.target.value)}
            rows={2}
            placeholder="When and how to escalate to a human"
          />
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Save instructions'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
