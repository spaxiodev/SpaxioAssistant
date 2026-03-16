/**
 * GET /api/website-auto-setup/latest
 * Returns the most recent website auto-setup run for the current org (for overview progress).
 */

import { NextResponse } from 'next/server';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-error';

export async function GET() {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { data: run, error } = await supabase
      .from('website_auto_setup_runs')
      .select('id, status, current_step, result_summary, error_message, website_url, started_at, completed_at')
      .eq('organization_id', organizationId)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch run' }, { status: 500 });
    }
    if (!run) {
      return NextResponse.json({ run_id: null, status: null });
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
    return handleApiError(err, 'website-auto-setup/latest');
  }
}
