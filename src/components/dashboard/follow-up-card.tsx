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

type FollowUpDraft = {
  id: string;
  status: string;
  subject: string;
  body_text: string | null;
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
  const [draft, setDraft] = useState<FollowUpDraft | null>(null);
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

  useEffect(() => {
    if (!id) return;
    const q = leadId ? `leadId=${encodeURIComponent(leadId)}` : `quoteRequestId=${encodeURIComponent(quoteRequestId!)}`;
    fetch(`/api/follow-up/drafts?${q}&status=pending_approval`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const row = Array.isArray(data?.drafts) ? data.drafts[0] : null;
        setDraft(row && row.id ? row : null);
      })
      .catch(() => setDraft(null));
  }, [id, leadId, quoteRequestId]);

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

  const draftAction = async (action: 'approve_send_draft' | 'reject_draft') => {
    if (!draft?.id) return;
    setApplying(action);
    try {
      const res = await fetch('/api/follow-up/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId: draft.id, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: 'Error', description: data.error || 'Failed', variant: 'destructive' });
        return;
      }
      toast({ title: action === 'approve_send_draft' ? 'Draft sent' : 'Draft rejected' });
      router.refresh();
      setDraft(null);
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

  if ((!run || run.status !== 'completed') && !draft) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-5 text-center text-sm text-muted-foreground">
          {run?.status === 'failed'
            ? 'Follow-up analysis failed. It will be retried on the next quote submission.'
            : 'No follow-up analysis yet for this quote.'}
        </CardContent>
      </Card>
    );
  }
  const viewRun = run ?? {
    id: '',
    status: '',
    generated_summary: null,
    recommended_action: null,
    recommended_priority: null,
    draft_email_subject: null,
    draft_email_body: null,
    draft_note: null,
    draft_task_title: null,
  };

  return (
    <Card className="overflow-hidden border-primary/20 bg-primary/5">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-foreground">
            {simpleLabel(viewRun.recommended_priority, source)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <ViewModeClientGate
          simple={
            <>
              {viewRun.generated_summary && (
                <p className="text-sm text-muted-foreground">{viewRun.generated_summary}</p>
              )}
              {viewRun.recommended_action && (
                <p className="text-xs font-medium text-foreground">Next: {viewRun.recommended_action}</p>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                {draft?.status === 'pending_approval' && (
                  <>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => draftAction('approve_send_draft')}
                      disabled={!!applying}
                    >
                      {applying === 'approve_send_draft' ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                      Approve & send draft
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => draftAction('reject_draft')}
                      disabled={!!applying}
                    >
                      Reject draft
                    </Button>
                  </>
                )}
                {(viewRun.draft_email_subject || viewRun.draft_email_body) && (
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
              {viewRun.generated_summary && (
                <p className="text-sm text-muted-foreground">{viewRun.generated_summary}</p>
              )}
              <dl className="grid gap-1 text-xs">
                {viewRun.recommended_action && (
                  <>
                    <dt className="font-medium text-muted-foreground">Recommended action</dt>
                    <dd>{viewRun.recommended_action}</dd>
                  </>
                )}
                {viewRun.recommended_priority && (
                  <>
                    <dt className="font-medium text-muted-foreground">Priority</dt>
                    <dd>{viewRun.recommended_priority}</dd>
                  </>
                )}
                {viewRun.draft_email_subject && (
                  <>
                    <dt className="font-medium text-muted-foreground">Draft subject</dt>
                    <dd className="truncate">{viewRun.draft_email_subject}</dd>
                  </>
                )}
                {viewRun.draft_task_title && (
                  <>
                    <dt className="font-medium text-muted-foreground">Draft task</dt>
                    <dd>{viewRun.draft_task_title}</dd>
                  </>
                )}
              </dl>
              <div className="flex flex-wrap gap-2 pt-2">
                {draft?.status === 'pending_approval' && (
                  <>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => draftAction('approve_send_draft')}
                      disabled={!!applying}
                    >
                      {applying === 'approve_send_draft' ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                      Approve & send draft
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => draftAction('reject_draft')}
                      disabled={!!applying}
                    >
                      Reject draft
                    </Button>
                  </>
                )}
                {(viewRun.draft_email_subject || viewRun.draft_email_body) && (
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
