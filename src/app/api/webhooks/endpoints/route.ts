import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOrganizationId } from '@/lib/auth-server';
import { randomBytes } from 'crypto';
import { isUuid, normalizeUuid } from '@/lib/validation';
import { hasWebhookAccess } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { getPlanForOrg } from '@/lib/entitlements';
import { planUpgradeRequiredResponse } from '@/lib/api-plan-error';
import { getUpgradePlanForFeature, normalizePlanSlug } from '@/lib/plan-config';

/** GET: list webhook endpoints for the org; optional ?agentId= to filter by agent */
export async function GET(request: Request) {
  const orgId = await getOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawAgentId = searchParams.get('agentId');
  const agentId = rawAgentId && isUuid(normalizeUuid(rawAgentId)) ? normalizeUuid(rawAgentId) : null;

  const supabase = await createClient();
  let query = supabase
    .from('webhook_endpoints')
    .select('id, name, slug, active, last_success_at, last_failure_at, last_failure_message, created_at, agent_id, agents(name)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (agentId) {
    query = query.eq('agent_id', agentId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const endpoints = (data ?? []).map((row) => {
    const agents = row.agents;
    const agent_name = agents == null ? null : Array.isArray(agents) ? agents[0]?.name ?? null : (agents as { name: string }).name;
    return {
      ...row,
      agent_name,
      agents: undefined,
    };
  });
  return NextResponse.json({ endpoints });
}

/** POST: create webhook endpoint (name, slug); secret is auto-generated */
export async function POST(request: Request) {
  const orgId = await getOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseAdmin = createAdminClient();
  const adminAllowed = await isOrgAllowedByAdmin(supabaseAdmin, orgId);
  const webhookAllowed = await hasWebhookAccess(supabaseAdmin, orgId, adminAllowed);
  if (!webhookAllowed) {
    const plan = await getPlanForOrg(supabaseAdmin, orgId);
    const currentSlug = normalizePlanSlug(plan?.slug ?? 'free') ?? 'free';
    return planUpgradeRequiredResponse({
      message: 'Webhooks are not available on your plan. Upgrade to Pro or above.',
      currentPlan: currentSlug,
      requiredPlan: getUpgradePlanForFeature('webhooks'),
      feature: 'webhooks',
    });
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 255) : '';
  const slug = typeof body.slug === 'string'
    ? body.slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-').slice(0, 64)
    : '';
  const rawAgentId = body.agent_id;
  const agentId = typeof rawAgentId === 'string' && isUuid(normalizeUuid(rawAgentId)) ? normalizeUuid(rawAgentId) : null;

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const supabase = await createClient();

  if (agentId) {
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('id', agentId)
      .eq('organization_id', orgId)
      .single();
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found or not in your organization' }, { status: 400 });
    }
  }

  const finalSlug = slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '-').slice(0, 64) || 'webhook';
  const secret = randomBytes(32).toString('hex');

  const { data, error } = await supabase
    .from('webhook_endpoints')
    .insert({
      organization_id: orgId,
      name,
      slug: finalSlug,
      secret,
      active: true,
      agent_id: agentId ?? null,
    })
    .select('id, name, slug, active, secret, created_at, agent_id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'An endpoint with this slug already exists for this agent or workspace' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ endpoint: data });
}
