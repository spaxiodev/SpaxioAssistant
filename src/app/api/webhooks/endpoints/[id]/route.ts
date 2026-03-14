import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrganizationId } from '@/lib/auth-server';

type Params = { params: Promise<{ id: string }> };

/** GET: single endpoint with field mappings */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const orgId = await getOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: endpoint, error: epError } = await supabase
    .from('webhook_endpoints')
    .select('id, name, slug, active, last_success_at, last_failure_at, last_failure_message, created_at')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single();

  if (epError || !endpoint) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: mappings } = await supabase
    .from('webhook_field_mappings')
    .select('id, source_path, target_key, value_type, required, default_value')
    .eq('endpoint_id', id)
    .order('target_key');

  return NextResponse.json({ endpoint, mappings: mappings ?? [] });
}

/** PATCH: update endpoint (name, active) */
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const orgId = await getOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const updates: { name?: string; active?: boolean } = {};
  if (typeof body.name === 'string') updates.name = body.name.trim().slice(0, 255);
  if (typeof body.active === 'boolean') updates.active = body.active;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('webhook_endpoints')
    .update(updates)
    .eq('id', id)
    .eq('organization_id', orgId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ endpoint: data });
}

/** DELETE: remove endpoint and its mappings */
export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const orgId = await getOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('webhook_endpoints')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
