/**
 * New lead notification email template.
 */

import { emailLayout, fieldRow } from '../layout';
import { escapeHtml, formatValue, getAppBaseUrl } from '../utils';
import type { AutomationRunInput } from '@/lib/automations/types';

export interface LeadNotificationData {
  name: string;
  email: string;
  phone?: string | null;
  message?: string | null;
  source?: string | null;
  requested_service?: string | null;
  requested_timeline?: string | null;
  project_details?: string | null;
  location?: string | null;
  transcript_snippet?: string | null;
  conversation_id?: string | null;
  lead_id?: string | null;
  business_name?: string | null;
}

export function renderLeadNotificationEmail(data: LeadNotificationData): { html: string; text: string } {
  const baseUrl = getAppBaseUrl();
  const ctaUrl = `${baseUrl}/dashboard/leads`;

  const rows: string[] = [];
  const addRow = (label: string, val: unknown) => {
    const v = formatValue(val);
    if (v) rows.push(fieldRow(label, v));
  };

  addRow('Name', data.name);
  addRow('Email', data.email);
  addRow('Phone', data.phone);
  addRow('Message', data.message);
  addRow('Source', data.source ?? 'Website widget');
  addRow('Requested service', data.requested_service);
  addRow('Requested timeline', data.requested_timeline);
  addRow('Project details', data.project_details);
  addRow('Location', data.location);
  if (data.transcript_snippet) {
    rows.push(`
<tr><td style="padding:8px 0;font-size:14px;color:#64748b;">Transcript snippet</td></tr>
<tr><td style="padding:0 0 16px;font-size:15px;color:#0f172a;line-height:1.5;background:#f8fafc;border-radius:8px;padding:12px;">${escapeHtml(String(data.transcript_snippet))}</td></tr>`);
  }
  rows.push(fieldRow('Time received', new Date().toLocaleString()));

  const content = `<table width="100%" cellpadding="0" cellspacing="0"><tbody>${rows.join('')}</tbody></table>`;

  const html = emailLayout({
    badge: 'New Lead',
    title: `New lead from ${data.business_name || 'your website'}: ${escapeHtml(data.name)}`,
    content,
    cta: { label: 'View in Spaxio Assistant', url: ctaUrl },
  });

  const textLines = [
    `New lead from ${data.business_name || 'your website'}: ${data.name}`,
    '',
    'Name: ' + data.name,
    'Email: ' + data.email,
    data.phone ? 'Phone: ' + data.phone : '',
    data.message ? 'Message: ' + data.message : '',
    'Source: ' + (data.source || 'Website widget'),
    data.requested_service ? 'Requested service: ' + data.requested_service : '',
    data.requested_timeline ? 'Requested timeline: ' + data.requested_timeline : '',
    data.project_details ? 'Project details: ' + data.project_details : '',
    data.location ? 'Location: ' + data.location : '',
    data.transcript_snippet ? 'Transcript snippet: ' + data.transcript_snippet : '',
    '',
    'Time received: ' + new Date().toLocaleString(),
    '',
    'View in Spaxio Assistant: ' + ctaUrl,
  ].filter(Boolean);

  return { html, text: textLines.join('\n') };
}

/** Build lead data from automation run input. */
export function leadDataFromInput(input: AutomationRunInput, businessName?: string): LeadNotificationData {
  const lead = input.lead ?? {};
  return {
    name: formatValue(lead.name) || '—',
    email: formatValue(lead.email) || '—',
    phone: lead.phone ?? null,
    message: lead.message ?? null,
    source: (input.source as string) ?? 'Website widget',
    requested_service: (input.requested_service as string) ?? (lead as Record<string, unknown>).requested_service ?? null,
    requested_timeline: (input.requested_timeline as string) ?? (lead as Record<string, unknown>).requested_timeline ?? null,
    project_details: (input.project_details as string) ?? (lead as Record<string, unknown>).project_details ?? null,
    location: (input.location as string) ?? (lead as Record<string, unknown>).location ?? null,
    transcript_snippet: (input.transcript_snippet as string) ?? (lead as Record<string, unknown>).transcript_snippet ?? null,
    conversation_id: input.conversation_id ?? null,
    lead_id: input.lead_id as string ?? null,
    business_name: businessName ?? null,
  };
}
