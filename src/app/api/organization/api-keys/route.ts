/**
 * Create and list API keys for programmatic automation management.
 * Requires session (owner/admin) and api_access entitlement.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { getOrganizationId } from '@/lib/auth-server';
import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { hasApiAccess } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { createOrganizationApiKey } from '@/lib/api-key-auth';
import { sanitizeText } from '@/lib/validation';

/** GET – list API key metadata (no secrets). */
export async function GET() {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const supabase = createAdminClient();
    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
    const allowed = await hasApiAccess(supabase, organizationId, adminAllowed);
    if (!allowed) {
      return NextResponse.json({ error: 'API access not available on your plan', code: 'plan_limit' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('organization_api_keys')
      .select('id, name, key_prefix, created_at, last_used_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API] organization/api-keys GET', error);
      return NextResponse.json({ error: 'Failed to list API keys' }, { status: 500 });
    }
    return NextResponse.json({ keys: data ?? [] });
  } catch (err) {
    return handleApiError(err, 'organization/api-keys/GET');
  }
}

/** POST – create API key. Returns raw key once; store it securely. */
export async function POST(request: Request) {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const supabase = createAdminClient();
    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
    const allowed = await hasApiAccess(supabase, organizationId, adminAllowed);
    if (!allowed) {
      return NextResponse.json({ error: 'API access not available on your plan', code: 'plan_limit' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const name = sanitizeText(body.name, 100) || 'API key';

    const result = await createOrganizationApiKey(organizationId, name);
    if (!result) {
      return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
    }

    return NextResponse.json({
      id: result.id,
      name,
      key_prefix: result.keyPrefix,
      key: result.key,
      message: 'Store this key securely; it will not be shown again.',
    });
  } catch (err) {
    return handleApiError(err, 'organization/api-keys/POST');
  }
}
