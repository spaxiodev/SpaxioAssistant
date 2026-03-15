/**
 * POST /api/inbox/conversations/[id]/tags - Add tag. Body: { tag: string }
 * DELETE /api/inbox/conversations/[id]/tags?tag=... - Remove tag
 */
import { getOrganizationId } from '@/lib/auth-server';
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
    const organizationId = await getOrganizationId();
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { id } = await context.params;
    const conversationId = normalizeUuid(id);
    if (!isUuid(conversationId)) return NextResponse.json({ error: 'Invalid conversation id' }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const tag = typeof body.tag === 'string' ? body.tag.trim().slice(0, 100) : '';
    if (!tag) return NextResponse.json({ error: 'Tag required' }, { status: 400 });

    const supabase = createAdminClient();
    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
    if (!(await canUseInbox(supabase, organizationId, adminAllowed))) {
      return NextResponse.json({ error: 'Inbox not enabled' }, { status: 403 });
    }
    if (!(await conversationBelongsToOrg(supabase, conversationId, organizationId))) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('conversation_tags')
      .insert({ conversation_id: conversationId, tag })
      .select('id, tag, created_at')
      .single();

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Tag already exists' }, { status: 409 });
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(data);
  } catch (err) {
    return handleApiError(err, 'inbox/conversations/[id]/tags POST');
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { id } = await context.params;
    const conversationId = normalizeUuid(id);
    if (!isUuid(conversationId)) return NextResponse.json({ error: 'Invalid conversation id' }, { status: 400 });

    const tag = new URL(request.url).searchParams.get('tag')?.trim().slice(0, 200);
    if (!tag) return NextResponse.json({ error: 'Query param tag required' }, { status: 400 });

    const supabase = createAdminClient();
    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
    if (!(await canUseInbox(supabase, organizationId, adminAllowed))) {
      return NextResponse.json({ error: 'Inbox not enabled' }, { status: 403 });
    }
    if (!(await conversationBelongsToOrg(supabase, conversationId, organizationId))) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('conversation_tags')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('tag', tag);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err, 'inbox/conversations/[id]/tags DELETE');
  }
}
