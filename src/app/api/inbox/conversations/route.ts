/**
 * GET /api/inbox/conversations
 * List conversations for the org with filters. Reuses conversations + widgets (org-scoped).
 * Query: status, assigneeId, tag, channelType, limit, offset
 */
import { getOrganizationId } from '@/lib/auth-server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-error';
import { canUseInbox } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';

export async function GET(request: Request) {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const supabase = createAdminClient();
    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
    if (!(await canUseInbox(supabase, organizationId, adminAllowed))) {
      return NextResponse.json({ error: 'Inbox not enabled for your plan' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status')?.trim() || undefined;
    const assigneeId = searchParams.get('assigneeId')?.trim() || undefined;
    const tag = searchParams.get('tag')?.trim() || undefined;
    const channelType = searchParams.get('channelType')?.trim() || undefined;
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 50, 1), 100);
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0);

    const { data: widgets } = await supabase
      .from('widgets')
      .select('id, agent_id')
      .eq('organization_id', organizationId);
    const widgetIds = (widgets ?? []).map((w) => w.id);
    if (widgetIds.length === 0) {
      return NextResponse.json({ conversations: [], total: 0 });
    }

    let convQuery = supabase
      .from('conversations')
      .select('id, widget_id, visitor_id, channel_type, status, priority, lead_id, contact_id, created_at, updated_at, metadata', { count: 'exact' })
      .in('widget_id', widgetIds)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) convQuery = convQuery.eq('status', status);
    if (channelType) convQuery = convQuery.eq('channel_type', channelType);

    const { data: conversations, error: convError, count } = await convQuery;
    if (convError) return NextResponse.json({ error: convError.message }, { status: 500 });

    let list = (conversations ?? []) as Array<{
      id: string;
      widget_id: string;
      visitor_id: string | null;
      channel_type: string;
      status: string;
      priority: string;
      lead_id: string | null;
      contact_id: string | null;
      created_at: string;
      updated_at: string;
      metadata: Record<string, unknown>;
    }>;

    if (assigneeId || tag) {
      if (assigneeId) {
        const { data: assignments } = await supabase
          .from('conversation_assignments')
          .select('conversation_id')
          .eq('assignee_id', assigneeId);
        const assignedConvIds = new Set((assignments ?? []).map((a) => a.conversation_id));
        list = list.filter((c) => assignedConvIds.has(c.id));
      }
      if (tag) {
        const { data: tagRows } = await supabase
          .from('conversation_tags')
          .select('conversation_id')
          .eq('tag', tag);
        const taggedConvIds = new Set((tagRows ?? []).map((t) => t.conversation_id));
        list = list.filter((c) => taggedConvIds.has(c.id));
      }
    }

    const convIds = list.map((c) => c.id);
    const [assignmentsRes, tagsRes, escalationRes] = await Promise.all([
      convIds.length > 0
        ? supabase
            .from('conversation_assignments')
            .select('conversation_id, assignee_id, assigned_at')
            .in('conversation_id', convIds)
            .order('assigned_at', { ascending: false })
        : { data: [] },
      convIds.length > 0
        ? supabase.from('conversation_tags').select('conversation_id, tag').in('conversation_id', convIds)
        : { data: [] },
      convIds.length > 0
        ? supabase
            .from('escalation_events')
            .select('conversation_id, status')
            .in('conversation_id', convIds)
            .eq('status', 'pending')
        : { data: [] },
    ]);

    const latestAssignmentByConv = new Map<string, { assignee_id: string; assigned_at: string }>();
    (assignmentsRes.data ?? []).forEach((a: { conversation_id: string; assignee_id: string; assigned_at: string }) => {
      if (!latestAssignmentByConv.has(a.conversation_id)) latestAssignmentByConv.set(a.conversation_id, { assignee_id: a.assignee_id, assigned_at: a.assigned_at });
    });
    const tagsByConv = new Map<string, string[]>();
    (tagsRes.data ?? []).forEach((t: { conversation_id: string; tag: string }) => {
      const arr = tagsByConv.get(t.conversation_id) ?? [];
      arr.push(t.tag);
      tagsByConv.set(t.conversation_id, arr);
    });
    const escalatedConvIds = new Set((escalationRes.data ?? []).map((e: { conversation_id: string }) => e.conversation_id));

    const widgetById = new Map((widgets ?? []).map((w) => [w.id, w]));
    const enriched = list.map((c) => {
      const widget = widgetById.get(c.widget_id);
      return {
        ...c,
        agent_id: (widget as { agent_id?: string } | undefined)?.agent_id ?? null,
        assignee_id: latestAssignmentByConv.get(c.id)?.assignee_id ?? null,
        assigned_at: latestAssignmentByConv.get(c.id)?.assigned_at ?? null,
        tags: tagsByConv.get(c.id) ?? [],
        escalated: escalatedConvIds.has(c.id),
      };
    });

    return NextResponse.json({ conversations: enriched, total: count ?? list.length });
  } catch (err) {
    return handleApiError(err, 'inbox/conversations');
  }
}
