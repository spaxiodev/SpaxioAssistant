/**
 * Dashboard: get and update a single AI page. Auth required.
 */

import { NextResponse } from 'next/server';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPageById } from '@/lib/ai-pages/config-service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrganizationId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();
  const page = await getPageById(supabase, id, orgId);
  if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ page });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrganizationId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();
  const existing = await getPageById(supabase, id, orgId);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};

  if (typeof body.title === 'string') updates.title = body.title.trim().slice(0, 200);
  if (typeof body.slug === 'string') updates.slug = body.slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '').slice(0, 100);
  if (typeof body.description === 'string') updates.description = body.description.trim().slice(0, 500) || null;
  if (typeof body.page_type === 'string' && ['quote', 'support', 'booking', 'intake', 'sales', 'product_finder', 'general', 'custom'].includes(body.page_type)) updates.page_type = body.page_type;
  if (typeof body.deployment_mode === 'string' && ['widget_only', 'page_only', 'widget_and_page', 'widget_handoff_to_page', 'hosted_page', 'embedded_page', 'both'].includes(body.deployment_mode)) updates.deployment_mode = body.deployment_mode;
  if (body.agent_id !== undefined) updates.agent_id = body.agent_id && typeof body.agent_id === 'string' ? body.agent_id.trim() : null;
  if (typeof body.welcome_message === 'string') updates.welcome_message = body.welcome_message.trim().slice(0, 1000) || null;
  if (typeof body.intro_copy === 'string') updates.intro_copy = body.intro_copy.trim().slice(0, 1000) || null;
  if (typeof body.trust_copy === 'string') updates.trust_copy = body.trust_copy.trim().slice(0, 500) || null;
  if (typeof body.is_enabled === 'boolean') updates.is_enabled = body.is_enabled;
  if (typeof body.config === 'object' && body.config !== null) updates.config = body.config;
  if (Array.isArray(body.intake_schema)) updates.intake_schema = body.intake_schema;
  if (typeof body.outcome_config === 'object' && body.outcome_config !== null) updates.outcome_config = body.outcome_config;
  if (typeof body.handoff_config === 'object' && body.handoff_config !== null) updates.handoff_config = body.handoff_config;
  if (body.pricing_profile_id !== undefined) updates.pricing_profile_id = body.pricing_profile_id && typeof body.pricing_profile_id === 'string' ? body.pricing_profile_id.trim() : null;

  const { data, error } = await supabase
    .from('ai_pages')
    .update(updates)
    .eq('id', id)
    .eq('organization_id', orgId)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Slug already in use' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ page: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrganizationId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('ai_pages')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
