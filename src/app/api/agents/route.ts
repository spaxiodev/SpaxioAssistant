import { createAdminClient } from '@/lib/supabase/admin';
import { getOrganizationId } from '@/lib/auth-server';
import { NextResponse } from 'next/server';
import { sanitizeText } from '@/lib/validation';
import { handleApiError } from '@/lib/api-error';
import { canCreateAgent } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';

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
      return NextResponse.json(
        { error: 'Agent limit reached', code: 'plan_limit', message: 'Upgrade your plan to create more agents.' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const name = sanitizeText(body.name, 200) || 'Assistant';
    const description = typeof body.description === 'string' ? sanitizeText(body.description, 2000) : null;
    const roleTypes = ['website_chatbot', 'support_agent', 'lead_qualification', 'internal_knowledge', 'workflow_agent', 'sales_agent', 'booking_agent', 'quote_assistant', 'faq_agent', 'follow_up_agent', 'custom'];
    const roleType = roleTypes.includes(body.role_type) ? body.role_type : 'website_chatbot';
    const systemPrompt = typeof body.system_prompt === 'string' ? sanitizeText(body.system_prompt, 16000) : null;
    const modelProvider = ['openai', 'anthropic', 'openrouter', 'custom'].includes(body.model_provider) ? body.model_provider : 'openai';
    const modelId = sanitizeText(body.model_id, 128) || 'gpt-4o-mini';
    const tempNum = typeof body.temperature === 'number' ? body.temperature : Number(body.temperature);
    const temperature = Number.isFinite(tempNum) && tempNum >= 0 && tempNum <= 2 ? tempNum : 0.7;
    const enabledTools = Array.isArray(body.enabled_tools) ? body.enabled_tools.filter((t: unknown) => typeof t === 'string').slice(0, 32) : [];
    const widgetEnabled = typeof body.widget_enabled === 'boolean' ? body.widget_enabled : true;
    const webhookEnabled = typeof body.webhook_enabled === 'boolean' ? body.webhook_enabled : false;

    const insertPayload = {
      organization_id: organizationId,
      name,
      description: description || null,
      role_type: roleType,
      system_prompt: systemPrompt,
      model_provider: modelProvider,
      model_id: modelId,
      temperature,
      enabled_tools: enabledTools,
      widget_enabled: widgetEnabled,
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
      if (!result.error) {
        return NextResponse.json(result.data);
      }
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
      const { data: unlinkedWidget } = await supabase
        .from('widgets')
        .select('id')
        .eq('organization_id', organizationId)
        .is('agent_id', null)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (unlinkedWidget) {
        await supabase.from('widgets').update({ agent_id: agent.id }).eq('id', unlinkedWidget.id);
      }
    }

    return NextResponse.json(result.data);
  } catch (err) {
    return handleApiError(err, 'agents/POST');
  }
}
