import { createAdminClient } from '@/lib/supabase/admin';
import { getOrganizationIdOrFromApiKey } from '@/lib/api-key-auth';
import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';

/** GET /api/automations/runs – list recent runs with optional filters (status, automation_id, trigger_event_type) */
export async function GET(request: Request) {
  try {
    const organizationId = await getOrganizationIdOrFromApiKey(request);
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized', code: 'auth_required' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '20', 10), 1), 100);
    const automationId = searchParams.get('automation_id')?.trim() || null;
    const status = searchParams.get('status')?.trim() || null;
    const triggerEventType = searchParams.get('trigger_event_type')?.trim() || null;

    const supabase = createAdminClient();

    const { data: automations, error: authError } = await supabase
      .from('automations')
      .select('id')
      .eq('organization_id', organizationId);

    if (authError) {
      console.error('[API] automations/runs GET auth', authError);
      return NextResponse.json({ error: 'Failed to list runs' }, { status: 500 });
    }

    const automationIds = (automations ?? []).map((a) => a.id);
    if (automationIds.length === 0) {
      return NextResponse.json({ runs: [] });
    }

    let query = supabase
      .from('automation_runs')
      .select('id, automation_id, status, input_payload, output_payload, error_message, started_at, completed_at, trigger_event_type, duration_ms, summary, trace_id')
      .in('automation_id', automationIds)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (automationId) query = query.eq('automation_id', automationId);
    if (status) query = query.eq('status', status);
    if (triggerEventType) query = query.eq('trigger_event_type', triggerEventType);

    const { data: runs, error } = await query;

    if (error) {
      console.error('[API] automations/runs GET', error);
      return NextResponse.json({ error: 'Failed to list runs' }, { status: 500 });
    }

    const list = runs ?? [];
    const runAutomationIds = [...new Set(list.map((r) => r.automation_id))];
    const { data: automationsList } = await supabase
      .from('automations')
      .select('id, name')
      .in('id', runAutomationIds);
    const nameById = new Map((automationsList ?? []).map((a) => [a.id, a.name]));

    const runsWithNames = list.map((r) => ({
      ...r,
      automation_name: nameById.get(r.automation_id) ?? null,
    }));

    return NextResponse.json({ runs: runsWithNames });
  } catch (err) {
    return handleApiError(err, 'automations/runs/GET');
  }
}
