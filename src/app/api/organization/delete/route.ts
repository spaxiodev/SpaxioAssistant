/**
 * DELETE /api/organization/delete – delete a business (owner only). User must have at least one org left.
 * Body: { organization_id: string }. If the deleted org was the current one, clears the current-org cookie.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CURRENT_ORG_COOKIE } from '@/lib/auth-server';
import { isUuid } from '@/lib/validation';

export async function DELETE(request: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const organizationId = typeof body.organization_id === 'string' ? body.organization_id.trim() : '';

    if (!organizationId || !isUuid(organizationId)) {
      return NextResponse.json({ error: 'Invalid organization id' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id);

    const owned = (memberships ?? []).filter((m) => m.role === 'owner');
    const targetMembership = (memberships ?? []).find((m) => m.organization_id === organizationId);

    if (!targetMembership) {
      return NextResponse.json({ error: 'You do not have access to this organization' }, { status: 403 });
    }
    if (targetMembership.role !== 'owner') {
      return NextResponse.json({ error: 'Only the owner can delete this business' }, { status: 403 });
    }
    if (owned.length <= 1) {
      return NextResponse.json(
        { error: 'You must have at least one business. Create another before deleting this one.' },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase.from('organizations').delete().eq('id', organizationId);

    if (deleteError) {
      console.error('[API] organization/delete', deleteError);
      return NextResponse.json({ error: 'Failed to delete business' }, { status: 500 });
    }

    const cookieStore = await cookies();
    const currentCookie = cookieStore.get(CURRENT_ORG_COOKIE)?.value;
    if (currentCookie === organizationId) {
      cookieStore.delete(CURRENT_ORG_COOKIE);
    }

    return NextResponse.json({
      ok: true,
      was_current: currentCookie === organizationId,
    });
  } catch (err) {
    console.error('[API] organization/delete', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
