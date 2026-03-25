/**
 * Email provider abstraction layer.
 *
 * Email automation now uses Resend as the only outbound provider.
 */

import { Resend } from 'resend';
import type { SendEmailPayload, SendEmailResult, ValidateConnectionResult, ProviderRecord } from './types';

export type { SendEmailPayload, SendEmailResult, ValidateConnectionResult, ProviderRecord };

// ── Outbound Send ─────────────────────────────────────────────────────────────

/**
 * Sends an email via the specified provider.
 * Provider selection is ignored; all sends are routed through Resend.
 */
export async function sendEmailViaProvider(
  _provider: ProviderRecord | null,
  payload: SendEmailPayload
): Promise<SendEmailResult> {
  return sendViaResend(payload);
}

// ── Connection Validation ─────────────────────────────────────────────────────

/** Validates an existing provider connection and returns the result. */
export async function validateProviderConnection(
  _provider: ProviderRecord
): Promise<ValidateConnectionResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'RESEND_API_KEY is not configured' };
  }

  return { ok: true, email: undefined };
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
