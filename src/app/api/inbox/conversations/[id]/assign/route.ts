/**
 * POST /api/inbox/conversations/[id]/assign
 * Body: { assigneeId: string }
 */
import { getOrganizationId, getUser } from '@/lib/auth-server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-error';
import { isUuid, normalizeUuid } from '@/lib/validation';
import { canUseInbox } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { conversationBelongsToOrg } from '@/lib/conversation-org';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await getUser();
    const organizationId = await getOrganizationId(user ?? undefined);
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { id } = await context.params;
    const conversationId = normalizeUuid(id);
    if (!isUuid(conversationId)) return NextResponse.json({ error: 'Invalid conversation id' }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const assigneeId = typeof body.assigneeId === 'string' ? normalizeUuid(body.assigneeId) : '';
    if (!isUuid(assigneeId)) return NextResponse.json({ error: 'Valid assigneeId required' }, { status: 400 });

    const supabase = createAdminClient();
    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
    if (!(await canUseInbox(supabase, organizationId, adminAllowed))) {
      return NextResponse.json({ error: 'Inbox not enabled' }, { status: 403 });
    }
    if (!(await conversationBelongsToOrg(supabase, conversationId, organizationId))) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const { error: assignError } = await supabase.from('conversation_assignments').insert({
      conversation_id: conversationId,
      assignee_id: assigneeId,
      assigned_by_id: user?.id ?? null,
    });
    if (assignError) return NextResponse.json({ error: assignError.message }, { status: 400 });

    await supabase.from('conversation_events').insert({
      conversation_id: conversationId,
      event_type: 'assigned',
      metadata: { assignee_id: assigneeId, assigned_by: user?.id ?? null },
      actor_id: user?.id ?? null,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err, 'inbox/conversations/[id]/assign');
  }
}
