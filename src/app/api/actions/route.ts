import { getOrganizationId } from '@/lib/auth-server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-error';
import { canUseAiActions } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { getAllActions } from '@/lib/actions/registry';

/**
 * GET /api/actions
 * List available AI actions for the org (for dashboard and agent config).
 */
export async function GET() {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const supabase = createAdminClient();
    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
    const actionsEnabled = await canUseAiActions(supabase, organizationId, adminAllowed);

    const actions = getAllActions().map((a) => ({
      key: a.key,
      name: a.name,
      description: a.description,
      policy: a.policy,
    }));

    return NextResponse.json({
      actions,
      actionsEnabled,
    });
  } catch (err) {
    return handleApiError(err, 'actions/GET');
  }
}
