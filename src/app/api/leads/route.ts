/**
 * GET /api/leads – List leads for the current organization (dashboard/Simple Mode).
 * Returns basic fields for listing. Auth required.
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
      .from('leads')
      .select('id, name, email, phone, created_at, qualification_priority, qualification_summary, requested_service')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ leads: data ?? [] });
  } catch (err) {
    return handleApiError(err, 'leads');
  }
}
