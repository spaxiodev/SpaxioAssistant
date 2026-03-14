/**
 * Public URL of this app (where the widget script and dashboard are served).
 * Used for the embed script, install page script tag, and widget iframe.
 *
 * Set NEXT_PUBLIC_APP_URL in production (e.g. https://spaxioassistant.com).
 * When not set, we use the request's host so the widget works at your actual domain.
 */
function isProductionHost(host: string): boolean {
  if (!host || host.includes('localhost') || host.startsWith('127.')) return false;
  return true;
}

export function getPublicAppUrl(options?: { request?: Request; headers?: Headers }): string {
  // Prefer the actual request host so the widget uses the same origin as the page (avoids CORS and postMessage origin mismatch for www vs non-www).
  if (options?.request) {
    try {
      const url = new URL(options.request.url);
      if (isProductionHost(url.host)) {
        return url.origin;
      }
    } catch {
      // ignore
    }
  }

  if (options?.headers) {
    const host = options.headers.get('host')?.trim();
    const proto = options.headers.get('x-forwarded-proto')?.trim() || 'https';
    if (host) {
      const scheme = proto === 'https' ? 'https' : 'http';
      return `${scheme}://${host}`.replace(/\/$/, '');
    }
  }

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
