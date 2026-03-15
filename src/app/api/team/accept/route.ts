/**
 * GET /api/team/accept?token=xxx – get invite details for accept page (no auth required).
 * POST /api/team/accept – accept invite (body: { token }); requires authenticated user.
 */

import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { parsePermissions } from '@/lib/team-permissions';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token')?.trim();
    if (!token) {
      return NextResponse.json({ valid: false, error: 'missing_token' });
    }

    const supabase = createAdminClient();
    const { data: inv, error } = await supabase
      .from('organization_invitations')
      .select('id, organization_id, email, role_label, permissions, invited_by_user_id, status, expires_at')
      .eq('token', token)
      .single();

    if (error || !inv) {
      return NextResponse.json({ valid: false, error: 'invalid_token' });
    }
    if (inv.status !== 'pending') {
      return NextResponse.json({ valid: false, error: inv.status === 'revoked' ? 'revoked' : inv.status === 'expired' ? 'expired' : 'invalid_token' });
    }
    const expiresAt = new Date(inv.expires_at);
    if (expiresAt <= new Date()) {
      await supabase
        .from('organization_invitations')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', inv.id);
      return NextResponse.json({ valid: false, error: 'expired' });
    }

    const { data: org } = await supabase.from('organizations').select('name').eq('id', inv.organization_id).single();
    const { data: inviterProfile } = await supabase.from('profiles').select('full_name').eq('id', inv.invited_by_user_id).single();

    return NextResponse.json({
      valid: true,
      email: inv.email,
      role_label: inv.role_label,
      permissions: parsePermissions(inv.permissions),
      organization_name: (org as { name?: string } | null)?.name ?? null,
      inviter_name: (inviterProfile as { full_name?: string } | null)?.full_name ?? null,
      expires_at: inv.expires_at,
    });
  } catch (err) {
    console.error('[API] team/accept GET', err);
    return NextResponse.json({ valid: false, error: 'invalid_token' });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'auth_required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: inv, error: fetchErr } = await supabase
      .from('organization_invitations')
      .select('id, organization_id, email, role_label, permissions, invited_by_user_id, status, expires_at')
      .eq('token', token)
      .single();

    if (fetchErr || !inv) {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 });
    }
    if (inv.status !== 'pending') {
      return NextResponse.json({ error: 'Invitation was already used or revoked' }, { status: 400 });
    }
    const expiresAt = new Date(inv.expires_at);
    if (expiresAt <= new Date()) {
      await supabase
        .from('organization_invitations')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', inv.id);
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 });
    }

    if (inv.email.toLowerCase() !== (user.email ?? '').toLowerCase()) {
      return NextResponse.json({ error: 'This invitation was sent to a different email address' }, { status: 403 });
    }

    const { data: existing } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', inv.organization_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('organization_invitations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', inv.id);
      return NextResponse.json({ ok: true, already_member: true });
    }

    const { error: insertErr } = await supabase.from('organization_members').insert({
      organization_id: inv.organization_id,
      user_id: user.id,
      role: 'member',
      role_label: inv.role_label,
      permissions: inv.permissions ?? {},
      invited_by_user_id: inv.invited_by_user_id,
    });

    if (insertErr) {
      console.error('[API] team/accept POST insert member', insertErr);
      return NextResponse.json({ error: 'Failed to join team' }, { status: 500 });
    }

    await supabase
      .from('organization_invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', inv.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[API] team/accept POST', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
