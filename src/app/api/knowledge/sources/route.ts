import { createAdminClient } from '@/lib/supabase/admin';
import { getOrganizationId } from '@/lib/auth-server';
import { NextResponse } from 'next/server';
import { sanitizeText } from '@/lib/validation';
import { handleApiError } from '@/lib/api-error';
import { canAddKnowledgeSource } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';

/** GET /api/knowledge/sources - list knowledge sources for the organization */
export async function GET() {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('knowledge_sources')
      .select('id, name, source_type, config, last_synced_at, created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API] knowledge/sources GET', error);
      return NextResponse.json({ error: 'Failed to list sources' }, { status: 500 });
    }
    return NextResponse.json({ sources: data ?? [] });
  } catch (err) {
    return handleApiError(err, 'knowledge/sources/GET');
  }
}

/** POST /api/knowledge/sources - create a knowledge source */
export async function POST(request: Request) {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const supabase = createAdminClient();
    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
    const allowed = await canAddKnowledgeSource(supabase, organizationId, adminAllowed);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Knowledge source limit reached', code: 'plan_limit', message: 'Upgrade your plan to add more knowledge sources.' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const name = sanitizeText(body.name, 500) || 'Untitled source';
    const sourceType = [
      'website_crawl',
      'manual_text',
      'pdf_upload',
      'docx_upload',
      'pasted_content',
      'notion_link',
      'custom',
    ].includes(body.source_type)
      ? body.source_type
      : 'manual_text';
    const config = body.config != null && typeof body.config === 'object' ? body.config : {};

    const { data: source, error } = await supabase
      .from('knowledge_sources')
      .insert({
        organization_id: organizationId,
        name,
        source_type: sourceType,
        config,
      })
      .select()
      .single();

    if (error) {
      console.error('[API] knowledge/sources POST', error);
      return NextResponse.json({ error: 'Failed to create source' }, { status: 500 });
    }
    return NextResponse.json(source);
  } catch (err) {
    return handleApiError(err, 'knowledge/sources/POST');
  }
}
