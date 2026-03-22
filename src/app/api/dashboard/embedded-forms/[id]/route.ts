/**
 * Dashboard: get, update, delete a single embedded form (with fields). Auth required.
 */

import { NextResponse } from 'next/server';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-error';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const supabase = createAdminClient();

    const { data: form, error } = await supabase
      .from('embedded_forms')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (error || !form) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: fields } = await supabase
      .from('form_fields')
      .select('*')
      .eq('form_id', id)
      .order('sort_order');

    return NextResponse.json({ form: { ...form, fields: fields ?? [] } });
  } catch (err) {
    return handleApiError(err, 'dashboard/embedded-forms/[id] GET');
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const supabase = createAdminClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from('embedded_forms')
      .select('id, form_type, quote_form_field_source')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const VALID_FORM_TYPES = ['lead_form', 'quote_form', 'custom_request_form'];

    const updates: Record<string, unknown> = {};
    if (typeof body.name === 'string') updates.name = body.name.trim().slice(0, 200);
    if (VALID_FORM_TYPES.includes(body.form_type)) updates.form_type = body.form_type;
    if (typeof body.is_active === 'boolean') updates.is_active = body.is_active;
    if (typeof body.success_message === 'string') updates.success_message = body.success_message.trim().slice(0, 1000);
    if (typeof body.theme_settings === 'object') updates.theme_settings = body.theme_settings;
    if ('pricing_profile_id' in body) {
      updates.pricing_profile_id = body.pricing_profile_id || null;
    }

    const nextFormType =
      typeof updates.form_type === 'string'
        ? updates.form_type
        : (existing as { form_type: string }).form_type;
    if (nextFormType !== 'quote_form') {
      updates.quote_form_field_source = 'custom';
    } else if (
      typeof body.quote_form_field_source === 'string' &&
      (body.quote_form_field_source === 'custom' || body.quote_form_field_source === 'widget_ai')
    ) {
      updates.quote_form_field_source = body.quote_form_field_source;
    }

    const resolvedQuoteSource =
      typeof updates.quote_form_field_source === 'string'
        ? updates.quote_form_field_source
        : String(
            (existing as { quote_form_field_source?: string }).quote_form_field_source ?? 'custom'
          );

    const { data: form, error } = await supabase
      .from('embedded_forms')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Replace fields if provided (skip when mirroring AI widget — fields are resolved at embed time)
    const skipFieldReplace = nextFormType === 'quote_form' && resolvedQuoteSource === 'widget_ai';
    if (Array.isArray(body.fields) && !skipFieldReplace) {
      await supabase.from('form_fields').delete().eq('form_id', id);

      if (body.fields.length > 0) {
        const newFields = body.fields.map((f: Record<string, unknown>, i: number) => ({
          form_id: id,
          field_key: String(f.field_key ?? `field_${i}`).slice(0, 100),
          label: String(f.label ?? '').slice(0, 200),
          field_type: f.field_type ?? 'text',
          placeholder: f.placeholder ? String(f.placeholder).slice(0, 300) : null,
          required: Boolean(f.required),
          options_json: Array.isArray(f.options_json) ? f.options_json : [],
          sort_order: typeof f.sort_order === 'number' ? f.sort_order : i,
          pricing_mapping_json: typeof f.pricing_mapping_json === 'object' && f.pricing_mapping_json !== null ? f.pricing_mapping_json : {},
          conditional_logic_json: typeof f.conditional_logic_json === 'object' && f.conditional_logic_json !== null ? f.conditional_logic_json : {},
        }));
        await supabase.from('form_fields').insert(newFields);
      }
    }

    const { data: fields } = await supabase
      .from('form_fields')
      .select('*')
      .eq('form_id', id)
      .order('sort_order');

    return NextResponse.json({ form: { ...form, fields: fields ?? [] } });
  } catch (err) {
    return handleApiError(err, 'dashboard/embedded-forms/[id] PUT');
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('embedded_forms')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err, 'dashboard/embedded-forms/[id] DELETE');
  }
}
