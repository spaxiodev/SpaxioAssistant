/**
 * Guard for AI Setup API: require auth + active subscription.
 * Returns { orgId, supabase } or null and response to send.
 */

import { NextResponse } from 'next/server';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasActiveSubscription } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function requireAiSetupAccess(): Promise<
  | { orgId: string; supabase: SupabaseClient }
  | { response: NextResponse }
> {
  const orgId = await getOrganizationId();
  if (!orgId) {
    return { response: NextResponse.json({ error: 'Unauthorized', code: 'auth_required' }, { status: 403 }) };
  }
  const supabase = createAdminClient();
  const adminAllowed = await isOrgAllowedByAdmin(supabase, orgId);
  const active = await hasActiveSubscription(supabase, orgId, adminAllowed);
  if (!active) {
    return {
      response: NextResponse.json(
        { error: 'AI Setup Assistant is available for subscribed accounts only.', code: 'subscription_required' },
        { status: 403 }
      ),
    };
  }
  return { orgId, supabase };
}
