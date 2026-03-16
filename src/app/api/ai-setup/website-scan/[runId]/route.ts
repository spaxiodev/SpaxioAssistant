/**
 * GET /api/ai-setup/website-scan/[runId] – get setup run status (for polling progress).
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { getOrganizationId } from '@/lib/auth-server';
import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { isUuid, normalizeUuid } from '@/lib/validation';

type RouteContext = { params: Promise<{ runId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { runId } = await context.params;
    const id = normalizeUuid(runId);
    if (!isUuid(id)) {
      return NextResponse.json({ error: 'Invalid run id' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: run, error } = await supabase
      .from('ai_setup_runs')
      .select('id, status, step, website_url, result_json, error_message, created_at, updated_at')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error || !run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    return NextResponse.json({
      runId: run.id,
      status: run.status,
      step: run.step,
      websiteUrl: run.website_url,
      result: run.result_json,
      errorMessage: run.error_message,
      createdAt: run.created_at,
      updatedAt: run.updated_at,
    });
  } catch (err) {
    return handleApiError(err, 'ai-setup/website-scan/[runId]');
  }
}
