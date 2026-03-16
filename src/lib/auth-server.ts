import type { User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { ensureUserOrganization } from '@/lib/ensure-org';

const CURRENT_ORG_COOKIE = 'current_organization_id';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Get the current organization ID from the authenticated user's membership.
 * Uses current_organization_id cookie when set and valid (user must be member of that org).
 * Otherwise returns the first org by created_at (Stripe-style: you can switch business in Team section).
 * Returns null if not authenticated or user has no org.
 * Pass an existing user to avoid a second auth round-trip (e.g. when called after getUser()).
 */
export async function getOrganizationId(userOrNull?: User | null): Promise<string | null> {
  let user = userOrNull;
  if (user === undefined) {
    const u = await getUser();
    user = u;
  }

  if (!user) {
    return null;
  }

  const supabase = await createClient();

  // Prefer cookie-selected org if valid
  const cookieStore = await cookies();
  const currentOrgId = cookieStore.get(CURRENT_ORG_COOKIE)?.value;
  if (currentOrgId && UUID_REGEX.test(currentOrgId)) {
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('organization_id', currentOrgId)
      .maybeSingle();
    if (member) {
      return currentOrgId;
    }
  }

  const { data: members } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1);

  if (members && members.length > 0) {
    return members[0].organization_id;
  }

  const userMetadata = user.user_metadata as { full_name?: string; business_name?: string; industry?: string } | undefined;
  const orgId = await ensureUserOrganization(
    user.id,
    userMetadata?.full_name,
    userMetadata?.business_name ?? null,
    userMetadata?.industry ?? null
  );
  return orgId;
}

/** Cookie name used for current organization (for switch API). */
export { CURRENT_ORG_COOKIE };

/**
 * Get the current user from the Supabase session. Returns null if not authenticated.
 */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Returns true if the current request has an authenticated user.
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getUser();
  return user != null;
}
