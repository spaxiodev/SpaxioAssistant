/**
 * Quote request confirmation email — sent to the customer after they submit a quote request.
 */

import { emailLayout, fieldRow } from '../layout';
import { escapeHtml, formatValue } from '../utils';

export interface QuoteRequestConfirmationData {
  customer_name: string;
  business_name: string | null;
  estimate_total?: number | null;
  estimate_low?: number | null;
  estimate_high?: number | null;
  currency?: string;
  form_answers?: Record<string, unknown> | null;
  language?: string;
}

function formatEstimate(data: QuoteRequestConfirmationData): string {
  const curr = data.currency ?? 'USD';
  const locale = (data.language ?? 'en') === 'fr' ? 'fr-FR' : 'en-US';
  const prefix = curr === 'USD' ? '$' : `${curr} `;
  if (data.estimate_low != null && data.estimate_high != null) {
    return `${prefix}${Number(data.estimate_low).toLocaleString(locale, { minimumFractionDigits: 2 })} – ${prefix}${Number(data.estimate_high).toLocaleString(locale, { minimumFractionDigits: 2 })}`;
  }
  if (data.estimate_total != null) {
    return `${prefix}${Number(data.estimate_total).toLocaleString(locale, { minimumFractionDigits: 2 })}`;
  }
  return '';
}

function formatFormAnswers(answers: Record<string, unknown>): string {
  return Object.entries(answers)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => {
      const label = k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const val = formatValue(v);
      return val ? `${label}: ${val}` : '';
    })
    .filter(Boolean)
    .join('\n');
}

export function renderQuoteRequestConfirmationEmail(data: QuoteRequestConfirmationData): { html: string; text: string } {
  const isFrench = (data.language ?? 'en').slice(0, 2).toLowerCase() === 'fr';
  const businessName = data.business_name ?? (isFrench ? 'notre équipe' : 'our team');

  const subject = isFrench
    ? `Merci pour votre demande de devis, ${data.customer_name} !`
    : `Thanks for your quote request, ${data.customer_name}!`;

  const intro = isFrench
    ? `Bonjour <strong>${escapeHtml(data.customer_name)}</strong>,<br><br>Nous avons bien reçu votre demande de devis et nous vous recontacterons très prochainement.`
    : `Hi <strong>${escapeHtml(data.customer_name)}</strong>,<br><br>We've received your quote request and will be in touch with you shortly.`;

  const rows: string[] = [];
  rows.push(`<tr><td style="padding:0 0 20px;font-size:15px;color:#0f172a;line-height:1.6;">${intro}</td></tr>`);

  const estimateStr = formatEstimate(data);
  if (estimateStr) {
    const estimateLabel = isFrench ? 'Votre estimation' : 'Your estimate';
    rows.push(fieldRow(estimateLabel, estimateStr));
  }

  if (data.form_answers && Object.keys(data.form_answers).length > 0) {
    const formatted = formatFormAnswers(data.form_answers);
    if (formatted) {
      const detailsLabel = isFrench ? 'Détails soumis' : 'Your submitted details';
      rows.push(`
<tr><td style="padding:12px 0 8px;font-size:14px;color:#64748b;font-weight:600;">${escapeHtml(detailsLabel)}</td></tr>
<tr><td style="padding:0 0 16px;">
  <div style="background:#f8fafc;border-radius:8px;padding:12px;font-size:14px;color:#0f172a;line-height:1.6;">
${formatted.split('\n').map((line) => `    <div style="padding:4px 0;">${escapeHtml(line)}</div>`).join('\n')}
  </div>
</td></tr>`);
    }
  }

  const closing = isFrench
    ? `<br>Si vous avez des questions, n'hésitez pas à nous contacter.<br><br>Cordialement,<br><strong>${escapeHtml(businessName)}</strong>`
    : `<br>If you have any questions in the meantime, feel free to reach out.<br><br>Best regards,<br><strong>${escapeHtml(businessName)}</strong>`;
  rows.push(`<tr><td style="padding:8px 0 0;font-size:15px;color:#0f172a;line-height:1.6;">${closing}</td></tr>`);

  const content = `<table width="100%" cellpadding="0" cellspacing="0"><tbody>${rows.join('')}</tbody></table>`;

  const footerOverride = data.business_name?.trim()
    ? data.business_name.trim()
    : isFrench
      ? 'Merci pour votre intérêt.'
      : 'Thank you for your interest.';

  const html = emailLayout({
    badge: isFrench ? 'Demande de devis' : 'Quote Request',
    title: subject,
    content,
    language: data.language,
    footerOverride,
  });

  const textParts = [
    subject,
    '',
    isFrench
      ? `Bonjour ${data.customer_name},`
      : `Hi ${data.customer_name},`,
    '',
    isFrench
      ? `Nous avons bien reçu votre demande de devis et nous vous recontacterons très prochainement.`
      : `We've received your quote request and will be in touch with you shortly.`,
  ];

  if (estimateStr) {
    textParts.push('', (isFrench ? 'Votre estimation : ' : 'Your estimate: ') + estimateStr);
  }

  if (data.form_answers && Object.keys(data.form_answers).length > 0) {
    const formatted = formatFormAnswers(data.form_answers);
    if (formatted) {
      textParts.push('', isFrench ? 'Détails soumis :' : 'Your submitted details:', formatted);
    }
  }

  textParts.push(
    '',
    isFrench
      ? `Si vous avez des questions, n'hésitez pas à nous contacter.`
      : `If you have any questions in the meantime, feel free to reach out.`,
    '',
    isFrench ? `Cordialement,` : `Best regards,`,
    businessName,
  );

  return { html, text: textParts.filter((p) => p !== null && p !== undefined).join('\n') };
}
