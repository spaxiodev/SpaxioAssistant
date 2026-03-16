/**
 * Fetch website HTML and extract plain text (same semantics as learn-website).
 */

const FETCH_TIMEOUT_MS = 15_000;
const MAX_BODY_BYTES = 500_000;
const MAX_TEXT_CHARS = 50_000;

export function isValidSetupUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  const s = urlStr.trim();
  if (s.length > 2000) return false;
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('0.0.0.0')) {
      if (process.env.NODE_ENV === 'production') return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function stripHtmlToText(html: string): string {
  const text = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, MAX_TEXT_CHARS);
}

export async function fetchWebsiteText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SpaxioBot/1.0 (Website learning for AI assistant)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      throw new Error('URL did not return HTML');
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BODY_BYTES) throw new Error('Page too large');
    const html = new TextDecoder('utf-8', { fatal: false }).decode(buf);
    const extracted = stripHtmlToText(html);
    if (extracted.length < 100) throw new Error('Too little text on page');
    return extracted;
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}
