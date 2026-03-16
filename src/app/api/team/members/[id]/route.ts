/**
 * PATCH /api/team/members/[id] – update member permissions (owner or manage_team_members).
 * DELETE /api/team/members/[id] – remove member (owner or manage_team_members; cannot remove owner).
 */

import { NextResponse } from 'next/server';
import { getOrganizationId, getUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTeamMemberAuth } from '@/lib/team-auth-server';
import { serializePermissions, type TeamPermissions } from '@/lib/team-permissions';
import { isUuid } from '@/lib/validation';

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = await getOrganizationId(user);
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const { id: memberId } = await context.params;
    if (!isUuid(memberId)) return NextResponse.json({ error: 'Invalid member id' }, { status: 400 });

    const supabase = createAdminClient();

    const auth = await getTeamMemberAuth(supabase, orgId, user.id);
    if (!auth?.canManageTeamMembers) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: target } = await supabase
      .from('organization_members')
      .select('id, role, organization_id')
      .eq('id', memberId)
      .eq('organization_id', orgId)
      .single();

    if (!target || target.organization_id !== orgId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    if (target.role === 'owner') {
      return NextResponse.json({ error: 'Cannot change owner permissions' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const roleLabel = typeof body.role_label === 'string' ? body.role_label.trim().slice(0, 100) : undefined;
    const permissions = body.permissions && typeof body.permissions === 'object' ? (body.permissions as Partial<TeamPermissions>) : undefined;

    const updates: Record<string, unknown> = {};
    if (roleLabel !== undefined) updates.role_label = roleLabel || null;
    if (permissions !== undefined) updates.permissions = serializePermissions(permissions);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true });
    }

    const { error } = await supabase
      .from('organization_members')
      .update(updates)
      .eq('id', memberId)
      .eq('organization_id', orgId);

    if (error) {
      console.error('[API] team/members PATCH', error);
      return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[API] team/members PATCH', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = await getOrganizationId(user);
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const { id: memberId } = await context.params;
    if (!isUuid(memberId)) return NextResponse.json({ error: 'Invalid member id' }, { status: 400 });

    const supabase = createAdminClient();

    const auth = await getTeamMemberAuth(supabase, orgId, user.id);
    if (!auth?.canManageTeamMembers) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: target } = await supabase
      .from('organization_members')
      .select('id, role, organization_id')
      .eq('id', memberId)
      .eq('organization_id', orgId)
      .single();

    if (!target || target.organization_id !== orgId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    if (target.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove the owner' }, { status: 400 });
    }

    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', memberId)
      .eq('organization_id', orgId);

    if (error) {
      console.error('[API] team/members DELETE', error);
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[API] team/members DELETE', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
