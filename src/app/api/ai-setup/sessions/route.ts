import { NextResponse } from 'next/server';
import { requireAiSetupAccess } from '@/app/api/ai-setup/guard';
import { rateLimit } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { getEntitlements } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';

/** GET /api/ai-setup/sessions – list sessions for the org + entitlements (e.g. custom_branding for logo upload) */
export async function GET() {
  try {
    const access = await requireAiSetupAccess();
    if ('response' in access) return access.response;
    const { orgId, supabase } = access;

    const [sessionsResult, adminAllowed] = await Promise.all([
      supabase
        .from('ai_setup_sessions')
        .select('id, status, planner_config, created_at, updated_at, published_at')
        .eq('organization_id', orgId)
        .order('updated_at', { ascending: false })
        .limit(50),
      isOrgAllowedByAdmin(supabase, orgId),
    ]);

    const { data, error } = sessionsResult;
    if (error) {
      console.error('[API] ai-setup sessions GET', error);
      return NextResponse.json({ error: 'Failed to list sessions' }, { status: 500 });
    }

    const { entitlements } = await getEntitlements(supabase, orgId);
    const customBranding = adminAllowed || entitlements.custom_branding;

    return NextResponse.json({
      sessions: data ?? [],
      entitlements: { custom_branding: customBranding },
    });
  } catch (err) {
    return handleApiError(err, 'ai-setup/sessions/GET');
  }
}

/** POST /api/ai-setup/sessions – create a new session */
export async function POST() {
  try {
    const access = await requireAiSetupAccess();
    if ('response' in access) return access.response;
    const { orgId, supabase } = access;

    const rl = rateLimit({ key: `ai-setup-create:${orgId}`, limit: 10, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many sessions created', code: 'rate_limit' }, { status: 429 });
    }

    const { data, error } = await supabase
      .from('ai_setup_sessions')
      .insert({
        organization_id: orgId,
        status: 'draft',
        planner_config: {},
      })
      .select('id, status, planner_config, created_at, updated_at')
      .single();

    if (error) {
      console.error('[API] ai-setup sessions POST', error);
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err) {
    return handleApiError(err, 'ai-setup/sessions/POST');
  }
}
