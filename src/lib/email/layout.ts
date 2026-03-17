/**
 * Reusable email layout: light card, clean typography, Spaxio Assistant branding.
 */

import { escapeHtml } from './utils';

export interface EmailLayoutOptions {
  /** Main content HTML */
  content: string;
  /** Badge label (e.g. "New Lead", "Quote Request") */
  badge?: string;
  /** Title shown in header */
  title: string;
  /** CTA button: { label, url } */
  cta?: { label: string; url: string };
}

/** Wrap content in branded email layout. */
export function emailLayout({ content, badge, title, cta }: EmailLayoutOptions): string {
  const badgeHtml = badge
    ? `<span style="display:inline-block;padding:6px 12px;background:#f1f5f9;color:#475569;font-size:12px;font-weight:600;border-radius:6px;text-transform:uppercase;letter-spacing:0.05em;">${escapeHtml(badge)}</span>`
    : '';
  const ctaHtml = cta
    ? `<a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:14px 28px;background:#7c3aed;color:#fff!important;font-size:16px;font-weight:600;text-decoration:none;border-radius:10px;">${escapeHtml(cta.label)}</a>`
    : '';
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;min-height:100vh;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -2px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding:32px 32px 24px;">
              ${badgeHtml ? `<p style="margin:0 0 12px;">${badgeHtml}</p>` : ''}
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#0f172a;">${escapeHtml(title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;">
              ${content}
            </td>
          </tr>
          ${ctaHtml ? `
          <tr>
            <td style="padding:0 32px 32px;">
              ${ctaHtml}
            </td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#64748b;">
                Spaxio Assistant — AI website assistant for your business
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

/** Render a labeled field row. */
export function fieldRow(label: string, value: string): string {
  if (!value) return '';
  return `
<tr>
  <td style="padding:8px 0;font-size:14px;color:#64748b;">${escapeHtml(label)}</td>
</tr>
<tr>
  <td style="padding:0 0 16px;font-size:15px;color:#0f172a;line-height:1.5;">${escapeHtml(value)}</td>
</tr>`;
}
