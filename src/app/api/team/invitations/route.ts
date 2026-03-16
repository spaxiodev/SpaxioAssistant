/**
 * GET /api/team/invitations – list pending invitations (owner or manage_team_members).
 * POST /api/team/invitations – create invite (owner only, paid plan, under seat limit).
 */

import { NextResponse } from 'next/server';
import { getOrganizationId, getUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTeamMemberAuth, requireOwner } from '@/lib/team-auth-server';
import { canAddTeamMember, getPlanForOrg } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { planUpgradeRequiredResponse } from '@/lib/api-plan-error';
import { getUpgradePlanForFeature, normalizePlanSlug } from '@/lib/plan-config';
import { serializePermissions, type TeamPermissions } from '@/lib/team-permissions';
import { sendTeamInviteEmail } from '@/lib/team-invite-email';
import { getClientIp } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { randomBytes } from 'crypto';
import { sanitizeText } from '@/lib/validation';

const INVITE_EXPIRY_DAYS = 7;
const TOKEN_BYTES = 32;

function secureToken(): string {
  return randomBytes(TOKEN_BYTES).toString('hex');
}

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = await getOrganizationId(user);
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const supabase = createAdminClient();

    const auth = await getTeamMemberAuth(supabase, orgId, user.id);
    if (!auth?.canManageTeamMembers) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: list, error } = await supabase
      .from('organization_invitations')
      .select('id, email, role_label, permissions, invited_by_user_id, status, expires_at, created_at')
      .eq('organization_id', orgId)
      .in('status', ['pending'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API] team/invitations GET', error);
      return NextResponse.json({ error: 'Failed to list invitations' }, { status: 500 });
    }

    const inviterIds = [...new Set((list ?? []).map((i) => i.invited_by_user_id))];
    const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', inviterIds);
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const invitations = (list ?? []).map((inv) => ({
      id: inv.id,
      email: inv.email,
      role_label: inv.role_label,
      permissions: inv.permissions ?? {},
      invited_by_user_id: inv.invited_by_user_id,
      invited_by_name: profileMap.get(inv.invited_by_user_id)?.full_name ?? null,
      status: inv.status,
      expires_at: inv.expires_at,
      created_at: inv.created_at,
    }));

    return NextResponse.json({ invitations });
  } catch (err) {
    console.error('[API] team/invitations GET', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = await getOrganizationId(user);
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const ip = getClientIp(request);
    const { allowed } = rateLimit({ key: `team-invite:${user.id}:${ip}`, limit: 10, windowMs: 60 * 60 * 1000 });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many invites. Try again later.' }, { status: 429 });
    }

    const supabase = createAdminClient();
    await requireOwner(supabase, orgId, user.id);

    const adminAllowed = await isOrgAllowedByAdmin(supabase, orgId);
    const canAdd = await canAddTeamMember(supabase, orgId, adminAllowed);
    if (!canAdd) {
      const plan = await getPlanForOrg(supabase, orgId);
      const currentSlug = normalizePlanSlug(plan?.slug ?? 'free') ?? 'free';
      return planUpgradeRequiredResponse({
        message: 'You cannot invite more team members on your current plan. Upgrade to add more.',
        currentPlan: currentSlug,
        requiredPlan: getUpgradePlanForFeature('team_members'),
        feature: 'team_members',
      });
    }

    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const roleLabel = typeof body.role_label === 'string' ? sanitizeText(body.role_label, 100) : null;
    const permissions = body.permissions && typeof body.permissions === 'object' ? (body.permissions as Partial<TeamPermissions>) : {};
    const locale = typeof body.locale === 'string' ? body.locale.trim() : undefined;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);
    const token = secureToken();
    const permissionsPayload = serializePermissions(permissions);

    const { data: existingInvite } = await supabase
      .from('organization_invitations')
      .select('id, status')
      .eq('organization_id', orgId)
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvite) {
      return NextResponse.json({ error: 'An invitation is already pending for this email' }, { status: 409 });
    }

    const { data: memberRows } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', orgId);
    const userIdsInOrg = (memberRows ?? []).map((m) => (m as { user_id: string }).user_id);
    let alreadyMember = false;
    for (const uid of userIdsInOrg) {
      const { data: u } = await supabase.auth.admin.getUserById(uid);
      if (u?.user?.email?.toLowerCase() === email) {
        alreadyMember = true;
        break;
      }
    }
    if (alreadyMember) {
      return NextResponse.json({ error: 'This user is already a member' }, { status: 409 });
    }

    const { data: org } = await supabase.from('organizations').select('name').eq('id', orgId).single();
    const inviterProfile = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
    const inviterName = inviterProfile?.data?.full_name ?? user.email ?? 'A team owner';

    const { data: inserted, error: insertError } = await supabase
      .from('organization_invitations')
      .insert({
        organization_id: orgId,
        email,
        invited_by_user_id: user.id,
        token,
        role_label: roleLabel,
        permissions: permissionsPayload,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      })
      .select('id, email, expires_at, created_at')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'An invitation is already pending for this email' }, { status: 409 });
      }
      console.error('[API] team/invitations POST', insertError);
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
    }

    const emailResult = await sendTeamInviteEmail({
      to: email,
      inviterName: String(inviterName),
      organizationName: (org as { name?: string } | null)?.name ?? '',
      token,
      expiresAt,
      locale,
      request,
    });

    if (!emailResult.sent) {
      console.error('[API] team/invitations email failed', emailResult.error);
    }

    return NextResponse.json({
      invitation: {
        id: inserted.id,
        email: inserted.email,
        expires_at: inserted.expires_at,
        created_at: inserted.created_at,
        email_sent: emailResult.sent,
        email_error: emailResult.sent ? undefined : (emailResult.error ?? 'Unknown error'),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('Forbidden') || msg.includes('only the account owner')) {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    console.error('[API] team/invitations POST', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
