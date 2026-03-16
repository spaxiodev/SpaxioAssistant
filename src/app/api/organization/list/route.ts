/**
 * GET /api/organization/list – list organizations the user belongs to (for business switcher).
 * Returns id, name, business_name, is_owner so UI can show "Your business" vs "Team: X".
 */

import { NextResponse } from 'next/server';
import { getOrganizationId, getUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const currentOrgId = await getOrganizationId(user);

    const supabase = createAdminClient();
    const { data: memberships, error: memError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (memError || !memberships?.length) {
      return NextResponse.json({ organizations: [] });
    }

    const orgIds = memberships.map((m) => m.organization_id);
    const [orgsRes, businessRes] = await Promise.all([
      supabase.from('organizations').select('id, name').in('id', orgIds),
      supabase.from('business_settings').select('organization_id, business_name').in('organization_id', orgIds),
    ]);

    if (orgsRes.error) {
      console.error('[API] organization/list orgs', orgsRes.error);
      return NextResponse.json({ error: 'Failed to load organizations' }, { status: 500 });
    }

    const orgMap = new Map((orgsRes.data ?? []).map((o) => [o.id, o]));
    const businessMap = new Map((businessRes.data ?? []).map((b) => [b.organization_id, b.business_name ?? null]));

    const organizations = memberships.map((m) => {
      const org = orgMap.get(m.organization_id);
      const businessName = businessMap.get(m.organization_id);
      const displayName = businessName?.trim() || org?.name || 'Workspace';
      return {
        id: m.organization_id,
        name: org?.name ?? '',
        business_name: businessName ?? null,
        display_name: displayName,
        is_owner: m.role === 'owner',
        is_current: m.organization_id === currentOrgId,
      };
    });

    return NextResponse.json({ organizations });
  } catch (err) {
    console.error('[API] organization/list', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
