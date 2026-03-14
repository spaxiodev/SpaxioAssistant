/**
 * Cron: trigger schedule_triggered automations.
 * Call with CRON_SECRET in header or query. Runs schedule_triggered automations
 * when due (daily or weekly per trigger_config.frequency).
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { emitAutomationEvent } from '@/lib/automations/engine';

const CRON_SECRET = process.env.CRON_SECRET;

function isAuthorized(request: Request): boolean {
  if (!CRON_SECRET) return false;
  const header = request.headers.get('authorization');
  if (header === `Bearer ${CRON_SECRET}`) return true;
  const q = new URL(request.url).searchParams.get('secret');
  return q === CRON_SECRET;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: automations, error: fetchErr } = await supabase
    .from('automations')
    .select('id, organization_id, name, trigger_type, trigger_config')
    .eq('status', 'active')
    .eq('trigger_type', 'schedule_triggered');

  if (fetchErr) {
    console.error('[cron/automations-schedule] fetch', fetchErr);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }

  const list = automations ?? [];
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const weekStart = new Date(todayStart);
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());

  const runIds: string[] = [];
  const skipped: string[] = [];

  for (const a of list) {
    const config = (a.trigger_config as Record<string, unknown>) ?? {};
    const frequency = config.frequency === 'weekly' ? 'weekly' : 'daily';

    const { data: lastRuns } = await supabase
      .from('automation_runs')
      .select('started_at')
      .eq('automation_id', a.id)
      .eq('trigger_event_type', 'schedule_triggered')
      .order('started_at', { ascending: false })
      .limit(1);

    const lastRun = lastRuns?.[0];
    const lastStarted = lastRun?.started_at ? new Date(lastRun.started_at) : null;

    let shouldRun = false;
    if (frequency === 'daily') {
      shouldRun = !lastStarted || lastStarted < todayStart;
    } else {
      shouldRun = !lastStarted || lastStarted < weekStart;
    }

    if (!shouldRun) {
      skipped.push(a.id);
      continue;
    }

    const result = await emitAutomationEvent(supabase, {
      organization_id: a.organization_id,
      event_type: 'schedule_triggered',
      payload: {
        trigger_type: 'schedule_triggered',
        schedule_frequency: frequency,
        scheduled_at: now.toISOString(),
      },
      source: 'cron_schedule',
      trace_id: `schedule-${a.id}-${now.toISOString().slice(0, 19)}`,
    });
    runIds.push(...result.runIds);
  }

  return NextResponse.json({
    ok: true,
    triggered: list.length - skipped.length,
    skipped: skipped.length,
    run_ids: runIds,
  });
}
