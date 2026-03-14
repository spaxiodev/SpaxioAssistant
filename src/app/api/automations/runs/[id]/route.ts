/**
 * GET /api/automations/runs/:id – single run detail for observability.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { getOrganizationIdOrFromApiKey } from '@/lib/api-key-auth';
import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { isUuid, normalizeUuid } from '@/lib/validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const organizationId = await getOrganizationIdOrFromApiKey(request);
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized', code: 'auth_required' }, { status: 403 });

    const { id } = await context.params;
    const runId = normalizeUuid(id);
    if (!isUuid(runId)) {
      return NextResponse.json({ error: 'Invalid run id' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: run, error: runError } = await supabase
      .from('automation_runs')
      .select('id, automation_id, status, input_payload, output_payload, error_message, started_at, completed_at, trigger_event_type, duration_ms, summary, trace_id, correlation_id')
      .eq('id', runId)
      .single();

    if (runError || !run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    const { data: automation } = await supabase
      .from('automations')
      .select('id, name, organization_id')
      .eq('id', run.automation_id)
      .single();

    if (!automation || automation.organization_id !== organizationId) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...run,
      automation_name: automation.name,
    });
  } catch (err) {
    return handleApiError(err, 'automations/runs/GET/:id');
  }
}
