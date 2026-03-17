/**
 * Quote request notification email template.
 */

import { emailLayout, fieldRow } from '../layout';
import { escapeHtml, formatValue, getAppBaseUrl } from '../utils';

export interface QuoteRequestNotificationData {
  customer_name: string;
  customer_email: string;
  customer_phone?: string | null;
  requested_service?: string | null;
  estimate_total?: number | null;
  estimate_low?: number | null;
  estimate_high?: number | null;
  form_answers?: Record<string, unknown> | null;
  quote_request_id?: string | null;
  currency?: string;
}

function formatEstimate(data: QuoteRequestNotificationData): string {
  const curr = data.currency ?? 'USD';
  const prefix = curr === 'USD' ? '$' : `${curr} `;
  if (data.estimate_low != null && data.estimate_high != null) {
    return `${prefix}${Number(data.estimate_low).toLocaleString('en-US', { minimumFractionDigits: 2 })} – ${prefix}${Number(data.estimate_high).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }
  if (data.estimate_total != null) {
    return `${prefix}${Number(data.estimate_total).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
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

export function renderQuoteRequestNotificationEmail(data: QuoteRequestNotificationData): { html: string; text: string } {
  const baseUrl = getAppBaseUrl();
  const ctaUrl = `${baseUrl}/dashboard/quote-requests`;

  const rows: string[] = [];
  const addRow = (label: string, val: unknown) => {
    const v = formatValue(val);
    if (v) rows.push(fieldRow(label, v));
  };

  addRow('Customer name', data.customer_name);
  addRow('Email', data.customer_email);
  addRow('Phone', data.customer_phone);
  addRow('Requested service', data.requested_service);

  const estimateStr = formatEstimate(data);
  if (estimateStr) {
    rows.push(fieldRow('Estimate', estimateStr));
  }

  if (data.form_answers && Object.keys(data.form_answers).length > 0) {
    const formatted = formatFormAnswers(data.form_answers);
    if (formatted) {
      rows.push(`
<tr><td style="padding:12px 0 8px;font-size:14px;color:#64748b;font-weight:600;">Submitted form answers</td></tr>
<tr><td style="padding:0 0 16px;">
  <div style="background:#f8fafc;border-radius:8px;padding:12px;font-size:14px;color:#0f172a;line-height:1.6;">
${formatted.split('\n').map((line) => `    <div style="padding:4px 0;">${escapeHtml(line)}</div>`).join('\n')}
  </div>
</td></tr>`);
    }
  }

  rows.push(fieldRow('Time received', new Date().toLocaleString()));

  const content = `<table width="100%" cellpadding="0" cellspacing="0"><tbody>${rows.join('')}</tbody></table>`;

  const html = emailLayout({
    badge: 'Quote Request',
    title: `New quote request from ${escapeHtml(data.customer_name)}`,
    content,
    cta: { label: 'Open Quote Request', url: ctaUrl },
  });

  const textParts = [
    `New quote request from ${data.customer_name}`,
    '',
    'Customer name: ' + data.customer_name,
    'Email: ' + data.customer_email,
    data.customer_phone ? 'Phone: ' + data.customer_phone : '',
    data.requested_service ? 'Requested service: ' + data.requested_service : '',
    estimateStr ? 'Estimate: ' + estimateStr : '',
  ];

  if (data.form_answers && Object.keys(data.form_answers).length > 0) {
    textParts.push('', 'Submitted form answers:', formatFormAnswers(data.form_answers));
  }

  textParts.push('', 'Time received: ' + new Date().toLocaleString(), '', 'Open Quote Request: ' + ctaUrl);

  return { html, text: textParts.filter(Boolean).join('\n') };
}
