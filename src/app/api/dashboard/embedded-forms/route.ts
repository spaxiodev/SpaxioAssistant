/**
 * Dashboard: list and create embedded forms. Auth required.
 */

import { NextResponse } from 'next/server';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-error';

export async function GET() {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAdminClient();
    const { data: forms, error } = await supabase
      .from('embedded_forms')
      .select('id, name, slug, form_type, is_active, created_at, updated_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Attach submission counts
    const formIds = (forms ?? []).map((f: { id: string }) => f.id);
    let counts: Record<string, number> = {};
    if (formIds.length > 0) {
      const { data: countRows } = await supabase
        .from('form_submissions')
        .select('form_id')
        .in('form_id', formIds);
      for (const row of countRows ?? []) {
        counts[row.form_id] = (counts[row.form_id] ?? 0) + 1;
      }
    }

    const formsWithCounts = (forms ?? []).map((f: { id: string }) => ({
      ...f,
      submission_count: counts[f.id] ?? 0,
    }));

    return NextResponse.json({ forms: formsWithCounts });
  } catch (err) {
    return handleApiError(err, 'dashboard/embedded-forms GET');
  }
}

export async function POST(request: Request) {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 200) : '';
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

    const VALID_FORM_TYPES = ['lead_form', 'quote_form', 'custom_request_form'];
    const formType = VALID_FORM_TYPES.includes(body.form_type) ? body.form_type : 'lead_form';
    const quoteFormFieldSource =
      formType === 'quote_form' &&
      typeof body.quote_form_field_source === 'string' &&
      body.quote_form_field_source === 'widget_ai'
        ? 'widget_ai'
        : 'custom';
    const successMessage = typeof body.success_message === 'string' ? body.success_message.trim().slice(0, 1000) : null;
    const themeSettings = typeof body.theme_settings === 'object' && body.theme_settings !== null ? body.theme_settings : {};
    const pricingProfileId = typeof body.pricing_profile_id === 'string' && body.pricing_profile_id ? body.pricing_profile_id : null;

    const supabase = createAdminClient();

    // Verify pricing profile belongs to org if provided
    if (pricingProfileId) {
      const { data: pp } = await supabase
        .from('quote_pricing_profiles')
        .select('id')
        .eq('id', pricingProfileId)
        .eq('organization_id', orgId)
        .single();
      if (!pp) return NextResponse.json({ error: 'Pricing profile not found' }, { status: 404 });
    }

    const { data: form, error } = await supabase
      .from('embedded_forms')
      .insert({
        organization_id: orgId,
        name,
        form_type: formType,
        quote_form_field_source: quoteFormFieldSource,
        is_active: true,
        success_message: successMessage,
        theme_settings: themeSettings,
        pricing_profile_id: pricingProfileId,
      })
      .select('id, name, form_type, is_active, created_at')
      .single();

    if (error || !form) {
      return NextResponse.json({ error: error?.message ?? 'Failed to create form' }, { status: 500 });
    }

    // If default fields were requested, seed them
    if (Array.isArray(body.fields) && body.fields.length > 0) {
      const fields = body.fields.map((f: Record<string, unknown>, i: number) => ({
        form_id: form.id,
        field_key: String(f.field_key ?? `field_${i}`).slice(0, 100),
        label: String(f.label ?? '').slice(0, 200),
        field_type: f.field_type ?? 'text',
        placeholder: f.placeholder ? String(f.placeholder).slice(0, 300) : null,
        required: Boolean(f.required),
        options_json: Array.isArray(f.options_json) ? f.options_json : [],
        sort_order: typeof f.sort_order === 'number' ? f.sort_order : i,
        pricing_mapping_json: typeof f.pricing_mapping_json === 'object' ? f.pricing_mapping_json : {},
      }));
      await supabase.from('form_fields').insert(fields);
    }

    return NextResponse.json({ form }, { status: 201 });
  } catch (err) {
    return handleApiError(err, 'dashboard/embedded-forms POST');
  }
}
