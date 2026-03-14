import { createAdminClient } from '@/lib/supabase/admin';
import { getOrganizationId } from '@/lib/auth-server';
import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { isUuid, normalizeUuid } from '@/lib/validation';

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/automations/:id/toggle – switch between active and paused */
export async function POST(_request: Request, context: RouteContext) {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { id } = await context.params;
    const automationId = normalizeUuid(id);
    if (!isUuid(automationId))
      return NextResponse.json({ error: 'Invalid automation id' }, { status: 400 });

    const supabase = createAdminClient();
    const { data: existing, error: fetchError } = await supabase
      .from('automations')
      .select('id, status')
      .eq('id', automationId)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }

    const newStatus = existing.status === 'active' ? 'paused' : 'active';
    const { data, error } = await supabase
      .from('automations')
      .update({ status: newStatus })
      .eq('id', automationId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      console.error('[API] automations toggle', error);
      return NextResponse.json({ error: 'Failed to toggle automation' }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err) {
    return handleApiError(err, 'automations/POST/:id/toggle');
  }
}
