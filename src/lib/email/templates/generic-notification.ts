/**
 * Generic automation notification (fallback when no specific template exists).
 * Renders structured fields without dumping raw JSON.
 */

import { emailLayout, fieldRow } from '../layout';
import { escapeHtml, formatValue, getAppBaseUrl } from '../utils';
import type { AutomationRunInput } from '@/lib/automations/types';

function flattenForDisplay(obj: unknown, prefix = ''): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  if (obj == null) return out;
  if (typeof obj !== 'object') {
    const v = formatValue(obj);
    if (v) out.push([prefix, v]);
    return out;
  }
  if (Array.isArray(obj)) {
    const v = formatValue(obj);
    if (v) out.push([prefix, v]);
    return out;
  }
  const skip = new Set(['trigger_type', '__internal']);
  for (const [k, v] of Object.entries(obj)) {
    if (skip.has(k)) continue;
    const label = (prefix ? prefix + ' — ' : '') + k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    if (v != null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      out.push(...flattenForDisplay(v, label));
    } else {
      const formatted = formatValue(v);
      if (formatted) out.push([label, formatted]);
    }
  }
  return out;
}

export function renderGenericNotificationEmail(
  input: AutomationRunInput,
  options?: { automationName?: string }
): { html: string; text: string } {
  const baseUrl = getAppBaseUrl();
  const rows: string[] = [];

  const pairs = flattenForDisplay(input);
  for (const [label, value] of pairs) {
    rows.push(fieldRow(label, value));
  }

  const content = rows.length > 0
    ? `<table width="100%" cellpadding="0" cellspacing="0"><tbody>${rows.join('')}</tbody></table>`
    : '<p style="margin:0;color:#64748b;font-size:14px;">No additional details.</p>';

  const title = options?.automationName
    ? `Automation: ${escapeHtml(options.automationName)}`
    : `Automation: ${escapeHtml(input.trigger_type || 'notification')}`;

  const html = emailLayout({
    badge: 'Notification',
    title,
    content,
    cta: { label: 'Open dashboard', url: `${baseUrl}/dashboard` },
  });

  const textLines = [title, ''];
  for (const [label, value] of pairs) {
    textLines.push(`${label}: ${value}`);
  }
  textLines.push('', `Open dashboard: ${baseUrl}/dashboard`);

  return { html, text: textLines.join('\n') };
}
