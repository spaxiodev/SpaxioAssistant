/**
 * GET /api/automations/analytics – summary metrics for automations (runs, success/fail, by automation).
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { getOrganizationIdOrFromApiKey } from '@/lib/api-key-auth';
import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: Request) {
  try {
    const organizationId = await getOrganizationIdOrFromApiKey(request);
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized', code: 'auth_required' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d';
    const days = period === '24h' ? 1 : period === '7d' ? 7 : 30;

    const supabase = createAdminClient();
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceIso = since.toISOString();

    const { data: automations, error: authError } = await supabase
      .from('automations')
      .select('id, name')
      .eq('organization_id', organizationId);

    if (authError) {
      console.error('[API] automations/analytics auth', authError);
      return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
    }

    const automationIds = (automations ?? []).map((a) => a.id);
    if (automationIds.length === 0) {
      return NextResponse.json({
        total_runs: 0,
        success_count: 0,
        failed_count: 0,
        runs_last_24h: 0,
        by_automation: [],
      });
    }

    const { data: runs, error: runsError } = await supabase
      .from('automation_runs')
      .select('id, automation_id, status, started_at')
      .in('automation_id', automationIds)
      .gte('started_at', sinceIso);

    if (runsError) {
      console.error('[API] automations/analytics runs', runsError);
      return NextResponse.json({ error: 'Failed to load runs' }, { status: 500 });
    }

    const list = runs ?? [];
    const successCount = list.filter((r) => r.status === 'success').length;
    const failedCount = list.filter((r) => r.status === 'failed').length;
    const dayAgo = new Date();
    dayAgo.setDate(dayAgo.getDate() - 1);
    const runsLast24h = list.filter((r) => new Date(r.started_at) >= dayAgo).length;

    const byAutomationId = new Map<string, { runs: number; success: number; failed: number }>();
    for (const aid of automationIds) {
      byAutomationId.set(aid, { runs: 0, success: 0, failed: 0 });
    }
    for (const r of list) {
      const entry = byAutomationId.get(r.automation_id);
      if (entry) {
        entry.runs += 1;
        if (r.status === 'success') entry.success += 1;
        if (r.status === 'failed') entry.failed += 1;
      }
    }

    const nameById = new Map((automations ?? []).map((a) => [a.id, a.name]));
    const by_automation = automationIds.map((id) => ({
      automation_id: id,
      automation_name: nameById.get(id) ?? null,
      ...byAutomationId.get(id)!,
    }));

    return NextResponse.json({
      total_runs: list.length,
      success_count: successCount,
      failed_count: failedCount,
      runs_last_24h: runsLast24h,
      by_automation: by_automation.sort((a, b) => b.runs - a.runs),
    });
  } catch (err) {
    return handleApiError(err, 'automations/analytics/GET');
  }
}
