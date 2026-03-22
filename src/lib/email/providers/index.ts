/**
 * Email provider abstraction layer.
 *
 * Routes outbound email sending through the correct provider implementation
 * based on the provider_type stored in the email_providers table.
 *
 * Falls back to Resend when:
 * - The provider type is 'resend' or 'webhook_inbound'
 * - No provider is specified
 * - The provider record lacks required credentials
 */

import { Resend } from 'resend';
import { sendViaGmail, validateGmailConnection } from './gmail';
import { sendViaOutlook, validateOutlookConnection } from './outlook';
import { sendViaSmtp, validateImapConnection } from './imap';
import type { SendEmailPayload, SendEmailResult, ValidateConnectionResult, ProviderRecord } from './types';

export type { SendEmailPayload, SendEmailResult, ValidateConnectionResult, ProviderRecord };

// ── Outbound Send ─────────────────────────────────────────────────────────────

/**
 * Sends an email via the specified provider.
 * If provider is null / not connected, falls back to Resend (existing behaviour).
 */
export async function sendEmailViaProvider(
  provider: ProviderRecord | null,
  payload: SendEmailPayload
): Promise<SendEmailResult> {
  if (!provider) return sendViaResend(payload);

  switch (provider.provider_type) {
    case 'gmail':
      return sendViaGmail(provider, payload);
    case 'outlook':
      return sendViaOutlook(provider, payload);
    case 'imap':
      return sendViaSmtp(provider, payload);
    case 'resend':
    case 'webhook_inbound':
    default:
      return sendViaResend(payload);
  }
}

// ── Connection Validation ─────────────────────────────────────────────────────

/** Validates an existing provider connection and returns the result. */
export async function validateProviderConnection(
  provider: ProviderRecord
): Promise<ValidateConnectionResult> {
  switch (provider.provider_type) {
    case 'gmail':
      return validateGmailConnection(provider);
    case 'outlook':
      return validateOutlookConnection(provider);
    case 'imap':
      return validateImapConnection(provider);
    case 'resend':
      // Resend does not need per-provider validation — the API key is global.
      return { ok: true, email: undefined };
    case 'webhook_inbound':
      // Webhook providers are always "connected" once created.
      return { ok: true, email: undefined };
    default:
      return { ok: false, error: `Unknown provider type: ${provider.provider_type}` };
  }
}

// ── Resend fallback ───────────────────────────────────────────────────────────

async function sendViaResend(payload: SendEmailPayload): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'RESEND_API_KEY is not configured', provider: 'resend' };
  }

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: getResendFromEmail(),
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
      text: payload.text ?? undefined,
      headers: {
        'X-Auto-Response-Suppress': 'All',
        'Auto-Submitted': 'auto-replied',
        'In-Reply-To': payload.inReplyTo ?? '',
        References: payload.references?.filter(Boolean).join(' ') ?? '',
      },
    });
    return { success: true, messageId: result.data?.id ?? null, provider: 'resend' };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Resend send failed',
      provider: 'resend',
    };
  }
}

function getResendFromEmail(): string {
  const raw = process.env.RESEND_FROM_EMAIL ?? '';
  const freeEmailDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'icloud.com'];
  const fromDomain = raw.includes('@') ? raw.split('@')[1]?.toLowerCase() : '';
  const isFreeEmail = freeEmailDomains.some((d) => fromDomain === d || fromDomain?.endsWith('.' + d));
  return raw && !isFreeEmail ? raw : 'Spaxio Assistant <onboarding@resend.dev>';
}
