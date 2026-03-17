/**
 * Dashboard: run pricing engine preview with given inputs. Auth required.
 */

import { NextResponse } from 'next/server';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPricingContext, runEstimate } from '@/lib/quote-pricing/estimate-quote-service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id: profileId } = await params;
  const body = await request.json().catch(() => ({}));
  const inputs = typeof body.inputs === 'object' && body.inputs !== null ? body.inputs as Record<string, unknown> : {};
  const serviceId = typeof body.service_id === 'string' && body.service_id ? body.service_id : null;

  const supabase = createAdminClient();
  const context = await getPricingContext(supabase, { organizationId: orgId, pricingProfileId: profileId });
  if (!context) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const result = runEstimate({
    inputs,
    context,
    serviceId,
  });

  return NextResponse.json({
    valid: result.valid,
    missing_required: result.missing_required,
    extracted_inputs: result.extracted_inputs,
    applied_rules: result.applied_rules,
    subtotal: result.subtotal,
    total: result.total,
    estimate_low: result.estimate_low,
    estimate_high: result.estimate_high,
    confidence: result.confidence,
    human_review_recommended: result.human_review_recommended,
    output_mode: result.output_mode,
  });
}
