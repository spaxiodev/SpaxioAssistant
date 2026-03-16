'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ViewModeClientGate } from '@/components/dashboard/view-mode-client-gate';
import { useToast } from '@/components/ui/use-toast';
import { Copy, CheckSquare, StickyNote, Loader2 } from 'lucide-react';

type FollowUpRun = {
  id: string;
  status: string;
  generated_summary: string | null;
  recommended_action: string | null;
  recommended_priority: string | null;
  draft_email_subject: string | null;
  draft_email_body: string | null;
  draft_note: string | null;
  draft_task_title: string | null;
};

type Props = {
  leadId?: string;
  quoteRequestId?: string;
};

function simpleLabel(priority: string | null, source: 'lead' | 'quote'): string {
  if (priority === 'high') return 'High-value opportunity';
  if (priority === 'medium') return source === 'quote' ? 'Send a quote follow-up' : 'Reply soon';
  if (priority === 'low') return 'Needs follow-up';
  return source === 'quote' ? 'Quote follow-up' : 'Follow up';
}

export function FollowUpCard({ leadId, quoteRequestId }: Props) {
  const [run, setRun] = useState<FollowUpRun | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const source = quoteRequestId ? 'quote' : 'lead';
  const id = leadId ?? quoteRequestId ?? '';

  useEffect(() => {
    if (!id) {
      setRun(null);
      setLoading(false);
      return;
    }
    const q = leadId ? `leadId=${encodeURIComponent(leadId)}` : `quoteRequestId=${encodeURIComponent(quoteRequestId!)}`;
    fetch(`/api/follow-up?${q}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setRun(data && data.id ? data : null);
      })
      .catch(() => setRun(null))
      .finally(() => setLoading(false));
  }, [leadId, quoteRequestId]);

  const copyDraft = () => {
    if (!run?.draft_email_body && !run?.draft_email_subject) return;
    const text = [run.draft_email_subject, '', run.draft_email_body].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast({ title: 'Copied', description: 'Email draft copied to clipboard.' });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const apply = async (action: 'create_task' | 'add_note') => {
    if (!run?.id) return;
    setApplying(action);
    try {
      const res = await fetch('/api/follow-up/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: run.id, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: 'Error', description: data.error || 'Failed', variant: 'destructive' });
        return;
      }
      toast({ title: action === 'create_task' ? 'Task created' : 'Note added' });
      router.refresh();
    } finally {
      setApplying(null);
    }
  };

  if (loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!run || run.status !== 'completed') return null;

  return (
    <Card className="overflow-hidden border-primary/20 bg-primary/5">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-foreground">
            {simpleLabel(run.recommended_priority, source)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <ViewModeClientGate
          simple={
            <>
              {run.generated_summary && (
                <p className="text-sm text-muted-foreground">{run.generated_summary}</p>
              )}
              {run.recommended_action && (
                <p className="text-xs font-medium text-foreground">Next: {run.recommended_action}</p>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                {(run.draft_email_subject || run.draft_email_body) && (
                  <Button variant="outline" size="sm" onClick={copyDraft} disabled={copied}>
                    <Copy className="mr-1 h-3 w-3" />
                    {copied ? 'Copied' : 'Copy email draft'}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => apply('create_task')}
                  disabled={!!applying}
                >
                  {applying === 'create_task' ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <CheckSquare className="mr-1 h-3 w-3" />
                  )}
                  Create task
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => apply('add_note')}
                  disabled={!!applying}
                >
                  {applying === 'add_note' ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <StickyNote className="mr-1 h-3 w-3" />
                  )}
                  Add note
                </Button>
              </div>
            </>
          }
          developer={
            <>
              {run.generated_summary && (
                <p className="text-sm text-muted-foreground">{run.generated_summary}</p>
              )}
              <dl className="grid gap-1 text-xs">
                {run.recommended_action && (
                  <>
                    <dt className="font-medium text-muted-foreground">Recommended action</dt>
                    <dd>{run.recommended_action}</dd>
                  </>
                )}
                {run.recommended_priority && (
                  <>
                    <dt className="font-medium text-muted-foreground">Priority</dt>
                    <dd>{run.recommended_priority}</dd>
                  </>
                )}
                {run.draft_email_subject && (
                  <>
                    <dt className="font-medium text-muted-foreground">Draft subject</dt>
                    <dd className="truncate">{run.draft_email_subject}</dd>
                  </>
                )}
                {run.draft_task_title && (
                  <>
                    <dt className="font-medium text-muted-foreground">Draft task</dt>
                    <dd>{run.draft_task_title}</dd>
                  </>
                )}
              </dl>
              <div className="flex flex-wrap gap-2 pt-2">
                {(run.draft_email_subject || run.draft_email_body) && (
                  <Button variant="outline" size="sm" onClick={copyDraft} disabled={copied}>
                    <Copy className="mr-1 h-3 w-3" />
                    {copied ? 'Copied' : 'Copy email draft'}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => apply('create_task')}
                  disabled={!!applying}
                >
                  {applying === 'create_task' ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckSquare className="mr-1 h-3 w-3" />}
                  Create task
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => apply('add_note')}
                  disabled={!!applying}
                >
                  {applying === 'add_note' ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <StickyNote className="mr-1 h-3 w-3" />}
                  Add note
                </Button>
              </div>
            </>
          }
        />
      </CardContent>
    </Card>
  );
}
