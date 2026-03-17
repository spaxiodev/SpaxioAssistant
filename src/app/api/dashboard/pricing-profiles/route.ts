/**
 * Dashboard: list and create quote pricing profiles. Auth required.
 */

import { NextResponse } from 'next/server';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { INDUSTRY_TEMPLATES } from '@/lib/quote-pricing/industry-templates';

export async function GET() {
  const orgId = await getOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: profiles, error } = await supabase
    .from('quote_pricing_profiles')
    .select('id, name, industry_type, is_default, currency, pricing_mode, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ profiles: profiles ?? [] });
}

export async function POST(request: Request) {
  const orgId = await getOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 200) : 'Pricing profile';
  const industryType = typeof body.industry_type === 'string' ? body.industry_type.trim().slice(0, 100) : null;
  const fromTemplate = typeof body.from_template === 'string' ? body.from_template : null;
  const isDefault = Boolean(body.is_default);
  const currency = typeof body.currency === 'string' ? body.currency.trim().slice(0, 10) : 'USD';
  const pricingMode = typeof body.pricing_mode === 'string' && ['exact_estimate', 'estimate_range', 'quote_draft_only', 'manual_review_required_above_threshold', 'always_require_review'].includes(body.pricing_mode)
    ? body.pricing_mode
    : 'exact_estimate';

  const supabase = createAdminClient();

  if (isDefault) {
    await supabase
      .from('quote_pricing_profiles')
      .update({ is_default: false })
      .eq('organization_id', orgId);
  }

  const { data: profile, error: profileError } = await supabase
    .from('quote_pricing_profiles')
    .insert({
      organization_id: orgId,
      name,
      industry_type: industryType,
      is_default: isDefault,
      currency,
      pricing_mode: pricingMode,
      description: null,
      config: {},
    })
    .select('id')
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: profileError?.message ?? 'Failed to create profile' }, { status: 500 });
  }

  const template = fromTemplate ? INDUSTRY_TEMPLATES.find((t) => t.industry_type === fromTemplate) : null;
  if (template) {
    const { data: services } = await supabase
      .from('quote_services')
      .insert(
        template.services.map((s) => ({
          organization_id: orgId,
          pricing_profile_id: profile.id,
          name: s.name,
          slug: s.slug,
          description: s.description ?? null,
          is_active: true,
        }))
      )
      .select('id, slug');
    const serviceBySlug = new Map((services ?? []).map((s: { id: string; slug: string }) => [s.slug, s.id]));

    await supabase.from('quote_pricing_variables').insert(
      template.variables.map((v, i) => ({
        organization_id: orgId,
        pricing_profile_id: profile.id,
        service_id: template.services.length === 1 && serviceBySlug.get(template.services[0]!.slug) ? serviceBySlug.get(template.services[0]!.slug) : null,
        name: v.label,
        key: v.key,
        label: v.label,
        variable_type: v.variable_type,
        unit_label: v.unit_label ?? null,
        required: v.required,
        default_value: v.default_value ?? null,
        options: v.options ?? null,
        help_text: v.help_text ?? null,
        sort_order: i,
      }))
    );

    const serviceId = template.services.length === 1 ? serviceBySlug.get(template.services[0]!.slug) : null;
    await supabase.from('quote_pricing_rules').insert(
      template.rules.map((r) => ({
        organization_id: orgId,
        pricing_profile_id: profile.id,
        service_id: serviceId,
        rule_type: r.rule_type,
        name: r.name,
        description: r.description ?? null,
        config: r.config,
        sort_order: r.sort_order,
        is_active: true,
      }))
    );
  }

  return NextResponse.json({ profile: { id: profile.id, name, industry_type: industryType } });
}
