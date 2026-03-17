/**
 * Dashboard: create quote pricing variable. Auth required.
 */

import { NextResponse } from 'next/server';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { VARIABLE_TYPES } from '@/lib/quote-pricing/types';

export async function POST(request: Request) {
  const orgId = await getOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const pricingProfileId = typeof body.pricing_profile_id === 'string' ? body.pricing_profile_id.trim() : null;
  const serviceId = typeof body.service_id === 'string' && body.service_id ? body.service_id.trim() : null;
  const key = typeof body.key === 'string' ? body.key.trim().replace(/\s+/g, '_').slice(0, 80) : null;
  const label = typeof body.label === 'string' ? body.label.trim().slice(0, 200) : (key ?? 'Variable');
  const variableType = typeof body.variable_type === 'string' && VARIABLE_TYPES.includes(body.variable_type as (typeof VARIABLE_TYPES)[number])
    ? (body.variable_type as (typeof VARIABLE_TYPES)[number])
    : 'number';
  const required = Boolean(body.required);
  const unitLabel = typeof body.unit_label === 'string' ? body.unit_label.trim().slice(0, 50) : null;
  const defaultValue = typeof body.default_value === 'string' ? body.default_value.trim().slice(0, 500) : null;
  const options = Array.isArray(body.options) || (typeof body.options === 'object' && body.options !== null) ? body.options : null;
  const helpText = typeof body.help_text === 'string' ? body.help_text.trim().slice(0, 500) : null;
  const sortOrder = typeof body.sort_order === 'number' && Number.isInteger(body.sort_order) ? body.sort_order : 0;

  if (!pricingProfileId || !key) {
    return NextResponse.json({ error: 'pricing_profile_id and key are required' }, { status: 400 });
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

  const { data: variable, error } = await supabase
    .from('quote_pricing_variables')
    .insert({
      organization_id: orgId,
      pricing_profile_id: pricingProfileId,
      service_id: serviceId,
      name: label,
      key,
      label,
      variable_type: variableType,
      unit_label: unitLabel,
      required,
      default_value: defaultValue,
      options: options ?? undefined,
      help_text: helpText,
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ variable });
}
