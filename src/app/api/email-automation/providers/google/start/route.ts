/**
 * GET /api/email-automation/providers/google/start
 *
 * Initiates the Gmail / Google Workspace OAuth 2.0 flow.
 *
 * Query params:
 *   returnTo   – client-provided return path (must start with "/", no external redirects)
 *   reconnect  – optional provider ID to reconnect (updates existing record vs creating new)
 *
 * Flow:
 *   1. Authenticate the request (must be a logged-in org member).
 *   2. Generate a random CSRF state.
 *   3. Create (or update) an email_providers row in "connecting" status with the state embedded.
 *   4. Redirect to Google's OAuth consent screen.
 */

import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { requireOrg } from '@/lib/api-org-auth';
import { getPlanAccess } from '@/lib/plan-access';
import { getPublicAppUrl } from '@/lib/app-url';
import { isEncryptionConfigured } from '@/lib/security/secrets';

export const dynamic = 'force-dynamic';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/gmail.send',
].join(' ');

export async function GET(request: Request) {
  const auth = await requireOrg();
  if (!auth.ok) return auth.response;
  const { organizationId, supabase, adminAllowed } = auth;

  const planAccess = await getPlanAccess(supabase, organizationId, adminAllowed);
  if (!planAccess.featureAccess.email_automation) {
    return NextResponse.json({ error: 'Email automation requires an upgraded plan.' }, { status: 403 });
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { error: 'Google OAuth is not configured on this server (missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).' },
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

  // Validate returnTo: must be a relative path (prevents open-redirect).
  const rawReturnTo = searchParams.get('returnTo') ?? '/dashboard/email-automation';
  const returnTo = rawReturnTo.startsWith('/') ? rawReturnTo : '/dashboard/email-automation';

  // Optional reconnect: update an existing provider instead of creating a new one.
  const reconnectId = searchParams.get('reconnect') ?? null;

  const state = randomBytes(24).toString('hex');
  const stateExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

  const configJson = {
    state,
    state_expires_at: stateExpiresAt,
    return_to: returnTo,
  };

  if (reconnectId) {
    // Verify the provider belongs to this org before updating it.
    const { data: existing } = await supabase
      .from('email_providers')
      .select('id, organization_id, provider_type')
      .eq('id', reconnectId)
      .eq('organization_id', organizationId)
      .eq('provider_type', 'gmail')
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: 'Provider not found.' }, { status: 404 });
    }

    await supabase
      .from('email_providers')
      .update({ status: 'connecting', config_json: configJson, status_message: null })
      .eq('id', reconnectId);
  } else {
    // Count existing providers to respect plan limits.
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
      provider_type: 'gmail',
      display_name: 'Gmail',
      status: 'connecting',
      config_json: configJson,
    });

    if (insertErr) {
      return NextResponse.json({ error: 'Failed to create provider record.' }, { status: 500 });
    }
  }

  const appUrl = getPublicAppUrl({ request });
  const redirectUri = `${appUrl}/api/email-automation/providers/google/callback`;

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GMAIL_SCOPES,
    access_type: 'offline',
    prompt: 'consent', // always request refresh token
    state,
  });

  return NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`, 302);
}
