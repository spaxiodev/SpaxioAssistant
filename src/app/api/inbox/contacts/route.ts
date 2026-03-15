/**
 * GET /api/inbox/contacts - List org contacts for CRM link picker (id, name, email). Org-scoped, inbox-only.
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
      return NextResponse.json({ error: 'Inbox not enabled' }, { status: 403 });
    }

    const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get('limit')) || 50, 1), 100);
    const { data, error } = await supabase
      .from('contacts')
      .select('id, name, email, phone')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ contacts: data ?? [] });
  } catch (err) {
    return handleApiError(err, 'inbox/contacts');
  }
}
