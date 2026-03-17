import { getOrganizationId } from '@/lib/auth-server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTool, getTools } from '@/lib/tools/registry';
import type { ToolContext } from '@/lib/tools/types';
import { handleApiError } from '@/lib/api-error';
import { isUuid, normalizeUuid } from '@/lib/validation';
import { recordAiActionUsage } from '@/lib/billing/usage';
import { canUseToolCalling, getPlanForOrg } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { planUpgradeRequiredResponse } from '@/lib/api-plan-error';
import { getNextPlanSlug, normalizePlanSlug } from '@/lib/plan-config';

/**
 * POST /api/tools/run
 * Body: { toolId: string, parameters?: Record<string, unknown>, agentId?: string, conversationId?: string, widgetId?: string }
 * Runs a tool for the current org. If agentId is provided, verifies the agent has the tool enabled.
 */
export async function POST(request: Request) {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const toolId = typeof body.toolId === 'string' ? body.toolId.trim() : '';
    const parameters = body.parameters != null && typeof body.parameters === 'object' ? body.parameters : {};
    const agentId = body.agentId != null ? normalizeUuid(String(body.agentId)) : null;
    const conversationId = body.conversationId != null ? normalizeUuid(String(body.conversationId)) : null;
    const widgetId = body.widgetId != null ? normalizeUuid(String(body.widgetId)) : null;

    if (!toolId) {
      return NextResponse.json({ error: 'Missing toolId' }, { status: 400 });
    }

    const tool = getTool(toolId);
    if (!tool) {
      return NextResponse.json({ error: 'Unknown tool', toolId }, { status: 400 });
    }

    const supabase = createAdminClient();
    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
    const toolCallingAllowed = await canUseToolCalling(supabase, organizationId, adminAllowed);
    if (!toolCallingAllowed) {
      const plan = await getPlanForOrg(supabase, organizationId);
      const currentSlug = normalizePlanSlug(plan?.slug ?? 'free') ?? 'free';
      return planUpgradeRequiredResponse({
        message: 'Tool calling is not available on your plan. Upgrade to Pro to use tools.',
        currentPlan: currentSlug,
        requiredPlan: getNextPlanSlug(currentSlug),
        feature: 'tool_calling',
      });
    }

    if (agentId && isUuid(agentId)) {
      const { data: agent } = await supabase
        .from('agents')
        .select('id, enabled_tools')
        .eq('id', agentId)
        .eq('organization_id', organizationId)
        .single();
      if (agent && Array.isArray(agent.enabled_tools) && !agent.enabled_tools.includes(toolId)) {
        return NextResponse.json({ error: 'Tool not enabled for this agent', toolId }, { status: 403 });
      }
    }

    const context: ToolContext = {
      organizationId,
      supabase,
      conversationId: conversationId && isUuid(conversationId) ? conversationId : null,
      agentId: agentId && isUuid(agentId) ? agentId : null,
      widgetId: widgetId && isUuid(widgetId) ? widgetId : null,
    };

    const result = await tool.execute(parameters, context);
    await recordAiActionUsage(supabase, organizationId);
    const output = typeof result === 'string' ? result : JSON.stringify(result);
    return NextResponse.json({ success: true, output });
  } catch (err) {
    console.error('[API] tools/run', err);
    return handleApiError(err, 'tools/run');
  }
}
