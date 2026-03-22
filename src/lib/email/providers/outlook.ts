/**
 * Outlook / Microsoft 365 provider module.
 *
 * Handles:
 * - Token refresh via Microsoft identity platform
 * - Sending email via Microsoft Graph API (sendMail)
 * - Validating connection (fetching /me profile)
 *
 * Uses the common tenant endpoint to support both personal (Outlook.com)
 * and organizational (Microsoft 365) accounts.
 *
 * Secrets are always decrypted server-side and never logged.
 */

import { decryptSecret, encryptSecret } from '@/lib/security/secrets';
import type { SendEmailPayload, SendEmailResult, ValidateConnectionResult, ProviderRecord } from './types';

const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const GRAPH_ME_URL = 'https://graph.microsoft.com/v1.0/me';
const GRAPH_SENDMAIL_URL = 'https://graph.microsoft.com/v1.0/me/sendMail';

export interface OutlookConfig {
  access_token_enc: string;
  refresh_token_enc: string;
  token_expires_at: string;
  scope?: string;
  email: string;
  /** Transient: OAuth CSRF state (cleared after callback). */
  state?: string;
  state_expires_at?: string;
  return_to?: string;
}

function extractConfig(provider: ProviderRecord): OutlookConfig {
  const c = provider.config_json as OutlookConfig | null;
  if (!c?.access_token_enc || !c?.refresh_token_enc) {
    throw new Error('Outlook provider is missing token configuration. Please reconnect.');
  }
  return c;
}

/** Exchanges a Microsoft refresh token for a new access token. */
export async function refreshOutlookToken(refreshTokenEnc: string): Promise<{
  access_token: string;
  expires_at: string;
  refresh_token?: string;
}> {
  const refreshToken = decryptSecret(refreshTokenEnc);
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID ?? '',
    client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? '',
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    scope: 'https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read offline_access',
  });

  const res = await fetch(MICROSOFT_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    throw new Error(`Microsoft token refresh failed (${res.status}). The account may need to be reconnected.`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
  return {
    access_token: data.access_token,
    expires_at: expiresAt,
    refresh_token: data.refresh_token,
  };
}

/** Returns a valid (non-expired) access token, refreshing if needed. */
export async function getValidOutlookAccessToken(config: OutlookConfig): Promise<string> {
  const expiresAt = new Date(config.token_expires_at).getTime();
  if (Date.now() >= expiresAt - 5 * 60 * 1000) {
    const refreshed = await refreshOutlookToken(config.refresh_token_enc);
    return refreshed.access_token;
  }
  return decryptSecret(config.access_token_enc);
}

/** Sends an email via Microsoft Graph sendMail endpoint. */
export async function sendViaOutlook(
  provider: ProviderRecord,
  payload: SendEmailPayload
): Promise<SendEmailResult> {
  try {
    const config = extractConfig(provider);
    const accessToken = await getValidOutlookAccessToken(config);

    const body = {
      message: {
        subject: payload.subject,
        body: { contentType: 'HTML', content: payload.html },
        toRecipients: [
          {
            emailAddress: {
              address: payload.to,
              name: payload.toName ?? payload.to,
            },
          },
        ],
        internetMessageHeaders: [
          { name: 'X-Auto-Response-Suppress', value: 'All' },
          { name: 'Auto-Submitted', value: 'auto-replied' },
          ...(payload.inReplyTo
            ? [{ name: 'In-Reply-To', value: payload.inReplyTo }]
            : []),
          ...(payload.references?.length
            ? [{ name: 'References', value: payload.references.filter(Boolean).join(' ') }]
            : []),
        ],
      },
      saveToSentItems: true,
    };

    const res = await fetch(GRAPH_SENDMAIL_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (res.status === 202) {
      // Microsoft Graph sendMail returns 202 Accepted with no body on success
      return { success: true, messageId: null, provider: 'outlook' };
    }

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as {
        error?: { message?: string; code?: string };
      };
      const msg = err?.error?.message ?? `Graph API error ${res.status}`;
      return { success: false, error: msg, provider: 'outlook' };
    }

    return { success: true, messageId: null, provider: 'outlook' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Outlook send failed';
    return { success: false, error: message, provider: 'outlook' };
  }
}

/** Validates the Outlook connection by fetching the /me profile. */
export async function validateOutlookConnection(provider: ProviderRecord): Promise<ValidateConnectionResult> {
  try {
    const config = extractConfig(provider);
    const accessToken = await getValidOutlookAccessToken(config);

    const res = await fetch(GRAPH_ME_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      return { ok: false, error: `Unable to fetch Microsoft profile (${res.status}). Reconnect may be required.` };
    }

    const profile = (await res.json()) as {
      mail?: string;
      userPrincipalName?: string;
      displayName?: string;
    };
    const email = profile.mail ?? profile.userPrincipalName ?? '';
    return { ok: true, email, name: profile.displayName };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Outlook validation failed',
    };
  }
}

/**
 * Builds updated config_json after a successful OAuth callback.
 * Encrypts tokens before returning.
 */
export function buildOutlookConfig(params: {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
  email: string;
}): OutlookConfig {
  return {
    access_token_enc: encryptSecret(params.accessToken),
    refresh_token_enc: encryptSecret(params.refreshToken),
    token_expires_at: new Date(Date.now() + params.expiresIn * 1000).toISOString(),
    scope: params.scope,
    email: params.email,
  };
}
