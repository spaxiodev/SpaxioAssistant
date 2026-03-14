import { createAdminClient } from '@/lib/supabase/admin';
import { getOrganizationId } from '@/lib/auth-server';
import { NextResponse } from 'next/server';
import { sanitizeText } from '@/lib/validation';
import { handleApiError } from '@/lib/api-error';
import { isUuid, normalizeUuid } from '@/lib/validation';
import { hasWebhookAccess } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';

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
    if (body.role_type !== undefined && ['website_chatbot', 'support_agent', 'lead_qualification', 'internal_knowledge', 'workflow_agent', 'custom'].includes(body.role_type)) {
      updatePayload.role_type = body.role_type;
    }
    if (body.system_prompt !== undefined) updatePayload.system_prompt = typeof body.system_prompt === 'string' ? sanitizeText(body.system_prompt, 16000) : null;
    if (body.model_provider !== undefined && ['openai', 'anthropic', 'openrouter', 'custom'].includes(body.model_provider)) {
      updatePayload.model_provider = body.model_provider;
    }
    if (body.model_id !== undefined) updatePayload.model_id = sanitizeText(body.model_id, 128) || 'gpt-4o-mini';
    if (body.temperature !== undefined && typeof body.temperature === 'number' && body.temperature >= 0 && body.temperature <= 2) {
      updatePayload.temperature = body.temperature;
    }
    if (body.enabled_tools !== undefined) {
      updatePayload.enabled_tools = Array.isArray(body.enabled_tools) ? body.enabled_tools.filter((t: unknown) => typeof t === 'string').slice(0, 32) : [];
    }
    if (typeof body.widget_enabled === 'boolean') updatePayload.widget_enabled = body.widget_enabled;
    if (typeof body.webhook_enabled === 'boolean') {
      const supabase = createAdminClient();
      const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
      const allowed = await hasWebhookAccess(supabase, organizationId, adminAllowed);
      if (body.webhook_enabled && !allowed) {
        return NextResponse.json(
          { error: 'Webhook access is not available on your plan', code: 'plan_limit', message: 'Upgrade your plan to enable webhooks.' },
          { status: 403 }
        );
      }
      updatePayload.webhook_enabled = body.webhook_enabled;
    }
    if (typeof body.memory_short_term_enabled === 'boolean') updatePayload.memory_short_term_enabled = body.memory_short_term_enabled;
    if (typeof body.memory_long_term_enabled === 'boolean') updatePayload.memory_long_term_enabled = body.memory_long_term_enabled;

    if (Object.keys(updatePayload).length === 0) {
      const supabase = createAdminClient();
      const { data } = await supabase.from('agents').select('*').eq('id', agentId).eq('organization_id', organizationId).single();
      return NextResponse.json(data ?? { error: 'Agent not found' }, { status: data ? 200 : 404 });
    }

    const supabase = createAdminClient();
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
