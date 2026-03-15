/**
 * GET /api/inbox/conversations/[id] - Full detail: conversation, messages, notes, tags, assignments, timeline, CRM links.
 * PATCH /api/inbox/conversations/[id] - Update status, priority, lead_id, contact_id.
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

export async function GET(_request: Request, context: RouteContext) {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { id } = await context.params;
    const conversationId = normalizeUuid(id);
    if (!isUuid(conversationId)) return NextResponse.json({ error: 'Invalid conversation id' }, { status: 400 });

    const supabase = createAdminClient();
    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
    if (!(await canUseInbox(supabase, organizationId, adminAllowed))) {
      return NextResponse.json({ error: 'Inbox not enabled for your plan' }, { status: 403 });
    }
    if (!(await conversationBelongsToOrg(supabase, conversationId, organizationId))) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const [convRes, messagesRes, notesRes, tagsRes, assignmentsRes, eventsRes] = await Promise.all([
      supabase.from('conversations').select('*').eq('id', conversationId).single(),
      supabase.from('messages').select('id, role, content, created_at').eq('conversation_id', conversationId).order('created_at', { ascending: true }),
      supabase.from('conversation_notes').select('id, author_id, content, created_at').eq('conversation_id', conversationId).order('created_at', { ascending: false }),
      supabase.from('conversation_tags').select('id, tag, created_at').eq('conversation_id', conversationId),
      supabase.from('conversation_assignments').select('id, assignee_id, assigned_by_id, assigned_at').eq('conversation_id', conversationId).order('assigned_at', { ascending: false }),
      supabase.from('conversation_events').select('id, event_type, metadata, actor_id, created_at').eq('conversation_id', conversationId).order('created_at', { ascending: false }),
    ]);

    if (convRes.error || !convRes.data) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const conversation = convRes.data as Record<string, unknown>;
    const widgetId = conversation.widget_id as string;
    const { data: widget } = await supabase.from('widgets').select('agent_id').eq('id', widgetId).single();
    (conversation as Record<string, unknown>).agent_id = (widget as { agent_id?: string } | null)?.agent_id ?? null;

    let lead = null;
    let contact = null;
    const leadId = conversation.lead_id as string | null;
    const contactId = conversation.contact_id as string | null;
    if (leadId) {
      const { data: l } = await supabase.from('leads').select('*').eq('id', leadId).single();
      lead = l;
    }
    if (contactId) {
      const { data: c } = await supabase.from('contacts').select('*').eq('id', contactId).single();
      contact = c;
    }

    const deals = contactId
      ? await supabase.from('deals').select('id, title, stage, value_cents, created_at').eq('contact_id', contactId).order('created_at', { ascending: false }).limit(10)
      : { data: [] };
    const tickets = await supabase
      .from('support_tickets')
      .select('id, title, status, priority, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      conversation,
      messages: messagesRes.data ?? [],
      notes: notesRes.data ?? [],
      tags: tagsRes.data ?? [],
      assignments: assignmentsRes.data ?? [],
      events: eventsRes.data ?? [],
      lead,
      contact,
      deals: deals.data ?? [],
      tickets: tickets.data ?? [],
    });
  } catch (err) {
    return handleApiError(err, 'inbox/conversations/[id]');
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { id } = await context.params;
    const conversationId = normalizeUuid(id);
    if (!isUuid(conversationId)) return NextResponse.json({ error: 'Invalid conversation id' }, { status: 400 });

    const supabase = createAdminClient();
    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
    if (!(await canUseInbox(supabase, organizationId, adminAllowed))) {
      return NextResponse.json({ error: 'Inbox not enabled' }, { status: 403 });
    }
    if (!(await conversationBelongsToOrg(supabase, conversationId, organizationId))) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const updates: Record<string, unknown> = {};
    if (typeof body.status === 'string' && ['open', 'closed', 'snoozed'].includes(body.status)) updates.status = body.status;
    if (typeof body.priority === 'string' && ['low', 'normal', 'high'].includes(body.priority)) updates.priority = body.priority;
    if (body.lead_id !== undefined) updates.lead_id = body.lead_id === null || body.lead_id === '' ? null : body.lead_id;
    if (body.contact_id !== undefined) updates.contact_id = body.contact_id === null || body.contact_id === '' ? null : body.contact_id;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid updates' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('conversations')
      .update(updates)
      .eq('id', conversationId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (err) {
    return handleApiError(err, 'inbox/conversations/[id] PATCH');
  }
}
