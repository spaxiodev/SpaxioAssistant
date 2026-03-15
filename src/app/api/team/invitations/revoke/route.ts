/**
 * POST /api/team/invitations/revoke – revoke a pending invitation (owner or manage_team_members).
 */

import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTeamMemberAuth } from '@/lib/team-auth-server';
import { isUuid } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const invitationId = typeof body.invitation_id === 'string' ? body.invitation_id.trim() : '';
    if (!isUuid(invitationId)) {
      return NextResponse.json({ error: 'Invalid invitation id' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: myMember } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();
    const orgId = myMember?.organization_id;
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const auth = await getTeamMemberAuth(supabase, orgId, user.id);
    if (!auth?.canManageTeamMembers) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: inv } = await supabase
      .from('organization_invitations')
      .select('id')
      .eq('id', invitationId)
      .eq('organization_id', orgId)
      .eq('status', 'pending')
      .single();

    if (!inv) {
      return NextResponse.json({ error: 'Invitation not found or already revoked' }, { status: 404 });
    }

    const { error } = await supabase
      .from('organization_invitations')
      .update({ status: 'revoked', updated_at: new Date().toISOString() })
      .eq('id', invitationId)
      .eq('organization_id', orgId);

    if (error) {
      console.error('[API] team/invitations/revoke', error);
      return NextResponse.json({ error: 'Failed to revoke' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[API] team/invitations/revoke', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
