/**
 * Confirmation email sent to the visitor after submitting the marketing contact form.
 */

import { emailLayout } from '../layout';
import { escapeHtml } from '../utils';

export interface ContactFormConfirmationData {
  name: string;
  language?: string;
}

export function renderContactFormConfirmationEmail(data: ContactFormConfirmationData): { html: string; text: string } {
  const isFrench = (data.language ?? 'en').slice(0, 2).toLowerCase() === 'fr';

  const title = isFrench
    ? `Nous avons bien reçu votre message, ${data.name} !`
    : `We received your message, ${data.name}!`;

  const intro = isFrench
    ? `Bonjour <strong>${escapeHtml(data.name)}</strong>,<br><br>Merci d'avoir contacté Spaxio. Nous avons bien reçu votre message et nous vous répondrons dès que possible.`
    : `Hi <strong>${escapeHtml(data.name)}</strong>,<br><br>Thanks for reaching out to Spaxio. We've received your message and will get back to you as soon as we can.`;

  const closing = isFrench
    ? `Si vous avez une question urgente, vous pouvez répondre à cet e-mail.<br><br>Cordialement,<br><strong>L'équipe Spaxio</strong>`
    : `If you need anything urgent, just reply to this email.<br><br>Best regards,<br><strong>The Spaxio team</strong>`;

  const rows: string[] = [];
  rows.push(`<tr><td style="padding:0 0 20px;font-size:15px;color:#0f172a;line-height:1.6;">${intro}</td></tr>`);
  rows.push(`<tr><td style="padding:8px 0 0;font-size:15px;color:#0f172a;line-height:1.6;">${closing}</td></tr>`);

  const content = `<table width="100%" cellpadding="0" cellspacing="0"><tbody>${rows.join('')}</tbody></table>`;

  const html = emailLayout({
    badge: isFrench ? 'Message reçu' : 'Message received',
    title,
    content,
    language: data.language,
  });

  const text = [
    title,
    '',
    isFrench
      ? `Bonjour ${data.name},\n\nMerci d'avoir contacté Spaxio. Nous avons bien reçu votre message et nous vous répondrons dès que possible.\n\nSi vous avez une question urgente, vous pouvez répondre à cet e-mail.\n\nCordialement,\nL'équipe Spaxio`
      : `Hi ${data.name},\n\nThanks for reaching out to Spaxio. We've received your message and will get back to you as soon as we can.\n\nIf you need anything urgent, just reply to this email.\n\nBest regards,\nThe Spaxio team`,
  ].join('\n');

  return { html, text };
}
