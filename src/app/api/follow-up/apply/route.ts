import { NextResponse } from 'next/server';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { canUseFollowUpDrafts } from '@/lib/entitlements';
import { executeFollowUpAction } from '@/lib/follow-up/email';

export async function POST(request: Request) {
  const orgId = await getOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { runId?: string; draftId?: string; action?: string; subject?: string; bodyText?: string; bodyHtml?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { runId, action } = body;
  if (!action) {
    return NextResponse.json({ error: 'Missing action' }, { status: 400 });
  }
  if ((action === 'create_task' || action === 'add_note') && !runId) {
    return NextResponse.json({ error: 'Missing runId' }, { status: 400 });
  }


  if (
    action !== 'create_task' &&
    action !== 'add_note' &&
    action !== 'approve_send_draft' &&
    action !== 'reject_draft'
  ) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const draftsAllowed = await canUseFollowUpDrafts(supabase, orgId, false);
  if (!draftsAllowed) {
    return NextResponse.json({ error: 'Follow-up drafts are not available on your plan.' }, { status: 403 });
  }

  if (action === 'reject_draft') {
    if (!body.draftId) return NextResponse.json({ error: 'Missing draftId' }, { status: 400 });
    const { error } = await supabase
      .from('follow_up_drafts')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', body.draftId)
      .eq('organization_id', orgId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'approve_send_draft') {
    if (!body.draftId) return NextResponse.json({ error: 'Missing draftId' }, { status: 400 });
    const { data: draft, error: fetchErr } = await supabase
      .from('follow_up_drafts')
      .select('*')
      .eq('id', body.draftId)
      .eq('organization_id', orgId)
      .single();
    if (fetchErr || !draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 });

    const result = await executeFollowUpAction({
      supabase,
      organizationId: orgId,
      automationId: (draft.automation_id as string | null) ?? null,
      automationName: 'Manual follow-up approval',
      input: {
        trigger_type: String(draft.source_event_type ?? 'manual_follow_up_requested'),
        lead_id: draft.lead_id ?? undefined,
        quote_request_id: draft.quote_request_id ?? undefined,
        conversation_id: draft.conversation_id ?? undefined,
        customer_email: draft.recipient_email ?? undefined,
        customer_name: draft.recipient_name ?? undefined,
        recipient_language: draft.recipient_language ?? undefined,
      },
      actionConfig: {
        mode: 'template_auto_send',
        manual_subject: body.subject ?? draft.subject,
        manual_body_text: body.bodyText ?? draft.body_text,
        manual_body_html: body.bodyHtml ?? draft.body_html,
      },
    });
    if (result.status !== 'sent') {
      return NextResponse.json({ error: result.reason }, { status: 500 });
    }
    await supabase
      .from('follow_up_drafts')
      .update({
        status: 'sent',
        approved_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
        send_log_id: result.logId ?? null,
      })
      .eq('id', body.draftId)
      .eq('organization_id', orgId);
    return NextResponse.json({ success: true, logId: result.logId ?? null });
  }

  const { data: run, error: fetchErr } = await supabase
    .from('ai_follow_up_runs')
    .select('*')
    .eq('id', runId as string)
    .eq('organization_id', orgId)
    .single();

  if (fetchErr || !run) {
    return NextResponse.json({ error: 'Follow-up run not found' }, { status: 404 });
  }

  if (action === 'create_task') {
    const title = (run.draft_task_title as string) || 'Follow up with customer';
    const { data: task, error: taskErr } = await supabase
      .from('tasks')
      .insert({
        organization_id: orgId,
        lead_id: run.lead_id ?? null,
        contact_id: run.contact_id ?? null,
        deal_id: run.deal_id ?? null,
        title: title.slice(0, 500),
        status: 'pending',
        due_at: null,
      })
      .select('id')
      .single();

    if (taskErr) {
      return NextResponse.json({ error: taskErr.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, taskId: task?.id });
  }

  if (action === 'add_note') {
    const content = (run.draft_note as string) || (run.generated_summary as string) || 'Follow-up note';
    const { data: note, error: noteErr } = await supabase
      .from('notes')
      .insert({
        organization_id: orgId,
        lead_id: run.lead_id ?? null,
        contact_id: run.contact_id ?? null,
        deal_id: run.deal_id ?? null,
        content: content.slice(0, 10000),
      })
      .select('id')
      .single();

    if (noteErr) {
      return NextResponse.json({ error: noteErr.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, noteId: note?.id });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
