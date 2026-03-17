/**
 * Dashboard: list and create AI pages. Auth required.
 */

import { NextResponse } from 'next/server';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { listAiPagesForOrg, getDefaultIntakeSchema } from '@/lib/ai-pages/config-service';
import { canCreateAiPage, getPlanForOrg } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { planUpgradeRequiredResponse } from '@/lib/api-plan-error';
import { getNextPlanSlug, normalizePlanSlug } from '@/lib/plan-config';

export async function GET() {
  const orgId = await getOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const pages = await listAiPagesForOrg(supabase, orgId);
  return NextResponse.json({ pages });
}

export async function POST(request: Request) {
  const orgId = await getOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const adminAllowed = await isOrgAllowedByAdmin(supabase, orgId);
  const allowed = await canCreateAiPage(supabase, orgId, adminAllowed);
  if (!allowed) {
    const plan = await getPlanForOrg(supabase, orgId);
    const currentSlug = normalizePlanSlug(plan?.slug ?? 'free') ?? 'free';
    return planUpgradeRequiredResponse({
      message: 'AI Pages are not available on your plan, or you have reached your AI page limit. Upgrade to Pro or above.',
      currentPlan: currentSlug,
      requiredPlan: getNextPlanSlug(currentSlug),
      feature: 'ai_pages',
    });
  }

  const body = await request.json().catch(() => ({}));
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 200) : 'Untitled';
  const slug = typeof body.slug === 'string'
    ? body.slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '').slice(0, 100) || 'page'
    : title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 100) || 'page';
  const pageType = (typeof body.page_type === 'string' && ['quote', 'support', 'booking', 'intake', 'sales', 'product_finder', 'general', 'custom'].includes(body.page_type))
    ? body.page_type
    : 'general';
  const deploymentMode = (typeof body.deployment_mode === 'string' && ['widget_only', 'page_only', 'widget_and_page', 'widget_handoff_to_page', 'hosted_page', 'embedded_page', 'both'].includes(body.deployment_mode))
    ? body.deployment_mode
    : 'page_only';
  const agentId = typeof body.agent_id === 'string' && body.agent_id.trim() ? body.agent_id.trim() : null;
  const description = typeof body.description === 'string' ? body.description.trim().slice(0, 500) : null;
  const welcomeMessage = typeof body.welcome_message === 'string' ? body.welcome_message.trim().slice(0, 1000) : null;
  const introCopy = typeof body.intro_copy === 'string' ? body.intro_copy.trim().slice(0, 1000) : null;
  const trustCopy = typeof body.trust_copy === 'string' ? body.trust_copy.trim().slice(0, 500) : null;

  const intakeSchema = Array.isArray(body.intake_schema) ? body.intake_schema : getDefaultIntakeSchema(pageType);
  const outcomeConfig = typeof body.outcome_config === 'object' && body.outcome_config !== null
    ? body.outcome_config
    : {
        create_quote_request: pageType === 'quote',
        create_lead: true,
        create_ticket: pageType === 'support',
      };
  const handoffConfig = typeof body.handoff_config === 'object' && body.handoff_config !== null
    ? body.handoff_config
    : { allow_widget_handoff: true, button_label: 'Continue in full assistant' };

  const { data, error } = await supabase
    .from('ai_pages')
    .insert({
      organization_id: orgId,
      agent_id: agentId,
      title,
      slug,
      description,
      page_type: pageType,
      deployment_mode: deploymentMode,
      welcome_message: welcomeMessage,
      intro_copy: introCopy,
      trust_copy: trustCopy,
      config: { goal: typeof body.goal === 'string' ? body.goal.slice(0, 500) : undefined },
      intake_schema: intakeSchema,
      outcome_config: outcomeConfig,
      handoff_config: handoffConfig,
      is_published: false,
      is_enabled: true,
    })
    .select('id, title, slug, page_type, is_published, created_at')
    .single();

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Slug already in use' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ page: data });
}
