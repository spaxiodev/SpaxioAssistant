/**
 * POST /api/team/invitations/resend – resend invite email (owner or manage_team_members).
 */

import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTeamMemberAuth } from '@/lib/team-auth-server';
import { sendTeamInviteEmail } from '@/lib/team-invite-email';
import { isUuid } from '@/lib/validation';
import { randomBytes } from 'crypto';

const TOKEN_BYTES = 32;

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

    const { data: inv, error: fetchErr } = await supabase
      .from('organization_invitations')
      .select('id, organization_id, email, expires_at')
      .eq('id', invitationId)
      .eq('organization_id', orgId)
      .eq('status', 'pending')
      .single();

    if (fetchErr || !inv) {
      return NextResponse.json({ error: 'Invitation not found or no longer pending' }, { status: 404 });
    }

    const expiresAt = new Date(inv.expires_at);
    if (expiresAt <= new Date()) {
      return NextResponse.json({ error: 'Invitation has expired. Create a new one.' }, { status: 400 });
    }

    const newToken = randomBytes(TOKEN_BYTES).toString('hex');
    const { error: updateErr } = await supabase
      .from('organization_invitations')
      .update({ token: newToken, updated_at: new Date().toISOString() })
      .eq('id', invitationId)
      .eq('organization_id', orgId);

    if (updateErr) {
      console.error('[API] team/invitations/resend update', updateErr);
      return NextResponse.json({ error: 'Failed to resend' }, { status: 500 });
    }

    const { data: org } = await supabase.from('organizations').select('name').eq('id', orgId).single();
    const { data: inviterProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
    const inviterName = inviterProfile?.full_name ?? user.email ?? 'A team owner';

    const emailResult = await sendTeamInviteEmail({
      to: inv.email,
      inviterName: String(inviterName),
      organizationName: (org as { name?: string } | null)?.name ?? '',
      token: newToken,
      expiresAt,
      request,
    });

    return NextResponse.json({
      ok: true,
      email_sent: emailResult.sent,
      ...(emailResult.error && { error_message: emailResult.error }),
    });
  } catch (err) {
    console.error('[API] team/invitations/resend', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
