/**
 * GET /api/team/permissions – get current user's role and permissions for current org.
 * Used by frontend for permission-based UI and route guards.
 */

import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTeamMemberAuth } from '@/lib/team-auth-server';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAdminClient();
    const { data: myMember } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();
    const orgId = myMember?.organization_id;
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const auth = await getTeamMemberAuth(supabase, orgId, user.id);
    if (!auth) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

    return NextResponse.json({
      organization_id: auth.organizationId,
      role: auth.role,
      role_label: auth.roleLabel,
      permissions: auth.permissions,
      is_owner: auth.isOwner,
      can_manage_team_members: auth.canManageTeamMembers,
    });
  } catch (err) {
    console.error('[API] team/permissions GET', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
