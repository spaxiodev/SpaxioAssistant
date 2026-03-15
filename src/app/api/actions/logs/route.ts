import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { requireOrg } from '@/lib/api-org-auth';
import { canUseAiActions } from '@/lib/entitlements';

/**
 * GET /api/actions/logs
 * Query params: limit, offset, actionKey, agentId, status, from, to
 * List action_invocations for the org. Requires AI Actions entitlement.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireOrg();
    if (!auth.ok) return auth.response;
    const { organizationId, supabase, adminAllowed } = auth;

    if (!(await canUseAiActions(supabase, organizationId, adminAllowed))) {
      return NextResponse.json({ error: 'AI Actions not enabled for your plan' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 50, 1), 100);
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0);
    const actionKey = searchParams.get('actionKey')?.trim() || undefined;
    const agentId = searchParams.get('agentId')?.trim() || undefined;
    const status = searchParams.get('status')?.trim() || undefined;
    const from = searchParams.get('from')?.trim() || undefined;
    const to = searchParams.get('to')?.trim() || undefined;

    let q = supabase
      .from('action_invocations')
      .select('id, organization_id, agent_id, conversation_id, action_key, status, initiated_by_type, started_at, completed_at, error_text', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (actionKey) q = q.eq('action_key', actionKey);
    if (agentId) q = q.eq('agent_id', agentId);
    if (status) q = q.eq('status', status);
    if (from) q = q.gte('started_at', from);
    if (to) q = q.lte('started_at', to);

    const { data, error, count } = await q;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ invocations: data ?? [], total: count ?? 0 });
  } catch (err) {
    return handleApiError(err, 'actions/logs');
  }
}
