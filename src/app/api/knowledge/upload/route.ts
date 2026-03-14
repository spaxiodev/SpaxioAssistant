import { createAdminClient } from '@/lib/supabase/admin';
import { getOrganizationId } from '@/lib/auth-server';
import { NextResponse } from 'next/server';
import { sanitizeText } from '@/lib/validation';
import { handleApiError } from '@/lib/api-error';
import { ingestDocumentBatchEmbed } from '@/lib/knowledge/ingest';
import { isUuid, normalizeUuid } from '@/lib/validation';
import { canAddDocumentUpload } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';

const MAX_CONTENT_LENGTH = 500_000;

/**
 * POST /api/knowledge/upload
 * Body (JSON): { sourceId: string, title?: string, content: string, embed?: boolean }
 * Or multipart: sourceId, title, file (text/plain or PDF - PDF parsed as text if parser available).
 * Ingests content into the knowledge base: creates document, chunks, and optionally embeddings.
 */
export async function POST(request: Request) {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const contentType = request.headers.get('content-type') ?? '';
    let sourceId: string;
    let title: string | null = null;
    let content = '';
    let embed = true;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const rawSourceId = formData.get('sourceId');
      sourceId = rawSourceId ? normalizeUuid(String(rawSourceId)) : '';
      const titleVal = formData.get('title');
      title = titleVal != null ? sanitizeText(String(titleVal), 500) || null : null;
      const file = formData.get('file') as File | null;
      const contentVal = formData.get('content');
      if (file) {
        const text = await file.text();
        content = text.slice(0, MAX_CONTENT_LENGTH);
      } else if (contentVal != null) {
        content = String(contentVal).slice(0, MAX_CONTENT_LENGTH);
      }
    } else {
      const body = await request.json().catch(() => ({}));
      const rawSourceId = body.sourceId;
      sourceId = rawSourceId ? normalizeUuid(String(rawSourceId)) : '';
      title = typeof body.title === 'string' ? sanitizeText(body.title, 500) || null : null;
      content = typeof body.content === 'string' ? body.content.slice(0, MAX_CONTENT_LENGTH) : '';
      embed = body.embed !== false;
    }

    if (!sourceId || !isUuid(sourceId)) {
      return NextResponse.json({ error: 'Valid sourceId is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: source } = await supabase
      .from('knowledge_sources')
      .select('id, organization_id')
      .eq('id', sourceId)
      .eq('organization_id', organizationId)
      .single();

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
    const allowed = await canAddDocumentUpload(supabase, organizationId, adminAllowed);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Document upload limit reached', code: 'plan_limit', message: 'Upgrade your plan to upload more documents.' },
        { status: 403 }
      );
    }

    const result = await ingestDocumentBatchEmbed(supabase, {
      sourceId,
      title,
      content: content.trim(),
      embed,
    });

    await supabase
      .from('knowledge_sources')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', sourceId);

    return NextResponse.json({
      ok: true,
      documentId: result.documentId,
      chunksCreated: result.chunksCreated,
      embeddingsCreated: result.embeddingsCreated,
    });
  } catch (err) {
    console.error('[API] knowledge/upload', err);
    return handleApiError(err, 'knowledge/upload');
  }
}
