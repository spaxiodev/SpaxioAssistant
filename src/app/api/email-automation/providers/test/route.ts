/**
 * POST /api/email-automation/providers/test?id=<providerId>
 *
 * Tests the connection for an existing saved provider.
 * Updates last_verified_at and status on the provider record.
 *
 * For Gmail/Outlook: validates the OAuth token (fetches profile).
 * For IMAP: runs SMTP auth test.
 * For webhook_inbound / resend: always returns ok=true (no credentials to test).
 */

import { NextResponse } from 'next/server';
import { requireOrg } from '@/lib/api-org-auth';
import { getPlanAccess } from '@/lib/plan-access';
import { validateProviderConnection } from '@/lib/email/providers';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireOrg();
  if (!auth.ok) return auth.response;
  const { organizationId, supabase, adminAllowed } = auth;

  const planAccess = await getPlanAccess(supabase, organizationId, adminAllowed);
  if (!planAccess.featureAccess.email_automation) {
    return NextResponse.json({ error: 'Upgrade required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const providerId = searchParams.get('id');
  if (!providerId) return NextResponse.json({ error: 'id query param required' }, { status: 400 });

  // Fetch provider including config_json (server-side only)
  const { data: provider } = await supabase
    .from('email_providers')
    .select('id, organization_id, provider_type, config_json')
    .eq('organization_id', organizationId)
    .eq('id', providerId)
    .maybeSingle();

  if (!provider) return NextResponse.json({ error: 'Provider not found.' }, { status: 404 });

  const result = await validateProviderConnection(provider);
  const now = new Date().toISOString();

  // Update status + last_verified_at based on result
  await supabase
    .from('email_providers')
    .update({
      status: result.ok ? 'connected' : 'error',
      status_message: result.ok ? null : (result.error ?? 'Connection test failed').slice(0, 255),
      last_verified_at: result.ok ? now : undefined,
      last_checked_at: now,
      // Update connected_email if the test returned one
      ...(result.ok && result.email ? { connected_email: result.email } : {}),
      ...(result.ok && result.name ? { connected_name: result.name } : {}),
    })
    .eq('id', providerId);

  return NextResponse.json({
    ok: result.ok,
    email: result.email ?? null,
    error: result.ok ? null : result.error,
  });
}
