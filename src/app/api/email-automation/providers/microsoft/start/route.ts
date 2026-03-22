/**
 * GET /api/email-automation/providers/microsoft/start
 *
 * Initiates the Outlook / Microsoft 365 OAuth 2.0 flow.
 *
 * Query params:
 *   returnTo   – client-provided return path (relative, no external redirects)
 *   reconnect  – optional provider ID to reconnect
 *
 * Uses the /common tenant to support both personal (Outlook.com) and
 * organizational (Microsoft 365 / Entra ID) accounts.
 */

import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { requireOrg } from '@/lib/api-org-auth';
import { getPlanAccess } from '@/lib/plan-access';
import { getPublicAppUrl } from '@/lib/app-url';
import { isEncryptionConfigured } from '@/lib/security/secrets';

export const dynamic = 'force-dynamic';

const MICROSOFT_AUTH_BASE = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';

const GRAPH_SCOPES = [
  'openid',
  'email',
  'profile',
  'offline_access',
  'https://graph.microsoft.com/User.Read',
  'https://graph.microsoft.com/Mail.Send',
].join(' ');

export async function GET(request: Request) {
  const auth = await requireOrg();
  if (!auth.ok) return auth.response;
  const { organizationId, supabase, adminAllowed } = auth;

  const planAccess = await getPlanAccess(supabase, organizationId, adminAllowed);
  if (!planAccess.featureAccess.email_automation) {
    return NextResponse.json({ error: 'Email automation requires an upgraded plan.' }, { status: 403 });
  }

  if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
    return NextResponse.json(
      {
        error:
          'Microsoft OAuth is not configured on this server (missing MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET).',
      },
      { status: 503 }
    );
  }

  if (!isEncryptionConfigured()) {
    return NextResponse.json(
      { error: 'Credential encryption is not configured (missing EMAIL_ENCRYPTION_KEY).' },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const rawReturnTo = searchParams.get('returnTo') ?? '/dashboard/email-automation';
  const returnTo = rawReturnTo.startsWith('/') ? rawReturnTo : '/dashboard/email-automation';
  const reconnectId = searchParams.get('reconnect') ?? null;

  const state = randomBytes(24).toString('hex');
  const stateExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const configJson = {
    state,
    state_expires_at: stateExpiresAt,
    return_to: returnTo,
  };

  if (reconnectId) {
    const { data: existing } = await supabase
      .from('email_providers')
      .select('id, organization_id, provider_type')
      .eq('id', reconnectId)
      .eq('organization_id', organizationId)
      .eq('provider_type', 'outlook')
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: 'Provider not found.' }, { status: 404 });
    }

    await supabase
      .from('email_providers')
      .update({ status: 'connecting', config_json: configJson, status_message: null })
      .eq('id', reconnectId);
  } else {
    const { count } = await supabase
      .from('email_providers')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { error: 'Maximum of 3 email providers allowed. Remove an existing provider first.' },
        { status: 400 }
      );
    }

    const { error: insertErr } = await supabase.from('email_providers').insert({
      organization_id: organizationId,
      provider_type: 'outlook',
      display_name: 'Outlook / Microsoft 365',
      status: 'connecting',
      config_json: configJson,
    });

    if (insertErr) {
      return NextResponse.json({ error: 'Failed to create provider record.' }, { status: 500 });
    }
  }

  const appUrl = getPublicAppUrl({ request });
  const redirectUri = `${appUrl}/api/email-automation/providers/microsoft/callback`;

  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GRAPH_SCOPES,
    state,
    // prompt=select_account lets users choose which Microsoft account to use
    prompt: 'select_account',
  });

  return NextResponse.redirect(`${MICROSOFT_AUTH_BASE}?${params.toString()}`, 302);
}
