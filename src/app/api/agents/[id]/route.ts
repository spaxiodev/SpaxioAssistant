import { createAdminClient } from '@/lib/supabase/admin';
import { getOrganizationId } from '@/lib/auth-server';
import { NextResponse } from 'next/server';
import { sanitizeText } from '@/lib/validation';
import { handleApiError } from '@/lib/api-error';
import { isUuid, normalizeUuid } from '@/lib/validation';
import { hasWebhookAccess, canUseToolCalling, getPlanForOrg } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { getUpgradePlanForFeature, normalizePlanSlug } from '@/lib/plan-config';
import { planUpgradeRequiredResponse } from '@/lib/api-plan-error';

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/agents/:id */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { id } = await context.params;
    const agentId = normalizeUuid(id);
    if (!isUuid(agentId)) return NextResponse.json({ error: 'Invalid agent id' }, { status: 400 });

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (err) {
    return handleApiError(err, 'agents/GET/:id');
  }
}

/** PATCH /api/agents/:id */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { id } = await context.params;
    const agentId = normalizeUuid(id);
    if (!isUuid(agentId)) return NextResponse.json({ error: 'Invalid agent id' }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const updatePayload: Record<string, unknown> = {};

    if (body.name !== undefined) updatePayload.name = sanitizeText(body.name, 200) || 'Assistant';
    if (body.description !== undefined) updatePayload.description = typeof body.description === 'string' ? sanitizeText(body.description, 2000) : null;
    const roleTypes = ['website_chatbot', 'support_agent', 'lead_qualification', 'internal_knowledge', 'workflow_agent', 'sales_agent', 'booking_agent', 'quote_assistant', 'faq_agent', 'follow_up_agent', 'custom'];
    if (body.role_type !== undefined && roleTypes.includes(body.role_type)) {
      updatePayload.role_type = body.role_type;
    }
    if (body.system_prompt !== undefined) updatePayload.system_prompt = typeof body.system_prompt === 'string' ? sanitizeText(body.system_prompt, 16000) : null;
    if (body.goal !== undefined) updatePayload.goal = typeof body.goal === 'string' ? sanitizeText(body.goal, 2000) : null;
    if (body.tone !== undefined) updatePayload.tone = typeof body.tone === 'string' ? sanitizeText(body.tone, 200) : null;
    if (body.fallback_behavior !== undefined) updatePayload.fallback_behavior = typeof body.fallback_behavior === 'string' ? sanitizeText(body.fallback_behavior, 2000) : null;
    if (body.escalation_behavior !== undefined) updatePayload.escalation_behavior = typeof body.escalation_behavior === 'string' ? sanitizeText(body.escalation_behavior, 2000) : null;
    if (body.linked_knowledge_source_ids !== undefined) {
      updatePayload.linked_knowledge_source_ids = Array.isArray(body.linked_knowledge_source_ids)
        ? body.linked_knowledge_source_ids.filter((x: unknown) => typeof x === 'string').slice(0, 50)
        : [];
    }
    // Model is fixed to OpenAI; do not allow changes
    if (body.temperature !== undefined) {
      const t = typeof body.temperature === 'number' ? body.temperature : Number(body.temperature);
      if (Number.isFinite(t) && t >= 0 && t <= 2) updatePayload.temperature = t;
    }
    if (body.enabled_tools !== undefined) {
      updatePayload.enabled_tools = Array.isArray(body.enabled_tools) ? body.enabled_tools.filter((t: unknown) => typeof t === 'string').slice(0, 32) : [];
    }
    if (typeof body.widget_enabled === 'boolean') updatePayload.widget_enabled = body.widget_enabled;
    const supabase = createAdminClient();
    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
    if (body.enabled_tools !== undefined) {
      const tools = Array.isArray(body.enabled_tools) ? body.enabled_tools.filter((t: unknown) => typeof t === 'string').slice(0, 32) : [];
      if (tools.length > 0) {
        const toolAllowed = await canUseToolCalling(supabase, organizationId, adminAllowed);
        if (!toolAllowed) {
          const plan = await getPlanForOrg(supabase, organizationId);
          const currentSlug = normalizePlanSlug(plan?.slug ?? 'free') ?? 'free';
          return planUpgradeRequiredResponse({
            message: 'Tool calling is not available on your current plan. Upgrade to Pro or above.',
            currentPlan: currentSlug,
            requiredPlan: getUpgradePlanForFeature('tool_calling'),
            feature: 'tool_calling',
          });
        }
      }
    }
    if (typeof body.webhook_enabled === 'boolean') {
      const allowed = await hasWebhookAccess(supabase, organizationId, adminAllowed);
      if (body.webhook_enabled && !allowed) {
        const plan = await getPlanForOrg(supabase, organizationId);
        const currentSlug = normalizePlanSlug(plan?.slug ?? 'free') ?? 'free';
        return planUpgradeRequiredResponse({
          message: 'Webhook access is not available on your plan. Upgrade to Pro or above.',
          currentPlan: currentSlug,
          requiredPlan: getUpgradePlanForFeature('webhooks'),
          feature: 'webhooks',
        });
      }
      updatePayload.webhook_enabled = body.webhook_enabled;
    }
    if (typeof body.memory_short_term_enabled === 'boolean') updatePayload.memory_short_term_enabled = body.memory_short_term_enabled;
    if (typeof body.memory_long_term_enabled === 'boolean') updatePayload.memory_long_term_enabled = body.memory_long_term_enabled;

    if (Object.keys(updatePayload).length === 0) {
      const { data } = await supabase.from('agents').select('*').eq('id', agentId).eq('organization_id', organizationId).single();
      return NextResponse.json(data ?? { error: 'Agent not found' }, { status: data ? 200 : 404 });
    }

    const { data, error } = await supabase
      .from('agents')
      .update(updatePayload)
      .eq('id', agentId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      console.error('[API] agents PATCH', error);
      return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    return handleApiError(err, 'agents/PATCH/:id');
  }
}

/** DELETE /api/agents/:id */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { id } = await context.params;
    const agentId = normalizeUuid(id);
    if (!isUuid(agentId)) return NextResponse.json({ error: 'Invalid agent id' }, { status: 400 });

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', agentId)
      .eq('organization_id', organizationId);

    if (error) {
      console.error('[API] agents DELETE', error);
      return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err, 'agents/DELETE/:id');
  }
}
