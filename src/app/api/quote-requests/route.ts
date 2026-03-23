/**
 * GET /api/quote-requests — list quote requests for dashboard (Simple Mode combined view).
 */
import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { requireOrg } from '@/lib/api-org-auth';

export async function GET(request: Request) {
  try {
    const auth = await requireOrg();
    if (!auth.ok) return auth.response;
    const { organizationId, supabase } = auth;

    const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get('limit')) || 50, 1), 100);

    const { data, error } = await supabase
      .from('quote_requests')
      .select(
        'id, customer_name, customer_email, customer_phone, service_type, submission_source, project_details, created_at'
      )
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ quoteRequests: data ?? [] });
  } catch (err) {
    return handleApiError(err, 'quote-requests');
  }
}
