/**
 * Public URL of this app (where the widget script and dashboard are served).
 * Used for the embed script, install page script tag, and widget iframe.
 *
 * Set NEXT_PUBLIC_APP_URL in production (e.g. https://app.spaxio.ai or your Vercel URL).
 * On Vercel, if unset we fall back to https://${VERCEL_URL}.
 */
export function getPublicAppUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv && !fromEnv.includes('localhost')) {
    return fromEnv.replace(/\/$/, '');
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel}`;
  }
  return 'https://app.spaxio.ai';
}
