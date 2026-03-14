import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrganizationId } from '@/lib/auth-server';

const VALUE_TYPES = ['text', 'email', 'phone', 'number', 'boolean', 'date', 'json'] as const;

type Params = { params: Promise<{ id: string }> };

/** POST: add field mapping */
export async function POST(request: Request, { params }: Params) {
  const { id: endpointId } = await params;
  const orgId = await getOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: endpoint } = await supabase
    .from('webhook_endpoints')
    .select('id')
    .eq('id', endpointId)
    .eq('organization_id', orgId)
    .single();

  if (!endpoint) {
    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const sourcePath = typeof body.source_path === 'string' ? body.source_path.trim().slice(0, 500) : '';
  const targetKey = typeof body.target_key === 'string' ? body.target_key.trim().slice(0, 128) : '';
  const valueType = VALUE_TYPES.includes(body.value_type) ? body.value_type : 'text';
  const required = Boolean(body.required);
  const defaultValue = typeof body.default_value === 'string' ? body.default_value.slice(0, 500) : null;

  if (!sourcePath || !targetKey) {
    return NextResponse.json({ error: 'source_path and target_key are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('webhook_field_mappings')
    .insert({
      endpoint_id: endpointId,
      source_path: sourcePath,
      target_key: targetKey,
      value_type: valueType,
      required,
      default_value: defaultValue,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ mapping: data });
}
