/**
 * Send a quote request confirmation email to the customer.
 * Fire-and-forget: call without awaiting and catch errors at call site.
 */

import { Resend } from 'resend';
import type { SupabaseClient } from '@supabase/supabase-js';
import { renderQuoteRequestConfirmationEmail } from './templates/quote-request-confirmation';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FREE_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'icloud.com'];

function getFromEmail(): string {
  const raw = process.env.RESEND_FROM_EMAIL?.trim() ?? '';
  const domain = raw.includes('@') ? raw.split('@')[1]?.toLowerCase() ?? '' : '';
  const isFree = FREE_EMAIL_DOMAINS.some((d) => domain === d || domain.endsWith('.' + d));
  return raw && !isFree ? raw : 'Spaxio Assistant <onboarding@resend.dev>';
}

export interface SendQuoteConfirmationParams {
  supabase: SupabaseClient;
  organizationId: string;
  customerName: string;
  customerEmail: string;
  estimateTotal?: number | null;
  estimateLow?: number | null;
  estimateHigh?: number | null;
  currency?: string;
  formAnswers?: Record<string, unknown> | null;
  language?: string;
}

export async function sendQuoteRequestConfirmation(params: SendQuoteConfirmationParams): Promise<void> {
  const {
    supabase,
    organizationId,
    customerName,
    customerEmail,
    estimateTotal,
    estimateLow,
    estimateHigh,
    currency,
    formAnswers,
    language,
  } = params;

  if (!EMAIL_RE.test(customerEmail.trim())) return;

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  const { data: settings } = await supabase
    .from('business_settings')
    .select('business_name')
    .eq('organization_id', organizationId)
    .maybeSingle();

  const businessName = typeof settings?.business_name === 'string' ? settings.business_name : null;

  const { html, text } = renderQuoteRequestConfirmationEmail({
    customer_name: customerName,
    business_name: businessName,
    estimate_total: estimateTotal ?? null,
    estimate_low: estimateLow ?? null,
    estimate_high: estimateHigh ?? null,
    currency,
    form_answers: formAnswers ?? null,
    language,
  });

  const isFrench = (language ?? 'en').slice(0, 2).toLowerCase() === 'fr';
  const subject = isFrench
    ? `Merci pour votre demande de devis, ${customerName} !`
    : `Thanks for your quote request, ${customerName}!`;

  const resend = new Resend(resendKey);
  await resend.emails.send({
    from: getFromEmail(),
    to: [customerEmail.trim()],
    subject,
    html,
    text,
  });
}
