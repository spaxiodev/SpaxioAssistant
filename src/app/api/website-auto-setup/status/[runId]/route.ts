/**
 * GET /api/website-auto-setup/status/[runId]
 * Returns current run status, current_step, result_summary (when done), error_message (when failed).
 */

import { NextResponse } from 'next/server';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-error';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { runId } = await params;
    if (!runId) {
      return NextResponse.json({ error: 'runId required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: run, error } = await supabase
      .from('website_auto_setup_runs')
      .select('id, organization_id, status, current_step, result_summary, error_message, website_url, started_at, completed_at')
      .eq('id', runId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    return NextResponse.json({
      run_id: run.id,
      status: run.status,
      current_step: run.current_step ?? undefined,
      result_summary: run.result_summary ?? undefined,
      error_message: run.error_message ?? undefined,
      website_url: run.website_url,
      started_at: run.started_at,
      completed_at: run.completed_at ?? undefined,
    });
  } catch (err) {
    return handleApiError(err, 'website-auto-setup/status');
  }
}
