/**
 * POST /api/inbox/conversations/[id]/reply
 * Reply as human. Body: { content: string }
 * Inserts message (role: assistant) and conversation_event (human_replied).
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
    if (!organizationId || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { id } = await context.params;
    const conversationId = normalizeUuid(id);
    if (!isUuid(conversationId)) return NextResponse.json({ error: 'Invalid conversation id' }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const content = typeof body.content === 'string' ? body.content.trim().slice(0, 8000) : '';
    if (!content) return NextResponse.json({ error: 'Content required' }, { status: 400 });

    const supabase = createAdminClient();
    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
    if (!(await canUseInbox(supabase, organizationId, adminAllowed))) {
      return NextResponse.json({ error: 'Inbox not enabled' }, { status: 403 });
    }
    if (!(await conversationBelongsToOrg(supabase, conversationId, organizationId))) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content,
      })
      .select('id, role, content, created_at')
      .single();

    if (msgError) return NextResponse.json({ error: msgError.message }, { status: 400 });

    await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);

    await supabase.from('conversation_events').insert({
      conversation_id: conversationId,
      event_type: 'human_replied',
      metadata: { message_id: message?.id ?? null },
      actor_id: user.id,
    });

    return NextResponse.json({ success: true, message });
  } catch (err) {
    return handleApiError(err, 'inbox/conversations/[id]/reply');
  }
}
