/**
 * Email template utilities: HTML escaping, value formatting, app URL.
 */

/** Escape HTML special characters for safe output in emails. */
export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

/** Format a value for display: hide empty/null, pretty-format booleans, arrays, dates. */
export function formatValue(v: unknown): string {
  if (v == null || v === '') return '';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) return v.map((x) => formatValue(x)).filter(Boolean).join(', ') || '';
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  if (v instanceof Date) return v.toLocaleString();
  if (typeof v === 'object') return ''; // Don't dump objects
  return String(v).trim();
}

/** Get app base URL for CTA links (no trailing slash). */
export function getAppBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv && !fromEnv.includes('localhost')) {
    return fromEnv.replace(/\/$/, '');
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return 'https://app.spaxio.ai';
}
