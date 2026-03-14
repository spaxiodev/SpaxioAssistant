'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, CheckCircle, XCircle, Activity } from 'lucide-react';

type Analytics = {
  total_runs: number;
  success_count: number;
  failed_count: number;
  runs_last_24h: number;
  by_automation: Array<{
    automation_id: string;
    automation_name: string | null;
    runs: number;
    success: number;
    failed: number;
  }>;
};

export function AutomationsAnalyticsCard() {
  const t = useTranslations('dashboard');
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/automations/analytics?period=7d')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json) setData(json);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5" />
            {t('analytics')}
          </CardTitle>
          <CardDescription>Automation run metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-20 items-center justify-center text-sm text-muted-foreground">
            Loading…
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const topAutomations = data.by_automation.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5" />
          {t('analytics')}
        </CardTitle>
        <CardDescription>Last 7 days</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
            <p className="text-2xl font-semibold">{data.total_runs}</p>
            <p className="text-xs text-muted-foreground">Total runs</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 p-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-2xl font-semibold">{data.success_count}</p>
              <p className="text-xs text-muted-foreground">Success</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 p-3">
            <XCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-2xl font-semibold">{data.failed_count}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 p-3">
            <Activity className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-semibold">{data.runs_last_24h}</p>
              <p className="text-xs text-muted-foreground">Last 24h</p>
            </div>
          </div>
        </div>
        {topAutomations.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">Top automations</p>
            <ul className="space-y-1.5">
              {topAutomations.map((a) => (
                <li
                  key={a.automation_id}
                  className="flex items-center justify-between rounded border border-border/50 px-3 py-2 text-sm"
                >
                  <span className="truncate font-medium">{a.automation_name ?? 'Unnamed'}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {a.runs} runs · {a.success} ok
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
