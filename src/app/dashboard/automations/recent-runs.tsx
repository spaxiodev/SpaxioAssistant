'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';

export type RunWithName = {
  id: string;
  automation_id: string;
  automation_name: string | null;
  status: string;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  trigger_event_type?: string | null;
  duration_ms?: number | null;
  summary?: string | null;
  trace_id?: string | null;
};

type RunDetail = RunWithName & {
  input_payload?: unknown;
  output_payload?: unknown;
  correlation_id?: string | null;
};

type Props = {
  runs: RunWithName[];
};

export function RecentRuns({ runs }: Props) {
  const t = useTranslations('dashboard');
  const [detailRun, setDetailRun] = useState<RunDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const openDetail = async (runId: string) => {
    setLoadingDetail(true);
    setDetailRun(null);
    try {
      const res = await fetch(`/api/automations/runs/${runId}`);
      if (res.ok) {
        const data = await res.json();
        setDetailRun(data);
      }
    } finally {
      setLoadingDetail(false);
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'running':
      case 'queued':
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'queued':
        return t('runStatusQueued');
      case 'running':
        return t('runStatusRunning');
      case 'success':
        return t('runStatusSuccess');
      case 'failed':
        return t('runStatusFailed');
      default:
        return status;
    }
  };

  if (runs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        {t('noRuns')}
      </div>
    );
  }

  return (
    <>
      <ul className="divide-y divide-border rounded-lg border border-border/50 bg-card/50">
        {runs.map((r) => (
          <li
            key={r.id}
            role="button"
            tabIndex={0}
            onClick={() => openDetail(r.id)}
            onKeyDown={(e) => e.key === 'Enter' && openDetail(r.id)}
            className="flex cursor-pointer items-start justify-between gap-3 px-4 py-3 first:pt-3 last:pb-3 transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">{r.automation_name ?? 'Automation'}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
              {statusIcon(r.status)}
              <Badge variant={r.status === 'failed' ? 'destructive' : 'secondary'} className="font-normal">
                {statusLabel(r.status)}
              </Badge>
              <span>{new Date(r.started_at).toLocaleString()}</span>
              {r.trigger_event_type && (
                <span className="rounded bg-muted/80 px-1.5 py-0.5 font-mono text-xs">
                  {r.trigger_event_type}
                </span>
              )}
              {r.duration_ms != null && r.duration_ms >= 0 && (
                <span>{r.duration_ms}ms</span>
              )}
            </div>
            {r.summary && r.status === 'success' && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{r.summary}</p>
            )}
            {r.error_message && (
              <p className="mt-1 text-xs text-destructive">{r.error_message}</p>
            )}
          </div>
        </li>
      ))}
    </ul>

      <Dialog open={!!detailRun || loadingDetail} onOpenChange={(open) => !open && setDetailRun(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detailRun?.automation_name ?? 'Run detail'}
              {detailRun?.trace_id && (
                <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                  {detailRun.trace_id}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {loadingDetail && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
          {detailRun && !loadingDetail && (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant={detailRun.status === 'failed' ? 'destructive' : 'secondary'}>
                  {detailRun.status}
                </Badge>
                {detailRun.trigger_event_type && (
                  <Badge variant="outline">{detailRun.trigger_event_type}</Badge>
                )}
                {detailRun.duration_ms != null && (
                  <span className="text-muted-foreground">{detailRun.duration_ms}ms</span>
                )}
                <span className="text-muted-foreground">
                  {new Date(detailRun.started_at).toLocaleString()}
                  {detailRun.completed_at && ` → ${new Date(detailRun.completed_at).toLocaleString()}`}
                </span>
              </div>
              {detailRun.error_message && (
                <div className="rounded border border-destructive/50 bg-destructive/5 p-3">
                  <p className="font-medium text-destructive">Error</p>
                  <p className="mt-1 font-mono text-xs">{detailRun.error_message}</p>
                </div>
              )}
              {detailRun.summary && (
                <div>
                  <p className="font-medium text-muted-foreground">Summary</p>
                  <p className="mt-1">{detailRun.summary}</p>
                </div>
              )}
              {detailRun.input_payload != null && Object.keys(detailRun.input_payload as object).length > 0 && (
                <div>
                  <p className="font-medium text-muted-foreground">Input</p>
                  <pre className="mt-1 max-h-40 overflow-auto rounded border bg-muted/30 p-2 font-mono text-xs">
                    {JSON.stringify(detailRun.input_payload, null, 2)}
                  </pre>
                </div>
              )}
              {detailRun.output_payload != null && Object.keys(detailRun.output_payload as object).length > 0 && (
                <div>
                  <p className="font-medium text-muted-foreground">Output</p>
                  <pre className="mt-1 max-h-40 overflow-auto rounded border bg-muted/30 p-2 font-mono text-xs">
                    {JSON.stringify(detailRun.output_payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
