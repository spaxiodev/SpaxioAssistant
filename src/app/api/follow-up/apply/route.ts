/**
 * POST /api/follow-up/apply
 * Body: { runId: string, action: 'create_task' | 'add_note' }
 * Creates a task or note from the follow-up run (org-scoped, RLS-safe).
 */

import { NextResponse } from 'next/server';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  const orgId = await getOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { runId?: string; action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { runId, action } = body;
  if (!runId || !action) {
    return NextResponse.json({ error: 'Missing runId or action' }, { status: 400 });
  }

  if (action !== 'create_task' && action !== 'add_note') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: run, error: fetchErr } = await supabase
    .from('ai_follow_up_runs')
    .select('*')
    .eq('id', runId)
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
