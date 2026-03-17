import { NextResponse } from 'next/server';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
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

  const { data: existing, error: fetchError } = await supabase
    .from('quote_pricing_rules')
    .select('id, organization_id, rule_type, config')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
  }

  if (existing.organization_id !== orgId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updates: { name?: string; description?: string | null; config?: Record<string, unknown>; sort_order?: number; is_active?: boolean } = {};
  if (typeof body.name === 'string' && body.name.trim()) {
    updates.name = body.name.trim().slice(0, 200);
  }
  if (typeof body.description === 'string') {
    updates.description = body.description.trim().slice(0, 500) || null;
  }
  if (typeof body.sort_order === 'number' && Number.isInteger(body.sort_order)) {
    updates.sort_order = body.sort_order;
  }
  if (typeof body.is_active === 'boolean') {
    updates.is_active = body.is_active;
  }
  if (body.config !== undefined && typeof body.config === 'object' && body.config !== null) {
    updates.config = body.config as Record<string, unknown>;
  }

  const { data: updated, error: updateError } = await supabase
    .from('quote_pricing_rules')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  return NextResponse.json({ rule: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: existing, error: fetchError } = await supabase
    .from('quote_pricing_rules')
    .select('id, organization_id')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
  }

  if (existing.organization_id !== orgId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error: deleteError } = await supabase.from('quote_pricing_rules').delete().eq('id', id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

