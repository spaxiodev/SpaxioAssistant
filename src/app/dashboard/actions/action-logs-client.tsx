'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

type Invocation = {
  id: string;
  action_key: string;
  status: string;
  initiated_by_type: string;
  started_at: string;
  completed_at: string | null;
  error_text: string | null;
  input_json?: unknown;
  output_json?: unknown;
};

type Agent = { id: string; name: string };

export function ActionLogsClient({
  initialInvocations,
  agents,
}: {
  initialInvocations: Invocation[];
  agents: Agent[];
}) {
  const t = useTranslations('dashboard');
  const [invocations, setInvocations] = useState(initialInvocations);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<(Invocation & { input_json?: unknown; output_json?: unknown }) | null>(null);

  const actionKeys = [...new Set(invocations.map((i) => i.action_key))].sort();

  const filtered = invocations.filter((inv) => {
    if (filterStatus !== 'all' && inv.status !== filterStatus) return false;
    if (filterAction !== 'all' && inv.action_key !== filterAction) return false;
    return true;
  });

  async function refetch() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (filterAction !== 'all') params.set('actionKey', filterAction);
      const res = await fetch(`/api/actions/logs?${params}`);
      const data = await res.json();
      if (data.invocations) setInvocations(data.invocations);
    } finally {
      setLoading(false);
    }
  }

  function loadDetail(id: string) {
    setSelectedId(id);
    const inv = invocations.find((i) => i.id === id) as (Invocation & { input_json?: unknown; output_json?: unknown }) | undefined;
    setDetail(inv ?? null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-9 w-[130px] rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="h-9 w-[180px] rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          <option value="all">All actions</option>
          {actionKeys.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
        <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {t('noActionLogs')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map((inv) => (
            <Card
              key={inv.id}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => loadDetail(inv.id)}
            >
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-medium">{inv.action_key}</span>
                  <Badge variant={inv.status === 'success' ? 'default' : inv.status === 'failed' ? 'destructive' : 'secondary'}>
                    {inv.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{inv.initiated_by_type}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(inv.started_at).toLocaleString()}
                  {inv.error_text && (
                    <span className="ml-2 text-destructive" title={inv.error_text}>
                      — {inv.error_text.slice(0, 40)}…
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {detail && selectedId === detail.id && (
        <Card className="mt-4 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Invocation details</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
              Close
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">ID:</span> {detail.id}</p>
            <p><span className="text-muted-foreground">Action:</span> {detail.action_key}</p>
            <p><span className="text-muted-foreground">Status:</span> {detail.status}</p>
            <p><span className="text-muted-foreground">Started:</span> {new Date(detail.started_at).toISOString()}</p>
            {detail.completed_at && (
              <p><span className="text-muted-foreground">Completed:</span> {new Date(detail.completed_at).toISOString()}</p>
            )}
            {detail.error_text && (
              <p className="text-destructive"><span className="text-muted-foreground">Error:</span> {detail.error_text}</p>
            )}
            {detail.input_json != null && (
              <pre className="mt-2 max-h-32 overflow-auto rounded bg-muted p-2 text-xs">
                {JSON.stringify(detail.input_json, null, 2)}
              </pre>
            )}
            {detail.output_json != null && (
              <pre className="mt-2 max-h-32 overflow-auto rounded bg-muted p-2 text-xs">
                {JSON.stringify(detail.output_json, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
