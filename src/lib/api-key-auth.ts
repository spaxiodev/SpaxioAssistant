/**
 * API key authentication for programmatic automation management.
 * Used when api_access entitlement is enabled. Keys stored hashed (SHA-256).
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { hasApiAccess } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { createHash, randomBytes } from 'crypto';

const KEY_PREFIX_LENGTH = 12;
const KEY_BYTES = 32;

function hashKey(key: string): string {
  return createHash('sha256').update(key, 'utf8').digest('hex');
}

export function getApiKeyFromRequest(request: Request): string | null {
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim();
  const xKey = request.headers.get('x-api-key');
  if (xKey?.trim()) return xKey.trim();
  return null;
}

/**
 * Resolve organization ID: try session first, then API key. Use for automation API routes.
 */
export async function getOrganizationIdOrFromApiKey(request: Request): Promise<string | null> {
  const { getOrganizationId } = await import('@/lib/auth-server');
  const orgFromSession = await getOrganizationId();
  if (orgFromSession) return orgFromSession;
  return getOrganizationIdFromApiKey(request);
}

/**
 * Resolve organization ID from API key. Returns null if invalid or org lacks api_access.
 */
export async function getOrganizationIdFromApiKey(request: Request): Promise<string | null> {
  const key = getApiKeyFromRequest(request);
  if (!key || key.length < 16) return null;

  const keyHash = hashKey(key);
  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from('organization_api_keys')
    .select('id, organization_id')
    .eq('key_hash', keyHash)
    .maybeSingle();

  if (error || !row?.organization_id) return null;

  await supabase
    .from('organization_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', row.id);

  const adminAllowed = await isOrgAllowedByAdmin(supabase, row.organization_id);
  const allowed = await hasApiAccess(supabase, row.organization_id, adminAllowed);
  return allowed ? row.organization_id : null;
}

/**
 * Create a new API key for the organization. Returns the raw key once (store it securely).
 */
export async function createOrganizationApiKey(
  organizationId: string,
  name: string
): Promise<{ key: string; keyPrefix: string; id: string } | null> {
  const rawKey = `spax_${randomBytes(KEY_BYTES).toString('hex')}`;
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.slice(0, KEY_PREFIX_LENGTH);

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from('organization_api_keys')
    .insert({
      organization_id: organizationId,
      name: name.slice(0, 100) || 'API key',
      key_hash: keyHash,
      key_prefix: keyPrefix,
    })
    .select('id')
    .single();

  if (error || !row) return null;
  return { key: rawKey, keyPrefix, id: row.id };
}
