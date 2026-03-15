'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ui/use-toast';

type AgentWithSettings = {
  id: string;
  name: string;
  settings: {
    voice_enabled: boolean;
    greeting_text: string | null;
    max_session_duration_seconds?: number | null;
    provider?: string;
  } | null;
};

export function VoiceSettingsClient({ agentsWithSettings }: { agentsWithSettings: AgentWithSettings[] }) {
  const t = useTranslations('dashboard');
  const { toast } = useToast();
  const [saving, setSaving] = useState<string | null>(null);
  const [state, setState] = useState<Record<string, { voice_enabled: boolean; greeting_text: string }>>(() => {
    const out: Record<string, { voice_enabled: boolean; greeting_text: string }> = {};
    agentsWithSettings.forEach((a) => {
      out[a.id] = {
        voice_enabled: a.settings?.voice_enabled ?? false,
        greeting_text: a.settings?.greeting_text ?? '',
      };
    });
    return out;
  });

  async function save(agentId: string) {
    setSaving(agentId);
    try {
      const payload = state[agentId];
      const res = await fetch('/api/voice/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          voice_enabled: payload.voice_enabled,
          greeting_text: payload.greeting_text || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast({ title: t('saved') ?? 'Saved' });
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to save',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  }

  if (agentsWithSettings.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No agents yet. Create an agent first to enable voice for it.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {agentsWithSettings.map((a) => (
        <Card key={a.id}>
          <CardHeader>
            <CardTitle className="text-base">{a.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`voice-${a.id}`}
                checked={state[a.id]?.voice_enabled ?? false}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    [a.id]: { ...prev[a.id], voice_enabled: e.target.checked },
                  }))
                }
                className="h-4 w-4 rounded border-input"
              />
              <label htmlFor={`voice-${a.id}`} className="text-sm font-medium">
                Enable voice for this agent
              </label>
            </div>
            <div>
              <label htmlFor={`greeting-${a.id}`} className="text-xs text-muted-foreground">
                Greeting (optional, spoken when voice session starts)
              </label>
              <textarea
                id={`greeting-${a.id}`}
                value={state[a.id]?.greeting_text ?? ''}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    [a.id]: { ...prev[a.id], greeting_text: e.target.value },
                  }))
                }
                className="mt-1 min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="e.g. Hi! I'm here to help. What can I do for you today?"
                rows={3}
              />
            </div>
            <Button
              size="sm"
              onClick={() => save(a.id)}
              disabled={saving === a.id}
            >
              {saving === a.id ? 'Saving…' : (t('save') ?? 'Save')}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
