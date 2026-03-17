/**
 * Dashboard: create quote pricing rule. Auth required.
 */

import { NextResponse } from 'next/server';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { RULE_TYPES } from '@/lib/quote-pricing/types';

export async function POST(request: Request) {
  const orgId = await getOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const pricingProfileId = typeof body.pricing_profile_id === 'string' ? body.pricing_profile_id.trim() : null;
  const serviceId = typeof body.service_id === 'string' && body.service_id ? body.service_id.trim() : null;
  const ruleType = typeof body.rule_type === 'string' && RULE_TYPES.includes(body.rule_type as (typeof RULE_TYPES)[number])
    ? (body.rule_type as (typeof RULE_TYPES)[number])
    : 'fixed_price';
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 200) : 'Rule';
  const description = typeof body.description === 'string' ? body.description.trim().slice(0, 500) : null;
  const config = typeof body.config === 'object' && body.config !== null ? (body.config as Record<string, unknown>) : {};
  const sortOrder = typeof body.sort_order === 'number' && Number.isInteger(body.sort_order) ? body.sort_order : 0;

  if (!pricingProfileId) {
    return NextResponse.json({ error: 'pricing_profile_id is required' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from('quote_pricing_profiles')
    .select('id, organization_id')
    .eq('id', pricingProfileId)
    .single();

  if (!profile || profile.organization_id !== orgId) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const { data: rule, error } = await supabase
    .from('quote_pricing_rules')
    .insert({
      organization_id: orgId,
      pricing_profile_id: pricingProfileId,
      service_id: serviceId,
      rule_type: ruleType,
      name,
      description,
      config,
      sort_order: sortOrder,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ rule });
}
