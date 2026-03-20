import { NextResponse } from 'next/server';
import { requireOrg } from '@/lib/api-org-auth';
import { getPlanAccess } from '@/lib/plan-access';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireOrg();
  if (!auth.ok) return auth.response;
  const { organizationId, supabase, adminAllowed } = auth;

  const planAccess = await getPlanAccess(supabase, organizationId, adminAllowed);
  if (!planAccess.featureAccess.email_automation) {
    return NextResponse.json({ error: 'Upgrade required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);
  const status = searchParams.get('status'); // optional filter

  let query = supabase
    .from('inbound_emails')
    .select(
      `id,sender_email,sender_name,subject,detected_language,language_confidence,
       is_spam,is_auto_generated,processing_status,skip_reason,lead_id,
       received_at,processed_at,created_at`,
      { count: 'exact' }
    )
    .eq('organization_id', organizationId)
    .order('received_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('processing_status', status);
  }

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ emails: data ?? [], total: count ?? 0 });
}
