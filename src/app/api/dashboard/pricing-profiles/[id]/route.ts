/**
 * Dashboard: get or update a single pricing profile (full context). Auth required.
 */

import { NextResponse } from 'next/server';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPricingContext } from '@/lib/quote-pricing/estimate-quote-service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const supabase = createAdminClient();
  const context = await getPricingContext(supabase, { organizationId: orgId, pricingProfileId: id });
  if (!context) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }
  return NextResponse.json({
    profile: context.profile,
    services: context.services,
    variables: context.variables,
    rules: context.rules,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from('quote_pricing_profiles')
    .select('id')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single();
  if (!existing) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.name === 'string') updates.name = body.name.trim().slice(0, 200);
  if (typeof body.industry_type === 'string') updates.industry_type = body.industry_type.trim().slice(0, 100) || null;
  if (typeof body.description === 'string') updates.description = body.description.trim().slice(0, 1000) || null;
  if (typeof body.currency === 'string') updates.currency = body.currency.trim().slice(0, 10);
  if (typeof body.config === 'object' && body.config !== null) updates.config = body.config;
  if (['exact_estimate', 'estimate_range', 'quote_draft_only', 'manual_review_required_above_threshold', 'always_require_review'].includes(body.pricing_mode)) {
    updates.pricing_mode = body.pricing_mode;
  }
  if (body.is_default === true) {
    await supabase.from('quote_pricing_profiles').update({ is_default: false }).eq('organization_id', orgId);
    updates.is_default = true;
  } else if (body.is_default === false) updates.is_default = false;

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from('quote_pricing_profiles').update(updates).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const context = await getPricingContext(supabase, { organizationId: orgId, pricingProfileId: id });
  return NextResponse.json({
    profile: context!.profile,
    services: context!.services,
    variables: context!.variables,
    rules: context!.rules,
  });
}
