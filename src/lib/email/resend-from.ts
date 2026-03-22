/**
 * Build Resend "from" for tenant → customer mail: use the business display name from settings
 * with the verified address from RESEND_FROM_EMAIL (address only; display name comes from settings).
 */

const FREE_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'icloud.com'];

function extractBareEmail(raw: string): string {
  const trimmed = raw.trim();
  const m = trimmed.match(/<([^>]+)>/);
  return (m ? m[1] : trimmed).trim();
}

function isFreeEmailDomain(domain: string): boolean {
  return FREE_EMAIL_DOMAINS.some((d) => domain === d || domain.endsWith('.' + d));
}

function sanitizeDisplayName(name: string): string {
  return name
    .replace(/[\r\n<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 78);
}

/**
 * @param displayName - `business_settings.business_name` (optional). When empty, returns bare email only.
 */
export function resolveTenantOutboundFromAddress(displayName: string | null | undefined): string {
  const raw = process.env.RESEND_FROM_EMAIL?.trim() ?? '';
  const bare = extractBareEmail(raw);
  const domain = bare.includes('@') ? (bare.split('@')[1]?.toLowerCase() ?? '') : '';
  const isFree = domain ? isFreeEmailDomain(domain) : true;
  const address = raw && !isFree ? bare : 'onboarding@resend.dev';

  const label = typeof displayName === 'string' ? sanitizeDisplayName(displayName) : '';
  if (label) return `${label} <${address}>`;
  return address;
}
