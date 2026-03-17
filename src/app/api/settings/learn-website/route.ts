import { createAdminClient } from '@/lib/supabase/admin';
import { getOrganizationId } from '@/lib/auth-server';
import { NextResponse } from 'next/server';
import { sanitizeText } from '@/lib/validation';
import { handleApiError } from '@/lib/api-error';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_BODY_BYTES = 500_000;
const MAX_LEARNED_CONTENT_CHARS = 12_000;
const LEARN_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

function isValidLearnUrl(urlStr: string): boolean {
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

function stripHtmlToText(html: string): string {
  let text = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, MAX_LEARNED_CONTENT_CHARS);
}

export async function POST(request: Request) {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    let urlInput: string | undefined =
      typeof body.url === 'string' ? body.url.trim() : undefined;

    const supabase = createAdminClient();

    if (!urlInput) {
      const { data: settings } = await supabase
        .from('business_settings')
        .select('website_url, last_learn_attempt_at')
        .eq('organization_id', organizationId)
        .single();
      urlInput = settings?.website_url ?? undefined;
    }

    if (!urlInput || !isValidLearnUrl(urlInput)) {
      return NextResponse.json(
        { error: 'Valid website URL is required. Use https:// or http:// and a non-local host.' },
        { status: 400 }
      );
    }

    const { data: settings } = await supabase
      .from('business_settings')
      .select('last_learn_attempt_at')
      .eq('organization_id', organizationId)
      .single();

    const lastAttempt = settings?.last_learn_attempt_at
      ? new Date(settings.last_learn_attempt_at).getTime()
      : 0;
    if (Date.now() - lastAttempt < LEARN_COOLDOWN_MS) {
      return NextResponse.json(
        {
          error: 'Please wait a few minutes before learning again.',
          retryAfterSeconds: Math.ceil((LEARN_COOLDOWN_MS - (Date.now() - lastAttempt)) / 1000),
        },
        { status: 429 }
      );
    }

    // Update cooldown immediately so rapid double-clicks don't double-fetch
    await supabase
      .from('business_settings')
      .update({ last_learn_attempt_at: new Date().toISOString() })
      .eq('organization_id', organizationId);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let html: string;
    try {
      const res = await fetch(urlInput, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'SpaxioBot/1.0 (Website learning for AI assistant)',
          Accept: 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        return NextResponse.json(
          { error: `Could not load the page (${res.status}). Check the URL and try again.` },
          { status: 422 }
        );
      }
      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        return NextResponse.json(
          { error: 'URL did not return HTML. Use your main website page.' },
          { status: 422 }
        );
      }
      const buf = await res.arrayBuffer();
      if (buf.byteLength > MAX_BODY_BYTES) {
        return NextResponse.json(
          { error: 'Page is too large to process. Try a simpler page URL.' },
          { status: 422 }
        );
      }
      html = new TextDecoder('utf-8', { fatal: false }).decode(buf);
    } catch (err) {
      clearTimeout(timeoutId);
      const message = err instanceof Error ? err.message : 'Request failed';
      return NextResponse.json(
        { error: message.includes('abort') ? 'Request timed out. Try again.' : `Could not fetch URL: ${message}` },
        { status: 422 }
      );
    }

    const extracted = stripHtmlToText(html);
    if (extracted.length < 100) {
      return NextResponse.json(
        { error: 'Too little text was found on the page. Try your homepage or a content-rich page.' },
        { status: 422 }
      );
    }

    const safeContent = sanitizeText(extracted, MAX_LEARNED_CONTENT_CHARS);

    const { error: updateError } = await supabase
      .from('business_settings')
      .update({
        website_learned_content: safeContent,
        website_learned_at: new Date().toISOString(),
        ...(urlInput ? { website_url: urlInput } : {}),
      })
      .eq('organization_id', organizationId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to save learned content' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      learnedLength: safeContent.length,
    });
  } catch (err) {
    return handleApiError(err, 'settings/learn-website');
  }
}

/** DELETE /api/settings/learn-website – clear website knowledge */
export async function DELETE() {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization' }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('business_settings')
      .update({
        website_learned_content: null,
        website_learned_at: null,
        website_url: null,
        last_learn_attempt_at: null,
      })
      .eq('organization_id', organizationId);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete website knowledge' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err, 'settings/learn-website/DELETE');
  }
}
