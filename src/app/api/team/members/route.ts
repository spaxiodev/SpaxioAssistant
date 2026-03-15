/**
 * GET /api/team/members – list organization members (owner or has manage_team_members).
 * Session only.
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
    const { data: members } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .limit(1);
    const orgId = members?.[0]?.organization_id;
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const auth = await getTeamMemberAuth(supabase, orgId, user.id);
    if (!auth?.canManageTeamMembers) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: list, error } = await supabase
      .from('organization_members')
      .select(`
        id,
        user_id,
        role,
        role_label,
        permissions,
        invited_by_user_id,
        created_at
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[API] team/members GET', error);
      return NextResponse.json({ error: 'Failed to list members' }, { status: 500 });
    }

    const userIds = [...new Set((list ?? []).map((m) => m.user_id).concat((list ?? []).map((m) => m.invited_by_user_id).filter(Boolean) as string[]))];
    const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const emailMap = new Map<string, string | undefined>();
    await Promise.all(
      userIds.map(async (uid) => {
        const { data: u } = await supabase.auth.admin.getUserById(uid);
        if (u?.user?.email) emailMap.set(uid, u.user.email);
      })
    );

    const membersWithDetails = (list ?? []).map((m) => {
      const profile = profileMap.get(m.user_id);
      const email = emailMap.get(m.user_id) ?? null;
      const inviter = m.invited_by_user_id ? profileMap.get(m.invited_by_user_id) : null;
      return {
        id: m.id,
        user_id: m.user_id,
        email,
        full_name: profile?.full_name ?? null,
        role: m.role,
        role_label: m.role_label ?? null,
        permissions: m.permissions ?? {},
        invited_by_user_id: m.invited_by_user_id,
        invited_by_name: inviter?.full_name ?? null,
        created_at: m.created_at,
        is_owner: m.role === 'owner',
      };
    });

    return NextResponse.json({ members: membersWithDetails });
  } catch (err) {
    console.error('[API] team/members GET', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
