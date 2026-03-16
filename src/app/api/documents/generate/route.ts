/**
 * POST /api/documents/generate
 * Body: { generationType, sourceType, sourceId?, templateId? }
 * Loads context from DB, generates document via AI, saves to documents table. Org-scoped.
 */

import { NextResponse } from 'next/server';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateDocumentContent } from '@/lib/document-generation/generate-document';
import { recordAiActionUsage } from '@/lib/billing/usage';
import { hasExceededMonthlyAiActions, canUseAiActions } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import type { DocumentContext, GenerationType, DocumentSourceType } from '@/lib/document-generation/types';

const VALID_GENERATION_TYPES: GenerationType[] = [
  'quote_draft',
  'proposal_draft',
  'lead_summary',
  'conversation_summary',
  'follow_up_summary',
];
const VALID_SOURCE_TYPES: DocumentSourceType[] = ['lead', 'quote_request', 'deal', 'conversation', 'none'];

export async function POST(request: Request) {
  const orgId = await getOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { generationType?: string; sourceType?: string; sourceId?: string; templateId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const generationType = body.generationType as GenerationType;
  const sourceType = (body.sourceType ?? 'none') as DocumentSourceType;
  const sourceId = body.sourceId ?? null;
  const templateId = body.templateId ?? null;

  if (!VALID_GENERATION_TYPES.includes(generationType)) {
    return NextResponse.json({ error: 'Invalid generationType' }, { status: 400 });
  }
  if (!VALID_SOURCE_TYPES.includes(sourceType)) {
    return NextResponse.json({ error: 'Invalid sourceType' }, { status: 400 });
  }
  if (sourceType !== 'none' && !sourceId) {
    return NextResponse.json({ error: 'sourceId required when sourceType is not none' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const adminAllowed = await isOrgAllowedByAdmin(supabase, orgId);
  const canUse = await canUseAiActions(supabase, orgId, adminAllowed);
  if (!canUse) {
    return NextResponse.json(
      { error: 'AI document generation is not available on your plan.', code: 'PLAN_UPGRADE_REQUIRED' },
      { status: 403 }
    );
  }
  const exceeded = await hasExceededMonthlyAiActions(supabase, orgId, adminAllowed);
  if (exceeded) {
    return NextResponse.json(
      { error: 'Monthly AI action limit reached. Upgrade or try again next month.', code: 'PLAN_UPGRADE_REQUIRED' },
      { status: 403 }
    );
  }

  const context: DocumentContext = {};

  const [{ data: settings }, ...rest] = await Promise.all([
    supabase.from('business_settings').select('business_name, industry, services_offered').eq('organization_id', orgId).single(),
    sourceType === 'lead' && sourceId
      ? supabase.from('leads').select('*').eq('id', sourceId).eq('organization_id', orgId).single()
      : Promise.resolve({ data: null }),
    sourceType === 'quote_request' && sourceId
      ? supabase.from('quote_requests').select('*').eq('id', sourceId).eq('organization_id', orgId).single()
      : Promise.resolve({ data: null }),
    sourceType === 'deal' && sourceId
      ? supabase.from('deals').select('*').eq('id', sourceId).eq('organization_id', orgId).single()
      : Promise.resolve({ data: null }),
  ]);

  context.businessName = (settings as { business_name?: string } | null)?.business_name ?? null;
  context.industry = (settings as { industry?: string } | null)?.industry ?? null;
  context.servicesOffered = (settings as { services_offered?: string[] } | null)?.services_offered ?? null;

  const leadData = rest[0]?.data as Record<string, unknown> | null;
  const quoteData = rest[1]?.data as Record<string, unknown> | null;
  const dealData = rest[2]?.data as Record<string, unknown> | null;

  if (leadData) {
    context.lead = {
      name: String(leadData.name ?? ''),
      email: String(leadData.email ?? ''),
      phone: (leadData.phone as string) ?? null,
      message: (leadData.message as string) ?? null,
      requested_service: (leadData.requested_service as string) ?? null,
      requested_timeline: (leadData.requested_timeline as string) ?? null,
      project_details: (leadData.project_details as string) ?? null,
      location: (leadData.location as string) ?? null,
      qualification_summary: (leadData.qualification_summary as string) ?? null,
    };
  }
  if (quoteData) {
    context.quoteRequest = {
      customer_name: String(quoteData.customer_name ?? ''),
      service_type: (quoteData.service_type as string) ?? null,
      project_details: (quoteData.project_details as string) ?? null,
      dimensions_size: (quoteData.dimensions_size as string) ?? null,
      location: (quoteData.location as string) ?? null,
      budget_text: (quoteData.budget_text as string) ?? null,
      budget_amount: typeof quoteData.budget_amount === 'number' ? quoteData.budget_amount : null,
      notes: (quoteData.notes as string) ?? null,
    };
  }
  if (dealData) {
    context.deal = {
      title: String(dealData.title ?? ''),
      stage: String(dealData.stage ?? ''),
      value_cents: (dealData.value_cents as number) ?? null,
    };
  }

  try {
    const generated = await generateDocumentContent({
      organizationId: orgId,
      generationType,
      templateId: templateId || null,
      sourceType,
      sourceId,
      context,
    });

    const insert: Record<string, unknown> = {
      organization_id: orgId,
      name: generated.name,
      content: generated.content,
      template_id: templateId || null,
      lead_id: sourceType === 'lead' ? sourceId : null,
      contact_id: null,
      deal_id: sourceType === 'deal' ? sourceId : null,
      metadata: {
        generation_type: generationType,
        source_type: sourceType,
        source_id: sourceId,
        generation_status: 'completed',
      },
    };

    if (sourceType === 'quote_request' && sourceId) {
      insert.quote_request_id = sourceId;
    }

    const { data: doc, error } = await supabase.from('documents').insert(insert).select('id, name').single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await recordAiActionUsage(supabase, orgId);

    return NextResponse.json({ documentId: doc?.id, name: doc?.name ?? generated.name });
  } catch (err) {
    console.error('[documents/generate]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
