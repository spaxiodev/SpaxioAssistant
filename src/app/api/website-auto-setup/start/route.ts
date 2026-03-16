/**
 * POST /api/website-auto-setup/start
 * Start a website auto-setup run. Body: { website_url: string, business_type?: string, business_description?: string }
 * Run executes async; client should poll GET /api/website-auto-setup/status/[runId].
 */

import { NextResponse } from 'next/server';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-error';
import { isValidSetupUrl } from '@/lib/website-auto-setup/fetch-and-extract';
import { executeWebsiteAutoSetupRun } from '@/lib/website-auto-setup/run-pipeline';
import { hasActiveSubscription } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const rl = rateLimit({ key: `website-auto-setup:${organizationId}`, limit: 5, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many setup attempts. Try again in a minute.' }, { status: 429 });
    }

    const supabase = createAdminClient();
    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
    const allowed = await hasActiveSubscription(supabase, organizationId, adminAllowed);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Active subscription required for website auto-setup.' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const websiteUrl = typeof body.website_url === 'string' ? body.website_url.trim() : '';
    const businessType = typeof body.business_type === 'string' ? body.business_type.slice(0, 200) : null;
    const businessDescription = typeof body.business_description === 'string' ? body.business_description.slice(0, 1000) : null;

    if (!websiteUrl || !isValidSetupUrl(websiteUrl)) {
      return NextResponse.json(
        { error: 'Valid website URL is required (https or http, non-local in production).' },
        { status: 400 }
      );
    }

    const { data: run, error: insertError } = await supabase
      .from('website_auto_setup_runs')
      .insert({
        organization_id: organizationId,
        status: 'pending',
        website_url: websiteUrl,
        business_type: businessType,
        business_description: businessDescription,
      })
      .select('id, status, website_url, started_at')
      .single();

    if (insertError || !run) {
      return NextResponse.json({ error: 'Failed to create setup run' }, { status: 500 });
    }

    // Run pipeline in background (do not await)
    executeWebsiteAutoSetupRun(run.id).catch((err) => {
      console.error('[website-auto-setup] run failed', run.id, err);
    });

    return NextResponse.json({
      run_id: run.id,
      status: run.status,
      website_url: run.website_url,
      started_at: run.started_at,
      message: 'Setup started. Poll /api/website-auto-setup/status/[runId] for progress.',
    });
  } catch (err) {
    return handleApiError(err, 'website-auto-setup/start');
  }
}
