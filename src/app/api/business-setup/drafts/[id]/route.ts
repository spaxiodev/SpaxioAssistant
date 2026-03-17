/**
 * GET /api/business-setup/drafts/[id] – get one draft with all sections.
 * PATCH /api/business-setup/drafts/[id] – update draft (source_inputs, section_approvals, or extracted section overrides).
 */

import { NextResponse } from 'next/server';
import { requireAiSetupAccess } from '@/app/api/ai-setup/guard';
import { handleApiError } from '@/lib/api-error';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireAiSetupAccess();
    if ('response' in access) return access.response;
    const { orgId, supabase } = access;
    const { id } = await context.params;

    const { data, error } = await supabase
      .from('business_setup_drafts')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }
    return NextResponse.json({ draft: data });
  } catch (err) {
    return handleApiError(err, 'business-setup/drafts/[id]/GET');
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireAiSetupAccess();
    if ('response' in access) return access.response;
    const { orgId, supabase } = access;
    const { id } = await context.params;

    const body = await request.json().catch(() => ({}));
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (body.source_inputs !== undefined) updates.source_inputs = body.source_inputs;
    if (body.section_approvals !== undefined) updates.section_approvals = body.section_approvals;
    if (body.extracted_business_profile !== undefined) updates.extracted_business_profile = body.extracted_business_profile;
    if (body.extracted_services !== undefined) updates.extracted_services = body.extracted_services;
    if (body.extracted_knowledge !== undefined) updates.extracted_knowledge = body.extracted_knowledge;
    if (body.extracted_pricing !== undefined) updates.extracted_pricing = body.extracted_pricing;
    if (body.extracted_agents !== undefined) updates.extracted_agents = body.extracted_agents;
    if (body.extracted_automations !== undefined) updates.extracted_automations = body.extracted_automations;
    if (body.extracted_widget_config !== undefined) updates.extracted_widget_config = body.extracted_widget_config;
    if (body.extracted_ai_pages !== undefined) updates.extracted_ai_pages = body.extracted_ai_pages;
    if (body.extracted_branding !== undefined) updates.extracted_branding = body.extracted_branding;

    const { data, error } = await supabase
      .from('business_setup_drafts')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ draft: data });
  } catch (err) {
    return handleApiError(err, 'business-setup/drafts/[id]/PATCH');
  }
}
