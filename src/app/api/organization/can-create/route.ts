/**
 * GET /api/organization/can-create – whether the user can create another business (plan limit).
 */

import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMaxBusinessesForUser } from '@/lib/entitlements';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAdminClient();
    const { max, ownedCount, canCreate } = await getMaxBusinessesForUser(supabase, user.id, false);

    return NextResponse.json({ can_create: canCreate, max, owned_count: ownedCount });
  } catch (err) {
    console.error('[API] organization/can-create', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
