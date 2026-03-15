/**
 * POST /api/inbox/conversations/[id]/escalate
 * Body: { reason?: string }
 */
import { getOrganizationId, getUser } from '@/lib/auth-server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-error';
import { isUuid, normalizeUuid } from '@/lib/validation';
import { canUseInbox } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { conversationBelongsToOrg, getOrganizationIdForConversation } from '@/lib/conversation-org';

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
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : 'Escalated from inbox';

    const supabase = createAdminClient();
    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
    if (!(await canUseInbox(supabase, organizationId, adminAllowed))) {
      return NextResponse.json({ error: 'Inbox not enabled' }, { status: 403 });
    }
    if (!(await conversationBelongsToOrg(supabase, conversationId, organizationId))) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const orgId = await getOrganizationIdForConversation(supabase, conversationId);
    if (!orgId) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    const { data: conv } = await supabase.from('conversations').select('metadata').eq('id', conversationId).single();
    const meta = (conv?.metadata as Record<string, unknown>) ?? {};
    await supabase
      .from('conversations')
      .update({
        metadata: {
          ...meta,
          handoff: true,
          handoff_reason: reason,
          handoff_at: new Date().toISOString(),
        },
      })
      .eq('id', conversationId);

    await supabase.from('escalation_events').insert({
      organization_id: orgId,
      conversation_id: conversationId,
      reason,
      escalated_by_type: 'user',
      escalated_by_user_id: user?.id ?? null,
      status: 'pending',
    });

    await supabase.from('conversation_events').insert({
      conversation_id: conversationId,
      event_type: 'escalated',
      metadata: { reason, user_id: user?.id ?? null },
      actor_id: user?.id ?? null,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err, 'inbox/conversations/[id]/escalate');
  }
}
