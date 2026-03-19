import { NextResponse } from 'next/server';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { canUseFollowUpDrafts } from '@/lib/entitlements';

export async function GET(request: Request) {
  const orgId = await getOrganizationId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createAdminClient();
  const allowed = await canUseFollowUpDrafts(supabase, orgId, false);
  if (!allowed) return NextResponse.json({ error: 'Follow-up drafts are not available on your plan.' }, { status: 403 });

  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const leadId = url.searchParams.get('leadId');
  const quoteRequestId = url.searchParams.get('quoteRequestId');
  let query = supabase
    .from('follow_up_drafts')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (status) query = query.eq('status', status);
  if (leadId) query = query.eq('lead_id', leadId);
  if (quoteRequestId) query = query.eq('quote_request_id', quoteRequestId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ drafts: data ?? [] });
}
