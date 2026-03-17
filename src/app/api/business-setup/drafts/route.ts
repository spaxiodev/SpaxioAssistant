/**
 * GET /api/business-setup/drafts – list drafts for the org.
 * POST /api/business-setup/drafts – create a new draft (optional source_inputs).
 */

import { NextResponse } from 'next/server';
import { requireAiSetupAccess } from '@/app/api/ai-setup/guard';
import { handleApiError } from '@/lib/api-error';
import type { SourceInputs } from '@/lib/business-setup/types';

export async function GET() {
  try {
    const access = await requireAiSetupAccess();
    if ('response' in access) return access.response;
    const { orgId, supabase } = access;

    const { data, error } = await supabase
      .from('business_setup_drafts')
      .select('id, status, current_step, created_at, updated_at, published_at')
      .eq('organization_id', orgId)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ drafts: data ?? [] });
  } catch (err) {
    return handleApiError(err, 'business-setup/drafts/GET');
  }
}

export async function POST(request: Request) {
  try {
    const access = await requireAiSetupAccess();
    if ('response' in access) return access.response;
    const { orgId, supabase } = access;

    const body = await request.json().catch(() => ({}));
    const sourceInputs = (body.source_inputs ?? {}) as Partial<SourceInputs>;

    const { data: draft, error } = await supabase
      .from('business_setup_drafts')
      .insert({
        organization_id: orgId,
        status: 'draft',
        source_inputs: sourceInputs,
      })
      .select('id, status, source_inputs, created_at, updated_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ draft });
  } catch (err) {
    return handleApiError(err, 'business-setup/drafts/POST');
  }
}
