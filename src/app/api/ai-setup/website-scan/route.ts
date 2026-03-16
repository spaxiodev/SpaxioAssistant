/**
 * POST /api/ai-setup/website-scan – start AI website scanner run.
 * Body: { websiteUrl: string, businessType?: string, description?: string }
 * Creates a run and executes the pipeline (sync). Client can poll GET .../website-scan/[runId] for progress.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { getOrganizationId } from '@/lib/auth-server';
import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { runWebsiteScanPipeline } from '@/lib/ai-setup/website-scanner-service';

function isValidUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  const s = urlStr.trim();
  if (s.length > 2000) return false;
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const websiteUrl = typeof body.websiteUrl === 'string' ? body.websiteUrl.trim() : '';
    const businessType = typeof body.businessType === 'string' ? body.businessType.slice(0, 200) : null;
    const description = typeof body.description === 'string' ? body.description.slice(0, 1000) : null;

    if (!websiteUrl || !isValidUrl(websiteUrl)) {
      return NextResponse.json(
        { error: 'Valid website URL is required (https:// or http://).' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data: run, error: insertError } = await supabase
      .from('ai_setup_runs')
      .insert({
        organization_id: organizationId,
        status: 'running',
        step: 'scanning_website',
        website_url: websiteUrl,
        business_type: businessType,
        description,
      })
      .select('id')
      .single();

    if (insertError || !run) {
      return NextResponse.json({ error: 'Failed to start setup run' }, { status: 500 });
    }

    // Run pipeline; progress is written to DB so client can poll GET run while waiting.
    let finalStatus: 'completed' | 'failed' = 'completed';
    let resultJson: Record<string, unknown> | null = null;
    try {
      const result = await runWebsiteScanPipeline(supabase, {
        runId: run.id,
        organizationId,
        websiteUrl,
        businessType,
        description,
        onStep: async (step) => {
          await supabase
            .from('ai_setup_runs')
            .update({ step, updated_at: new Date().toISOString() })
            .eq('id', run.id)
            .eq('organization_id', organizationId);
        },
      });
      resultJson = result as unknown as Record<string, unknown>;
    } catch (err) {
      finalStatus = 'failed';
      console.error('[ai-setup/website-scan] Pipeline failed', err);
    }

    const { data: updated } = await supabase
      .from('ai_setup_runs')
      .select('status, result_json, error_message')
      .eq('id', run.id)
      .eq('organization_id', organizationId)
      .single();

    return NextResponse.json({
      runId: run.id,
      status: updated?.status ?? finalStatus,
      result: updated?.result_json ?? resultJson,
      errorMessage: updated?.error_message ?? null,
    });
  } catch (err) {
    return handleApiError(err, 'ai-setup/website-scan');
  }
}
