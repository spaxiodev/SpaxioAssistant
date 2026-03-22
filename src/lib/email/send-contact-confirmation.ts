/**
 * Send a confirmation email to the visitor after the marketing contact form is submitted.
 */

import { Resend } from 'resend';
import { renderContactFormConfirmationEmail } from './templates/contact-form-confirmation';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FREE_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'icloud.com'];

function getFromEmail(): string {
  const raw = process.env.RESEND_FROM_EMAIL?.trim() ?? '';
  const domain = raw.includes('@') ? raw.split('@')[1]?.toLowerCase() ?? '' : '';
  const isFree = FREE_EMAIL_DOMAINS.some((d) => domain === d || domain.endsWith('.' + d));
  return raw && !isFree ? raw : 'Spaxio Assistant <onboarding@resend.dev>';
}

export async function sendContactFormConfirmation(params: {
  name: string;
  email: string;
  language: string;
}): Promise<void> {
  const { name, email, language } = params;
  if (!EMAIL_RE.test(email.trim())) return;

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  const { html, text } = renderContactFormConfirmationEmail({ name, language });

  const isFrench = language.slice(0, 2).toLowerCase() === 'fr';
  const subject = isFrench ? `Nous avons bien reçu votre message, ${name} !` : `We received your message, ${name}!`;

  const resend = new Resend(resendKey);
  await resend.emails.send({
    from: getFromEmail(),
    to: [email.trim()],
    subject,
    html,
    text,
  });
}
