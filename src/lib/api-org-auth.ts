/**
 * Shared helpers for API routes: require org auth and optional entitlement check.
 * Reduces duplication of getOrganizationId + isOrgAllowedByAdmin + canUseX.
 */
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isOrgAllowedByAdmin } from '@/lib/admin';

export type RequireOrgResult =
  | { ok: true; organizationId: string; supabase: SupabaseClient; adminAllowed: boolean }
  | { ok: false; response: NextResponse };

/**
 * Require authenticated org. Returns orgId + supabase + adminAllowed, or a 403 response.
 */
export async function requireOrg(): Promise<RequireOrgResult> {
  const organizationId = await getOrganizationId();
  if (!organizationId) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 403 }) };
  }
  const supabase = createAdminClient();
  const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
  return { ok: true, organizationId, supabase, adminAllowed };
}
