import type { SupabaseClient } from '@supabase/supabase-js';
import { isUuid, normalizeUuid } from '@/lib/validation';

/**
 * Comma-separated Supabase Auth user IDs from .env.
 * These users get free access (subscription bypass) for any org they belong to.
 */
export function getAdminUserIds(): string[] {
  const raw = process.env.ADMIN_USER_IDS;
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .split(',')
    .map((id) => normalizeUuid(id.trim()))
    .filter((id) => id.length > 0 && isUuid(id));
}

/**
 * Returns true if the given organization has at least one member whose user_id
 * is in ADMIN_USER_IDS (free access for admin users).
 */
export async function isOrgAllowedByAdmin(
  supabase: SupabaseClient,
  organizationId: string
): Promise<boolean> {
  const adminIds = getAdminUserIds();
  if (adminIds.length === 0) return false;

  const { data: members } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', organizationId);

  if (!members?.length) return false;
  const memberUserIds = new Set(members.map((m) => m.user_id));
  return adminIds.some((id) => memberUserIds.has(id));
}
