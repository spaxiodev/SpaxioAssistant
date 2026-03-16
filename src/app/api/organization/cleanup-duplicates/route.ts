/**
 * POST /api/organization/cleanup-duplicates – keep only the 2 oldest businesses you own, delete the rest.
 * Use this to remove duplicate orgs created by a race (e.g. all named the same). At least 1 org is always kept.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CURRENT_ORG_COOKIE } from '@/lib/auth-server';

const KEEP_COUNT = 2;

export async function POST() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAdminClient();

    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id, role, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    const owned = (memberships ?? []).filter((m) => m.role === 'owner');
    if (owned.length <= KEEP_COUNT) {
      return NextResponse.json({ ok: true, deleted: 0, message: 'Nothing to clean up.' });
    }

    const toKeep = owned.slice(0, KEEP_COUNT).map((m) => m.organization_id);
    const toDelete = owned.slice(KEEP_COUNT).map((m) => m.organization_id);

    const cookieStore = await cookies();
    const currentCookie = cookieStore.get(CURRENT_ORG_COOKIE)?.value;
    let clearedCurrent = false;

    for (const orgId of toDelete) {
      const { error } = await supabase.from('organizations').delete().eq('id', orgId);
      if (error) {
        console.error('[API] organization/cleanup-duplicates delete', orgId, error);
      } else if (currentCookie === orgId) {
        clearedCurrent = true;
      }
    }

    if (clearedCurrent) {
      cookieStore.delete(CURRENT_ORG_COOKIE);
    }

    return NextResponse.json({
      ok: true,
      deleted: toDelete.length,
      kept: toKeep.length,
      was_current_cleared: clearedCurrent,
    });
  } catch (err) {
    console.error('[API] organization/cleanup-duplicates', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
