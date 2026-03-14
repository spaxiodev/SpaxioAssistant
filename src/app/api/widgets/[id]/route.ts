import { createAdminClient } from '@/lib/supabase/admin';
import { getOrganizationId } from '@/lib/auth-server';
import { NextResponse } from 'next/server';

/**
 * PATCH /api/widgets/[id] – update widget (e.g. agent_id) for the current org.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrganizationId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { id: widgetId } = await params;
  if (!widgetId) return NextResponse.json({ error: 'Missing widget id' }, { status: 400 });

  const supabase = createAdminClient();
  const { data: widget } = await supabase
    .from('widgets')
    .select('id, organization_id')
    .eq('id', widgetId)
    .eq('organization_id', orgId)
    .single();

  if (!widget) return NextResponse.json({ error: 'Widget not found' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const agentId = body.agent_id === null || body.agent_id === undefined
    ? null
    : typeof body.agent_id === 'string' ? body.agent_id.trim() || null : null;

  if (agentId !== null) {
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('id', agentId)
      .eq('organization_id', orgId)
      .single();
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  const { error } = await supabase
    .from('widgets')
    .update({ agent_id: agentId })
    .eq('id', widgetId);

  if (error) {
    console.error('[API] widgets PATCH', error);
    return NextResponse.json({ error: 'Failed to update widget' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
