/**
 * GET /api/organization/can-create – whether the user can create another business (plan limit).
 * Read-only: does not create or count any business. The business count only increases when
 * the user submits the form and POST /api/organization/create runs.
 * On auth or entitlements failure we return can_create: true so the dialog shows the form;
 * POST /api/organization/create will enforce the limit. Uses a 6s timeout so the UI never waits longer than that.
 */

import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isUserAdmin } from '@/lib/admin';
import { getMaxBusinessesForUser } from '@/lib/entitlements';

const CAN_CREATE_TIMEOUT_MS = 6000;

function timeoutResponse() {
  return NextResponse.json({ can_create: true, max: 1, owned_count: 0 });
}

export async function GET() {
  const timeoutPromise = new Promise<NextResponse>((resolve) => {
    setTimeout(() => resolve(timeoutResponse()), CAN_CREATE_TIMEOUT_MS);
  });

  const workPromise = (async () => {
    try {
      const user = await getUser();
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

      const supabase = createAdminClient();
      const adminAllowed = isUserAdmin(user.id);
      const { max, ownedCount, canCreate } = await getMaxBusinessesForUser(supabase, user.id, adminAllowed);

      return NextResponse.json({ can_create: canCreate, max, owned_count: ownedCount });
    } catch (err) {
      console.error('[API] organization/can-create', err);
      return NextResponse.json({ can_create: true, max: 1, owned_count: 0 });
    }
  })();

  return Promise.race([workPromise, timeoutPromise]);
}
