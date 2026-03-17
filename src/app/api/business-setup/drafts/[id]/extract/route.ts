/**
 * POST /api/business-setup/drafts/[id]/extract – run AI extraction for this draft.
 * Body: { source_inputs?: SourceInputs }. Uses draft's source_inputs if not provided.
 */

import { NextResponse } from 'next/server';
import { requireAiSetupAccess } from '@/app/api/ai-setup/guard';
import { handleApiError } from '@/lib/api-error';
import { runBusinessSetupExtraction } from '@/lib/business-setup/ai-business-setup-service';
import type { SourceInputs } from '@/lib/business-setup/types';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireAiSetupAccess();
    if ('response' in access) return access.response;
    const { orgId, supabase } = access;
    const { id: draftId } = await context.params;

    const rl = rateLimit({ key: `business-setup-extract:${orgId}`, limit: 10, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many extraction requests', code: 'rate_limit' }, { status: 429 });
    }

    const { data: draft, error: fetchError } = await supabase
      .from('business_setup_drafts')
      .select('id, organization_id, status, source_inputs')
      .eq('id', draftId)
      .eq('organization_id', orgId)
      .single();

    if (fetchError || !draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }
    if (draft.status === 'extracting') {
      return NextResponse.json({ error: 'Extraction already in progress', status: 'extracting' }, { status: 409 });
    }

    const body = await request.json().catch(() => ({}));
    const sourceInputs: SourceInputs = (body.source_inputs ?? draft.source_inputs ?? {}) as SourceInputs;

    const result = await runBusinessSetupExtraction(supabase, {
      draftId,
      organizationId: orgId,
      sourceInputs,
      onStep: async (step) => {
        await supabase
          .from('business_setup_drafts')
          .update({ current_step: step, updated_at: new Date().toISOString() })
          .eq('id', draftId)
          .eq('organization_id', orgId);
      },
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? 'Extraction failed', success: false },
        { status: 422 }
      );
    }

    const { data: updated } = await supabase
      .from('business_setup_drafts')
      .select('id, status, current_step, extracted_business_profile, extracted_services, extracted_knowledge, extracted_pricing, extracted_agents, extracted_automations, extracted_widget_config, extracted_ai_pages, extracted_branding, assumptions, missing_items, confidence_scores')
      .eq('id', draftId)
      .eq('organization_id', orgId)
      .single();

    return NextResponse.json({ success: true, draft: updated });
  } catch (err) {
    return handleApiError(err, 'business-setup/drafts/[id]/extract/POST');
  }
}
