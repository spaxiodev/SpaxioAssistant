import { createAdminClient } from '@/lib/supabase/admin';
import { getOrganizationIdOrFromApiKey } from '@/lib/api-key-auth';
import { NextResponse } from 'next/server';
import { sanitizeText } from '@/lib/validation';
import { handleApiError } from '@/lib/api-error';
import { canUseAutomation, canCreateAutomation } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { TRIGGER_TYPES, ACTION_TYPES } from '@/lib/automations/types';
import { generateWebhookToken, generateWebhookSecret, buildAutomationWebhookUrl } from '@/lib/automations/webhook-url';

/** GET /api/automations – list automations (session or API key). Adds webhook_url when trigger_type = webhook_received. */
export async function GET(request: Request) {
  try {
    const organizationId = await getOrganizationIdOrFromApiKey(request);
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized', code: 'auth_required' }, { status: 403 });

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('automations')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API] automations GET', error);
      return NextResponse.json({ error: 'Failed to list automations' }, { status: 500 });
    }

    const list = (data ?? []) as Array<Record<string, unknown> & { trigger_type?: string; webhook_token?: string | null }>;
    const withWebhookUrl = list.map((row) => {
      if (row.trigger_type === 'webhook_received' && row.webhook_token) {
        return { ...row, webhook_url: buildAutomationWebhookUrl(row.webhook_token, request) };
      }
      return row;
    });
    return NextResponse.json({ automations: withWebhookUrl });
  } catch (err) {
    return handleApiError(err, 'automations/GET');
  }
}

/** POST /api/automations – create an automation (session or API key). */
export async function POST(request: Request) {
  try {
    const organizationId = await getOrganizationIdOrFromApiKey(request);
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized', code: 'auth_required' }, { status: 403 });

    const supabase = createAdminClient();
    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
    const allowed = await canUseAutomation(supabase, organizationId, adminAllowed);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Automations not available', code: 'plan_limit' },
        { status: 403 }
      );
    }
    const canCreate = await canCreateAutomation(supabase, organizationId, adminAllowed);
    if (!canCreate) {
      return NextResponse.json(
        { error: 'Automation limit reached', code: 'plan_limit' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const name = sanitizeText(body.name, 200) || 'Untitled automation';
    const description =
      typeof body.description === 'string' ? sanitizeText(body.description, 2000) : null;
    const status = ['draft', 'active', 'paused'].includes(body.status) ? body.status : 'draft';
    const triggerType = TRIGGER_TYPES.includes(body.trigger_type) ? body.trigger_type : 'manual_test';
    const triggerConfig =
      body.trigger_config && typeof body.trigger_config === 'object'
        ? body.trigger_config
        : {};
    const actionType = ACTION_TYPES.includes(body.action_type) ? body.action_type : 'send_email_notification';
    const actionConfig =
      body.action_config && typeof body.action_config === 'object' ? body.action_config : {};
    const agentId =
      body.agent_id === null || body.agent_id === ''
        ? null
        : typeof body.agent_id === 'string'
          ? body.agent_id.trim()
          : null;
    const templateKey =
      typeof body.template_key === 'string' ? sanitizeText(body.template_key, 100) : null;

    const insertPayload: Record<string, unknown> = {
      organization_id: organizationId,
      name,
      description,
      status,
      trigger_type: triggerType,
      trigger_config: triggerConfig,
      action_type: actionType,
      action_config: actionConfig,
      agent_id: agentId || null,
      template_key: templateKey,
    };
    if (triggerType === 'webhook_received') {
      insertPayload.webhook_token = generateWebhookToken();
      insertPayload.webhook_secret = generateWebhookSecret();
    }

    const { data: automation, error } = await supabase
      .from('automations')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error('[API] automations POST', error);
      return NextResponse.json({ error: 'Failed to create automation' }, { status: 500 });
    }

    const out = automation as Record<string, unknown> & { webhook_token?: string | null };
    if (out.trigger_type === 'webhook_received' && out.webhook_token) {
      (out as Record<string, unknown>).webhook_url = buildAutomationWebhookUrl(out.webhook_token, request);
    }
    return NextResponse.json(out);
  } catch (err) {
    return handleApiError(err, 'automations/POST');
  }
}
