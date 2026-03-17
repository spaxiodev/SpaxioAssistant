/**
 * Contact form submission email template.
 */

import { emailLayout, fieldRow } from '../layout';
import { escapeHtml, formatValue, getAppBaseUrl } from '../utils';

export interface ContactFormNotificationData {
  name: string;
  email: string;
  subject?: string | null;
  message: string;
}

export function renderContactFormNotificationEmail(data: ContactFormNotificationData): { html: string; text: string } {
  const rows: string[] = [];
  const addRow = (label: string, val: unknown) => {
    const v = formatValue(val);
    if (v) rows.push(fieldRow(label, v));
  };

  addRow('Name', data.name);
  addRow('Email', data.email);
  addRow('Subject', data.subject);
  addRow('Message', data.message);
  rows.push(fieldRow('Time received', new Date().toLocaleString()));

  const content = `<table width="100%" cellpadding="0" cellspacing="0"><tbody>${rows.join('')}</tbody></table>`;

  const title = data.subject ? `Contact form: ${escapeHtml(data.subject)}` : `Contact form message from ${escapeHtml(data.name)}`;

  const html = emailLayout({
    badge: 'Contact Form',
    title,
    content,
    cta: { label: 'Open dashboard', url: `${getAppBaseUrl()}/dashboard` },
  });

  const textLines = [
    title,
    '',
    'Name: ' + data.name,
    'Email: ' + data.email,
    data.subject ? 'Subject: ' + data.subject : '',
    '',
    'Message:',
    data.message,
    '',
    'Time received: ' + new Date().toLocaleString(),
  ].filter(Boolean);

  return { html, text: textLines.join('\n') };
}
