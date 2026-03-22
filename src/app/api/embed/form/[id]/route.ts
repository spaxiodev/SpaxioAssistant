/**
 * Public: fetch form config for embedding.
 * Returns only the fields needed to render the form — no private business config exposed.
 * Uses admin client with form ID as authorization (forms are public by design when active).
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/validation';
import type { PublicFormConfig } from '@/lib/embedded-forms/types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const ip = getClientIp(request);
  const rl = rateLimit({ key: `embed-form-config:${ip}`, limit: 60, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: corsHeaders });
  }

  const { id } = await params;
  if (!id || typeof id !== 'string' || id.length > 100) {
    return NextResponse.json({ error: 'Invalid form ID' }, { status: 400, headers: corsHeaders });
  }

  const supabase = createAdminClient();
  const { data: form, error } = await supabase
    .from('embedded_forms')
    .select('id, name, form_type, success_message, theme_settings, is_active')
    .eq('id', id)
    .single();

  if (error || !form) {
    return NextResponse.json({ error: 'Form not found' }, { status: 404, headers: corsHeaders });
  }
  if (!form.is_active) {
    return NextResponse.json({ error: 'Form is not active' }, { status: 410, headers: corsHeaders });
  }

  const { data: fields } = await supabase
    .from('form_fields')
    .select('field_key, label, field_type, placeholder, required, options_json, sort_order')
    .eq('form_id', id)
    .order('sort_order');

  const config: PublicFormConfig = {
    id: form.id,
    name: form.name,
    form_type: form.form_type,
    success_message: form.success_message,
    theme_settings: typeof form.theme_settings === 'object' ? form.theme_settings : {},
    fields: (fields ?? []).map((f) => ({
      field_key: f.field_key,
      label: f.label,
      field_type: f.field_type,
      placeholder: f.placeholder,
      required: f.required,
      options_json: Array.isArray(f.options_json) ? f.options_json : [],
      sort_order: f.sort_order,
    })),
  };

  return NextResponse.json(config, { headers: corsHeaders });
}
