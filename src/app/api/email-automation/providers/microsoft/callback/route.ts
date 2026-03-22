/**
 * GET /api/email-automation/providers/microsoft/callback
 *
 * Handles Microsoft's redirect after OAuth consent.
 * Public endpoint — no session auth required.
 *
 * On success → redirects to returnTo?provider_connected=outlook
 * On failure → redirects to returnTo?provider_error=<reason>
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPublicAppUrl } from '@/lib/app-url';
import { buildOutlookConfig } from '@/lib/email/providers/outlook';

export const dynamic = 'force-dynamic';

const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const GRAPH_ME_URL = 'https://graph.microsoft.com/v1.0/me';

const FALLBACK_RETURN = '/dashboard/email-automation';

function errorRedirect(returnTo: string, reason: string): NextResponse {
  return NextResponse.redirect(`${returnTo}?provider_error=${encodeURIComponent(reason)}`, 302);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorParam = searchParams.get('error');
  const errorDesc = searchParams.get('error_description');

  const appUrl = getPublicAppUrl({ request });
  const fallback = `${appUrl}${FALLBACK_RETURN}`;

  if (errorParam) {
    const msg = errorDesc ?? errorParam;
    return NextResponse.redirect(
      `${fallback}?provider_error=${encodeURIComponent(msg)}`,
      302
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${fallback}?provider_error=${encodeURIComponent('Invalid OAuth response from Microsoft.')}`,
      302
    );
  }

  const supabase = createAdminClient();

  // Find the pending provider record with this state
  const { data: providers } = await supabase
    .from('email_providers')
    .select('id, organization_id, config_json')
    .eq('provider_type', 'outlook')
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

  if (cfg.state_expires_at && new Date(cfg.state_expires_at).getTime() < Date.now()) {
    await supabase
      .from('email_providers')
      .update({ status: 'disconnected', status_message: 'OAuth session expired.' })
      .eq('id', provider.id);
    return errorRedirect(returnTo, 'OAuth session expired. Please try again.');
  }

  // Exchange code for tokens
  const redirectUri = `${appUrl}/api/email-automation/providers/microsoft/callback`;
  const tokenParams = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID ?? '',
    client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? '',
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    scope: 'openid email profile offline_access https://graph.microsoft.com/User.Read https://graph.microsoft.com/Mail.Send',
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
    const tokenRes = await fetch(MICROSOFT_TOKEN_URL, {
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
    await supabase
      .from('email_providers')
      .update({ status: 'error', status_message: 'No refresh token returned by Microsoft.' })
      .eq('id', provider.id);
    return errorRedirect(
      returnTo,
      'Microsoft did not provide a refresh token. Ensure your app registration requests offline_access scope.'
    );
  }

  // Fetch profile from Microsoft Graph
  let profileEmail = '';
  let profileName: string | null = null;

  try {
    const profileRes = await fetch(GRAPH_ME_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (profileRes.ok) {
      const profile = (await profileRes.json()) as {
        mail?: string;
        userPrincipalName?: string;
        displayName?: string;
      };
      profileEmail = profile.mail ?? profile.userPrincipalName ?? '';
      profileName = profile.displayName ?? null;
    }
  } catch {
    // Best-effort; continue without profile.
  }

  const encryptedConfig = buildOutlookConfig({
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
      display_name: profileEmail || 'Outlook / Microsoft 365',
      last_verified_at: now,
      connected_at: now,
    })
    .eq('id', provider.id);

  if (updateErr) {
    return errorRedirect(returnTo, 'Failed to save provider credentials. Please try again.');
  }

  return NextResponse.redirect(`${returnTo}?provider_connected=outlook`, 302);
}
