/**
 * Gmail / Google Workspace provider module.
 *
 * Handles:
 * - Token refresh (access tokens expire after 1 hour)
 * - Sending email via Gmail API (users.messages.send)
 * - Validating connection (fetching OAuth profile)
 *
 * Secrets are always decrypted server-side and never logged.
 */

import { decryptSecret, encryptSecret, redactSecret } from '@/lib/security/secrets';
import type { SendEmailPayload, SendEmailResult, ValidateConnectionResult, ProviderRecord } from './types';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

export interface GmailConfig {
  /** AES-256-GCM encrypted access token. */
  access_token_enc: string;
  /** AES-256-GCM encrypted refresh token. */
  refresh_token_enc: string;
  /** ISO-8601 timestamp when the access token expires. */
  token_expires_at: string;
  /** OAuth scopes granted. */
  scope?: string;
  /** Connected email address (plain, safe to display). */
  email: string;
  /** Transient: OAuth CSRF state (cleared after callback). */
  state?: string;
  /** Transient: state expiry (cleared after callback). */
  state_expires_at?: string;
  /** URL to redirect to after OAuth completes. */
  return_to?: string;
}

function extractConfig(provider: ProviderRecord): GmailConfig {
  const c = provider.config_json as GmailConfig | null;
  if (!c?.access_token_enc || !c?.refresh_token_enc) {
    throw new Error('Gmail provider is missing token configuration. Please reconnect.');
  }
  return c;
}

/**
 * Exchanges a refresh token for a new access token.
 * Throws on failure (token revoked, client ID/secret misconfigured, etc.).
 */
export async function refreshGmailToken(refreshTokenEnc: string): Promise<{
  access_token: string;
  expires_at: string;
}> {
  const refreshToken = decryptSecret(refreshTokenEnc);
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    // Do NOT log the body — it may contain token details.
    throw new Error(`Gmail token refresh failed (${res.status}). The account may need to be reconnected.`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
  return { access_token: data.access_token, expires_at: expiresAt };
}

/**
 * Returns a valid (non-expired) access token, refreshing if needed.
 * Returns the decrypted access token — keep it in memory only, never store plaintext.
 */
export async function getValidGmailAccessToken(config: GmailConfig): Promise<string> {
  const expiresAt = new Date(config.token_expires_at).getTime();
  if (Date.now() >= expiresAt - 5 * 60 * 1000) {
    const refreshed = await refreshGmailToken(config.refresh_token_enc);
    return refreshed.access_token;
  }
  return decryptSecret(config.access_token_enc);
}

/**
 * Builds an RFC 2822-compliant raw message for the Gmail API.
 */
function buildRawMessage(params: {
  from: string;
  to: string;
  toName: string | null;
  subject: string;
  html: string;
  inReplyTo?: string | null;
  references?: string[] | null;
}): string {
  const toHeader = params.toName
    ? `"${params.toName.replace(/"/g, '')}" <${params.to}>`
    : params.to;

  const lines: string[] = [
    `From: ${params.from}`,
    `To: ${toHeader}`,
    `Subject: ${params.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    'X-Auto-Response-Suppress: All',
    'Auto-Submitted: auto-replied',
  ];

  if (params.inReplyTo) lines.push(`In-Reply-To: ${params.inReplyTo}`);
  if (params.references?.length) lines.push(`References: ${params.references.filter(Boolean).join(' ')}`);

  lines.push('', params.html);
  return lines.join('\r\n');
}

/** Sends an email via the Gmail API using the connected account's tokens. */
export async function sendViaGmail(
  provider: ProviderRecord,
  payload: SendEmailPayload
): Promise<SendEmailResult> {
  try {
    const config = extractConfig(provider);
    const accessToken = await getValidGmailAccessToken(config);

    const raw = buildRawMessage({
      from: config.email,
      to: payload.to,
      toName: payload.toName,
      subject: payload.subject,
      html: payload.html,
      inReplyTo: payload.inReplyTo,
      references: payload.references,
    });

    const encoded = Buffer.from(raw).toString('base64url');

    const res = await fetch(GMAIL_SEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encoded }),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      const msg = err?.error?.message ?? `Gmail API error ${res.status}`;
      return { success: false, error: msg, provider: 'gmail' };
    }

    const data = (await res.json()) as { id?: string };
    return { success: true, messageId: data.id ?? null, provider: 'gmail' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gmail send failed';
    return { success: false, error: message, provider: 'gmail' };
  }
}

/** Validates the Gmail connection by fetching the OAuth profile. */
export async function validateGmailConnection(provider: ProviderRecord): Promise<ValidateConnectionResult> {
  try {
    const config = extractConfig(provider);
    const accessToken = await getValidGmailAccessToken(config);

    const res = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      return { ok: false, error: `Unable to fetch Google profile (${res.status}). Reconnect may be required.` };
    }

    const profile = (await res.json()) as { email?: string; name?: string };
    return { ok: true, email: profile.email, name: profile.name };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Gmail validation failed',
    };
  }
}

/**
 * Builds updated config_json after a successful OAuth callback.
 * Encrypts tokens before returning.
 */
export function buildGmailConfig(params: {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
  email: string;
}): GmailConfig {
  return {
    access_token_enc: encryptSecret(params.accessToken),
    refresh_token_enc: encryptSecret(params.refreshToken),
    token_expires_at: new Date(Date.now() + params.expiresIn * 1000).toISOString(),
    scope: params.scope,
    email: params.email,
  };
}

// Export redactSecret re-export for use in routes without importing security directly.
export { redactSecret };
