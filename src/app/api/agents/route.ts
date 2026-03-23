import { createAdminClient } from '@/lib/supabase/admin';
import { getOrganizationId } from '@/lib/auth-server';
import { NextResponse } from 'next/server';
import { sanitizeText } from '@/lib/validation';
import { handleApiError } from '@/lib/api-error';
import { canCreateAgent, getPlanForOrg } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { getNextPlanSlug, normalizePlanSlug } from '@/lib/plan-config';
import { planUpgradeRequiredResponse } from '@/lib/api-plan-error';

/** GET /api/agents – list agents for the current organization */
export async function GET() {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API] agents GET', error);
      return NextResponse.json({ error: 'Failed to list agents' }, { status: 500 });
    }
    return NextResponse.json({ agents: data ?? [] });
  } catch (err) {
    return handleApiError(err, 'agents/GET');
  }
}

/** POST /api/agents – create an agent */
export async function POST(request: Request) {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const supabase = createAdminClient();
    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
    const allowed = await canCreateAgent(supabase, organizationId, adminAllowed);
    if (!allowed) {
      const plan = await getPlanForOrg(supabase, organizationId);
      const currentSlug = normalizePlanSlug(plan?.slug ?? 'free') ?? 'free';
      return planUpgradeRequiredResponse({
        message: 'Agent limit reached. Upgrade your plan to create more agents.',
        currentPlan: currentSlug,
        requiredPlan: getNextPlanSlug(currentSlug),
        feature: 'agents',
      });
    }

    const body = await request.json().catch(() => ({}));
    const name = sanitizeText(body.name, 200) || 'Assistant';
    const description = typeof body.description === 'string' ? sanitizeText(body.description, 2000) : null;
    const roleTypes = ['website_chatbot', 'support_agent', 'lead_qualification', 'internal_knowledge', 'workflow_agent', 'sales_agent', 'booking_agent', 'quote_assistant', 'faq_agent', 'follow_up_agent', 'custom'];
    const roleType = roleTypes.includes(body.role_type) ? body.role_type : 'website_chatbot';
    const systemPrompt = typeof body.system_prompt === 'string' ? sanitizeText(body.system_prompt, 16000) : null;
    const modelId = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
    const enabledTools = Array.isArray(body.enabled_tools) ? body.enabled_tools.filter((t: unknown) => typeof t === 'string').slice(0, 32) : [];
    const webhookEnabled = typeof body.webhook_enabled === 'boolean' ? body.webhook_enabled : false;

    const wantsWidget = true;

    const insertPayload = {
      organization_id: organizationId,
      name,
      description: description || null,
      role_type: roleType,
      system_prompt: systemPrompt,
      model_provider: 'openai',
      model_id: modelId,
      temperature: 0.7,
      enabled_tools: enabledTools,
      widget_enabled: wantsWidget,
      webhook_enabled: webhookEnabled,
    };

    let result = await supabase.from('agents').insert(insertPayload).select().single();

    if (result.error && result.error.code === '23514') {
      const fallbackRole = 'website_chatbot';
      result = await supabase
        .from('agents')
        .insert({ ...insertPayload, role_type: fallbackRole })
        .select()
        .single();
    }

    if (result.error) {
      console.error('[API] agents POST', result.error);
      const message = result.error.message || 'Failed to create agent';
      return NextResponse.json(
        { error: message, code: result.error.code },
        { status: 500 }
      );
    }

    const agent = result.data;
    if (agent?.id) {
      if (wantsWidget) {
        let widgetId: string | null = null;
        const unlinked = await supabase
          .from('widgets')
          .select('id')
          .eq('organization_id', organizationId)
          .is('agent_id', null)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (unlinked.data?.id) {
          widgetId = unlinked.data.id;
        } else {
          const created = await supabase
            .from('widgets')
            .insert({ organization_id: organizationId, name: 'Chat' })
            .select('id')
            .single();
          if (created.data?.id) widgetId = created.data.id;
        }
        if (widgetId) {
          await supabase.from('widgets').update({ agent_id: agent.id }).eq('id', widgetId);
        }
      }
    }

    return NextResponse.json(result.data);
  } catch (err) {
    return handleApiError(err, 'agents/POST');
  }
}
