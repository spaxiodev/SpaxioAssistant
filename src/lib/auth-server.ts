import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { ensureUserOrganization } from '@/lib/ensure-org';

/**
 * Get the current organization ID from the authenticated user's membership.
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
