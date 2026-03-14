import { createAdminClient } from '@/lib/supabase/admin';
import { getOrganizationId } from '@/lib/auth-server';
import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { isUuid, normalizeUuid } from '@/lib/validation';
import { canUseAutomation } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { runAutomation } from '@/lib/automations/runner';

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/automations/:id/test – run automation once with manual_test payload */
export async function POST(request: Request, context: RouteContext) {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { id } = await context.params;
    const automationId = normalizeUuid(id);
    if (!isUuid(automationId))
      return NextResponse.json({ error: 'Invalid automation id' }, { status: 400 });

    const supabase = createAdminClient();
    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
    const allowed = await canUseAutomation(supabase, organizationId, adminAllowed);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Automations not available on your plan', code: 'plan_limit' },
        { status: 403 }
      );
    }

    const { data: automation, error: fetchError } = await supabase
      .from('automations')
      .select('id, organization_id, name, trigger_type, trigger_config, action_type, action_config, agent_id')
      .eq('id', automationId)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError || !automation) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const input = {
      trigger_type: 'manual_test',
      ...(body && typeof body === 'object' ? body : {}),
    };

    const result = await runAutomation({
      automation,
      input,
      supabase,
    });

    return NextResponse.json({
      run_id: result.runId,
      status: result.status,
      output: result.output,
    });
  } catch (err) {
    return handleApiError(err, 'automations/POST/:id/test');
  }
}
