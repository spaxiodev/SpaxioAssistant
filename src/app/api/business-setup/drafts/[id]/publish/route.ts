/**
 * POST /api/business-setup/drafts/[id]/publish – publish approved sections to live config.
 * Body: { sections?: DraftSectionKey[] } – if omitted, uses section_approvals (approved/edited).
 */

import { NextResponse } from 'next/server';
import { requireAiSetupAccess } from '@/app/api/ai-setup/guard';
import { handleApiError } from '@/lib/api-error';
import { getSectionsToPublish, applyBusinessSetupDraft } from '@/lib/business-setup/apply-business-setup-service';
import type { BusinessSetupDraftRow, DraftSectionKey, SectionApprovals } from '@/lib/business-setup/types';
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

    const rl = rateLimit({ key: `business-setup-publish:${orgId}`, limit: 5, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many publish attempts', code: 'rate_limit' }, { status: 429 });
    }

    const { data: draft, error: fetchError } = await supabase
      .from('business_setup_drafts')
      .select('*')
      .eq('id', draftId)
      .eq('organization_id', orgId)
      .single();

    if (fetchError || !draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }
    if (draft.status !== 'ready' && draft.status !== 'draft' && draft.status !== 'partially_published') {
      return NextResponse.json(
        { error: 'Draft must be in ready or draft status with extracted data to publish' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    let sectionsToPublish: DraftSectionKey[];
    if (Array.isArray(body.sections) && body.sections.length > 0) {
      const allowed: DraftSectionKey[] = [
        'business_profile',
        'services',
        'knowledge',
        'pricing',
        'agents',
        'automations',
        'widget_config',
        'ai_pages',
        'branding',
      ];
      sectionsToPublish = body.sections.filter((s: string) => allowed.includes(s as DraftSectionKey));
    } else {
      const approvals = (draft.section_approvals ?? {}) as SectionApprovals;
      sectionsToPublish = getSectionsToPublish(approvals);
    }

    if (sectionsToPublish.length === 0) {
      return NextResponse.json(
        { error: 'No sections approved for publish. Approve or select sections first.' },
        { status: 400 }
      );
    }

    const draftRow = draft as unknown as BusinessSetupDraftRow;
    const result = await applyBusinessSetupDraft(supabase, draftRow, sectionsToPublish);

    const newStatus =
      result.success && sectionsToPublish.length >= 9
        ? 'published'
        : result.success
          ? 'partially_published'
          : draft.status;
    const publishedAt = result.success && (newStatus === 'published' || newStatus === 'partially_published')
      ? new Date().toISOString()
      : draft.published_at;

    await supabase
      .from('business_setup_drafts')
      .update({
        status: newStatus,
        published_at: publishedAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', draftId)
      .eq('organization_id', orgId);

    return NextResponse.json({
      success: result.success,
      sections: result.sections,
      errors: result.errors,
      published_at: publishedAt,
    });
  } catch (err) {
    return handleApiError(err, 'business-setup/drafts/[id]/publish/POST');
  }
}
