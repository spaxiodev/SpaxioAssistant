import { getOrganizationId, getUser } from '@/lib/auth-server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-error';
import { isUuid, normalizeUuid } from '@/lib/validation';
import { executeAction } from '@/lib/actions/executor';
import { recordAiActionUsage } from '@/lib/billing/usage';
import { canUseAiActions, hasExceededMonthlyAiActions } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';

/**
 * POST /api/actions/execute
 * Body: { actionKey: string, input: Record<string, unknown>, conversationId?: string, agentId?: string }
 * Execute an action (dashboard or API). Logs to action_invocations.
 */
export async function POST(request: Request) {
  try {
    const user = await getUser();
    const organizationId = await getOrganizationId(user ?? undefined);
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const actionKey = typeof body.actionKey === 'string' ? body.actionKey.trim() : '';
    const input = body.input != null && typeof body.input === 'object' ? body.input : {};
    const conversationId = body.conversationId != null ? normalizeUuid(String(body.conversationId)) : null;
    const agentId = body.agentId != null ? normalizeUuid(String(body.agentId)) : null;

    if (!actionKey) return NextResponse.json({ error: 'Missing actionKey' }, { status: 400 });

    const supabase = createAdminClient();
    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
    if (!(await canUseAiActions(supabase, organizationId, adminAllowed))) {
      return NextResponse.json({ error: 'AI actions not enabled for your plan' }, { status: 403 });
    }
    if (await hasExceededMonthlyAiActions(supabase, organizationId, adminAllowed)) {
      return NextResponse.json({ error: 'Monthly AI action limit reached' }, { status: 403 });
    }

    if (agentId && isUuid(agentId)) {
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('id', agentId)
        .eq('organization_id', organizationId)
        .single();
      if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const result = await executeAction(supabase, {
      actionKey,
      input,
      organizationId,
      conversationId: conversationId && isUuid(conversationId) ? conversationId : null,
      agentId: agentId && isUuid(agentId) ? agentId : null,
      messageId: null,
      initiatedByType: 'human',
      initiatedByUserId: user?.id ?? null,
      adminAllowed,
    });

    if (result.success) {
      await recordAiActionUsage(supabase, organizationId);
      return NextResponse.json({
        success: true,
        invocationId: result.invocationId,
        output: result.output,
      });
    }
    return NextResponse.json(
      { success: false, error: result.error, invocationId: result.invocationId },
      { status: 400 }
    );
  } catch (err) {
    console.error('[API] actions/execute', err);
    return handleApiError(err, 'actions/execute');
  }
}
