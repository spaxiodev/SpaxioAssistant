/**
 * GET /api/follow-up?sourceType=lead&sourceId=uuid
 *   or ?leadId=uuid | ?quoteRequestId=uuid
 * Returns the latest completed follow-up run for the given source (org-scoped via auth).
 */

import { NextResponse } from 'next/server';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { canUseFollowUpDrafts } from '@/lib/entitlements';

export async function GET(request: Request) {
  const orgId = await getOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sourceType = searchParams.get('sourceType');
  const sourceId = searchParams.get('sourceId');
  const leadId = searchParams.get('leadId');
  const quoteRequestId = searchParams.get('quoteRequestId');

  const supabase = createAdminClient();
  const allowed = await canUseFollowUpDrafts(supabase, orgId, false);
  if (!allowed) {
    return NextResponse.json({ error: 'Follow-up drafts are not available on your plan.' }, { status: 403 });
  }

  if (leadId) {
    const [byLeadId, bySource] = await Promise.all([
      supabase
        .from('ai_follow_up_runs')
        .select('*')
        .eq('organization_id', orgId)
        .eq('lead_id', leadId)
        .in('status', ['completed', 'failed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('ai_follow_up_runs')
        .select('*')
        .eq('organization_id', orgId)
        .in('source_type', ['lead_form_submitted', 'lead_qualification_completed'])
        .eq('source_id', leadId)
        .in('status', ['completed', 'failed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    const run1 = byLeadId.data ?? null;
    const run2 = bySource.data ?? null;
    if (byLeadId.error) return NextResponse.json({ error: byLeadId.error.message }, { status: 500 });
    if (bySource.error) return NextResponse.json({ error: bySource.error.message }, { status: 500 });
    const run = run1 && run2
      ? (new Date(run1.created_at) >= new Date(run2.created_at) ? run1 : run2)
      : (run1 ?? run2);
    return NextResponse.json(run);
  }

  if (quoteRequestId) {
    const { data: run, error } = await supabase
      .from('ai_follow_up_runs')
      .select('*')
      .eq('organization_id', orgId)
      .eq('source_type', 'quote_request_submitted')
      .eq('source_id', quoteRequestId)
      .in('status', ['completed', 'failed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(run ?? null);
  }

  if (!sourceType || !sourceId) {
    return NextResponse.json({ error: 'Missing sourceType+sourceId or leadId or quoteRequestId' }, { status: 400 });
  }

  const validTypes = ['lead_form_submitted', 'quote_request_submitted', 'lead_qualification_completed', 'conversation_milestone'];
  if (!validTypes.includes(sourceType)) {
    return NextResponse.json({ error: 'Invalid sourceType' }, { status: 400 });
  }

  const { data: run, error } = await supabase
    .from('ai_follow_up_runs')
    .select('*')
    .eq('organization_id', orgId)
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)
    .in('status', ['completed', 'failed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(run ?? null);
}
