/**
 * GET /api/email-automation/providers/google/callback
 *
 * Handles Google's redirect after OAuth consent.
 * This endpoint is public (no session auth) — it is a redirect target from Google.
 *
 * Security:
 *   - The `state` param is validated against the value stored in config_json during /start.
 *   - States expire after 10 minutes.
 *   - Tokens are AES-256-GCM encrypted before storage.
 *   - Raw tokens are never logged.
 *
 * On success → redirects to returnTo?provider_connected=gmail
 * On failure → redirects to returnTo?provider_error=<reason>
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPublicAppUrl } from '@/lib/app-url';
import { buildGmailConfig } from '@/lib/email/providers/gmail';

export const dynamic = 'force-dynamic';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

const FALLBACK_RETURN = '/dashboard/email-automation';

function errorRedirect(returnTo: string, reason: string): NextResponse {
  const url = `${returnTo}?provider_error=${encodeURIComponent(reason)}`;
  return NextResponse.redirect(url, 302);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorParam = searchParams.get('error');

  const appUrl = getPublicAppUrl({ request });
  const fallback = `${appUrl}${FALLBACK_RETURN}`;

  // Google may redirect with ?error=access_denied if user cancels
  if (errorParam) {
    return NextResponse.redirect(
      `${fallback}?provider_error=${encodeURIComponent('Google sign-in was cancelled or denied.')}`,
      302
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${fallback}?provider_error=${encodeURIComponent('Invalid OAuth response from Google.')}`,
      302
    );
  }

  const supabase = createAdminClient();

  // Find the provider record with this state
  const { data: providers } = await supabase
    .from('email_providers')
    .select('id, organization_id, config_json')
    .eq('provider_type', 'gmail')
    .eq('status', 'connecting')
    .order('created_at', { ascending: false })
    .limit(10);

  const provider = (providers ?? []).find((p) => {
    const cfg = p.config_json as { state?: string } | null;
    return cfg?.state === state;
  });

  if (!provider) {
    return NextResponse.redirect(
      `${fallback}?provider_error=${encodeURIComponent('OAuth session expired or not found. Please try again.')}`,
      302
    );
  }

  const cfg = provider.config_json as {
    state?: string;
    state_expires_at?: string;
    return_to?: string;
  };

  const returnTo = cfg.return_to?.startsWith('/')
    ? `${appUrl}${cfg.return_to}`
    : `${appUrl}${FALLBACK_RETURN}`;

  // Check state expiry
  if (cfg.state_expires_at && new Date(cfg.state_expires_at).getTime() < Date.now()) {
    await supabase
      .from('email_providers')
      .update({ status: 'disconnected', status_message: 'OAuth session expired.' })
      .eq('id', provider.id);
    return errorRedirect(returnTo, 'OAuth session expired. Please try again.');
  }

  // Exchange code for tokens
  const redirectUri = `${appUrl}/api/email-automation/providers/google/callback`;
  const tokenParams = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  let tokenData: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    error?: string;
    error_description?: string;
  };

  try {
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });
    tokenData = await tokenRes.json();
  } catch {
    await supabase
      .from('email_providers')
      .update({ status: 'error', status_message: 'Token exchange failed.' })
      .eq('id', provider.id);
    return errorRedirect(returnTo, 'Failed to exchange authorization code. Please try again.');
  }

  if (tokenData.error || !tokenData.access_token) {
    const msg = tokenData.error_description ?? tokenData.error ?? 'Token exchange failed';
    await supabase
      .from('email_providers')
      .update({ status: 'error', status_message: msg.slice(0, 255) })
      .eq('id', provider.id);
    return errorRedirect(returnTo, msg);
  }

  if (!tokenData.refresh_token) {
    // This happens when re-using an OAuth grant without prompt=consent.
    // Our /start always uses prompt=consent so this is a safety net.
    await supabase
      .from('email_providers')
      .update({
        status: 'error',
        status_message: 'No refresh token returned. Please revoke and reconnect the app in your Google account.',
      })
      .eq('id', provider.id);
    return errorRedirect(
      returnTo,
      'Google did not provide a refresh token. Please revoke this app in your Google account security settings and try again.'
    );
  }

  // Fetch profile to get the connected email address
  let profileEmail = '';
  let profileName: string | null = null;

  try {
    const profileRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (profileRes.ok) {
      const profile = (await profileRes.json()) as { email?: string; name?: string };
      profileEmail = profile.email ?? '';
      profileName = profile.name ?? null;
    }
  } catch {
    // Profile fetch is best-effort; proceed with empty email.
  }

  // Build encrypted config and persist
  const encryptedConfig = buildGmailConfig({
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresIn: tokenData.expires_in ?? 3600,
    scope: tokenData.scope ?? '',
    email: profileEmail,
  });

  const now = new Date().toISOString();

  const { error: updateErr } = await supabase
    .from('email_providers')
    .update({
      status: 'connected',
      status_message: null,
      config_json: encryptedConfig,
      connected_email: profileEmail || null,
      connected_name: profileName,
      display_name: profileEmail || 'Gmail',
      last_verified_at: now,
      connected_at: now,
    })
    .eq('id', provider.id);

  if (updateErr) {
    return errorRedirect(returnTo, 'Failed to save provider credentials. Please try again.');
  }

  return NextResponse.redirect(`${returnTo}?provider_connected=gmail`, 302);
}
