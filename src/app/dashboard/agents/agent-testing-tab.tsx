'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

export function AgentTestingTab({ agentId }: { agentId: string }) {
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleRun() {
    const trimmed = message.trim();
    if (!trimmed) {
      toast({ title: 'Enter a message', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setReply(null);
    try {
      const res = await fetch(`/api/agents/${agentId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: 'Error', description: data.error ?? 'Test failed', variant: 'destructive' });
        return;
      }
      setReply(data.reply ?? '');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Testing</CardTitle>
        <CardDescription>Run the agent with a sample message and see the reply.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="test_message">Test message</Label>
          <Textarea
            id="test_message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Type a message to send to the agent..."
            disabled={loading}
          />
        </div>
        <Button onClick={handleRun} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running…
            </>
          ) : (
            'Send test message'
          )}
        </Button>
        {reply !== null && (
          <div className="rounded-md border border-border bg-muted/30 p-4">
            <p className="mb-2 text-sm font-medium text-muted-foreground">Reply</p>
            <div className="whitespace-pre-wrap text-sm">{reply || '(empty)'}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
