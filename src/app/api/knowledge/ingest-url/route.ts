import { createAdminClient } from '@/lib/supabase/admin';
import { getOrganizationId } from '@/lib/auth-server';
import { NextResponse } from 'next/server';
import { sanitizeText } from '@/lib/validation';
import { handleApiError } from '@/lib/api-error';
import { ingestDocumentBatchEmbed } from '@/lib/knowledge/ingest';
import { canAddKnowledgeSource, canAddDocumentUpload, getPlanForOrg } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { getNextPlanSlug, normalizePlanSlug } from '@/lib/plan-config';
import { planUpgradeRequiredResponse } from '@/lib/api-plan-error';

const FETCH_TIMEOUT_MS = 15_000;
const MAX_BODY_BYTES = 500_000;
const MAX_TEXT_CHARS = 100_000;

function isValidUrl(urlStr: string): boolean {
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
  const text = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, MAX_TEXT_CHARS);
}

/**
 * POST /api/knowledge/ingest-url
 * Body: { url: string, sourceId?: string, name?: string }
 * Fetches the URL (HTML), extracts text, and ingests into knowledge. Creates a website_crawl source if sourceId not provided.
 */
export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY?.trim()) {
      return NextResponse.json(
        { error: 'Embedding service is not configured (OPENAI_API_KEY missing). Contact support.' },
        { status: 503 }
      );
    }
    const organizationId = await getOrganizationId();
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const urlInput = typeof body.url === 'string' ? body.url.trim() : '';
    const name = typeof body.name === 'string' ? sanitizeText(body.name, 500) || undefined : undefined;
    let sourceId = body.sourceId;

    if (!urlInput || !isValidUrl(urlInput)) {
      return NextResponse.json(
        { error: 'Valid URL is required (https or http, non-local in production).' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);

    if (!sourceId) {
      const allowed = await canAddKnowledgeSource(supabase, organizationId, adminAllowed);
      if (!allowed) {
        const plan = await getPlanForOrg(supabase, organizationId);
        const currentSlug = normalizePlanSlug(plan?.slug ?? 'free') ?? 'free';
        return planUpgradeRequiredResponse({
          message: 'Knowledge source limit reached. Upgrade your plan to add more sources.',
          currentPlan: currentSlug,
          requiredPlan: getNextPlanSlug(currentSlug),
          feature: 'knowledge_sources',
        });
      }
      const { data: newSource, error: createErr } = await supabase
        .from('knowledge_sources')
        .insert({
          organization_id: organizationId,
          name: name ?? `Website: ${new URL(urlInput).hostname}`,
          source_type: 'website_crawl',
          config: { url: urlInput },
        })
        .select('id')
        .single();
      if (createErr || !newSource) {
        return NextResponse.json({ error: 'Failed to create source' }, { status: 500 });
      }
      sourceId = newSource.id;
    } else {
      const { data: existing } = await supabase
        .from('knowledge_sources')
        .select('id')
        .eq('id', sourceId)
        .eq('organization_id', organizationId)
        .single();
      if (!existing) {
        return NextResponse.json({ error: 'Source not found' }, { status: 404 });
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let html: string;
    try {
      const res = await fetch(urlInput, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'SpaxioBot/1.0 (Knowledge ingestion)',
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
          { error: 'URL did not return HTML. Use a webpage URL.' },
          { status: 422 }
        );
      }
      const buf = await res.arrayBuffer();
      if (buf.byteLength > MAX_BODY_BYTES) {
        return NextResponse.json(
          { error: 'Page is too large. Try a smaller page or split content.' },
          { status: 422 }
        );
      }
      html = new TextDecoder('utf-8', { fatal: false }).decode(buf);
    } catch (err) {
      clearTimeout(timeoutId);
      const message = err instanceof Error ? err.message : 'Request failed';
      return NextResponse.json(
        {
          error: message.includes('abort')
            ? 'Request timed out. Try again.'
            : `Could not fetch URL: ${message}`,
        },
        { status: 422 }
      );
    }

    const extracted = stripHtmlToText(html);
    if (extracted.length < 50) {
      return NextResponse.json(
        { error: 'Too little text was found on the page. Try a content-rich page.' },
        { status: 422 }
      );
    }

    const safeContent = sanitizeText(extracted, MAX_TEXT_CHARS);
    const title = name ?? (new URL(urlInput).pathname || urlInput);

    const uploadAllowed = await canAddDocumentUpload(supabase, organizationId, adminAllowed);
    if (!uploadAllowed) {
      return NextResponse.json(
        { error: 'Document upload limit reached', code: 'plan_limit', message: 'Upgrade your plan to add more documents.' },
        { status: 403 }
      );
    }

    const result = await ingestDocumentBatchEmbed(supabase, {
      sourceId,
      title: title.slice(0, 500),
      content: safeContent,
      externalId: urlInput,
      metadata: { url: urlInput },
      embed: true,
    });

    await supabase
      .from('knowledge_sources')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', sourceId);

    return NextResponse.json({
      ok: true,
      sourceId,
      documentId: result.documentId,
      chunksCreated: result.chunksCreated,
      embeddingsCreated: result.embeddingsCreated,
    });
  } catch (err) {
    console.error('[API] knowledge/ingest-url', err);
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('OPENAI_API_KEY')) {
      return NextResponse.json(
        { error: 'Embedding service is not configured. Contact support.' },
        { status: 503 }
      );
    }
    if (message.includes('Invalid embedding') || message.includes('embedding')) {
      return NextResponse.json(
        { error: 'Embedding service returned an invalid response. Try again later.' },
        { status: 502 }
      );
    }
    if (message.includes('Failed to create document') || message.includes('knowledge_')) {
      return NextResponse.json(
        { error: 'Failed to save document to knowledge base. Check your plan limits or try again.' },
        { status: 500 }
      );
    }
    return handleApiError(err, 'knowledge/ingest-url');
  }
}
