import { createAdminClient } from '@/lib/supabase/admin';
import { getOrganizationIdOrFromApiKey } from '@/lib/api-key-auth';
import { NextResponse } from 'next/server';
import { sanitizeText } from '@/lib/validation';
import { handleApiError } from '@/lib/api-error';
import { isUuid, normalizeUuid } from '@/lib/validation';
import { TRIGGER_TYPES, ACTION_TYPES } from '@/lib/automations/types';
import {
  generateWebhookToken,
  generateWebhookSecret,
  buildAutomationWebhookUrl,
} from '@/lib/automations/webhook-url';

type RouteContext = { params: Promise<{ id: string }> };

type AutomationRow = {
  id: string;
  organization_id: string;
  trigger_type: string;
  webhook_token?: string | null;
  webhook_secret?: string | null;
  [key: string]: unknown;
};

/** Ensure automation with webhook_received has a webhook_token; return updated row if we backfilled. */
async function ensureWebhookToken(
  supabase: ReturnType<typeof createAdminClient>,
  automation: AutomationRow
): Promise<AutomationRow> {
  if (automation.trigger_type !== 'webhook_received' || automation.webhook_token) {
    return automation;
  }
  const token = generateWebhookToken();
  const secret = generateWebhookSecret();
  const { data: updated, error } = await supabase
    .from('automations')
    .update({ webhook_token: token, webhook_secret: secret })
    .eq('id', automation.id)
    .eq('organization_id', automation.organization_id)
    .select()
    .single();
  if (error || !updated) return automation;
  return updated as AutomationRow;
}

/** GET /api/automations/:id (session or API key). Adds webhook_url when trigger_type = webhook_received; backfills webhook_token if missing. */
export async function GET(request: Request, context: RouteContext) {
  try {
    const organizationId = await getOrganizationIdOrFromApiKey(request);
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized', code: 'auth_required' }, { status: 403 });

    const { id } = await context.params;
    const automationId = normalizeUuid(id);
    if (!isUuid(automationId))
      return NextResponse.json({ error: 'Invalid automation id' }, { status: 400 });

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('automations')
      .select('*')
      .eq('id', automationId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }

    let row = data as AutomationRow;
    row = await ensureWebhookToken(supabase, row);
    const out = { ...row };
    if (row.trigger_type === 'webhook_received' && row.webhook_token) {
      (out as Record<string, unknown>).webhook_url = buildAutomationWebhookUrl(row.webhook_token, request);
    }
    return NextResponse.json(out);
  } catch (err) {
    return handleApiError(err, 'automations/GET/:id');
  }
}

/** PATCH /api/automations/:id (session or API key). */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const organizationId = await getOrganizationIdOrFromApiKey(request);
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized', code: 'auth_required' }, { status: 403 });

    const { id } = await context.params;
    const automationId = normalizeUuid(id);
    if (!isUuid(automationId))
      return NextResponse.json({ error: 'Invalid automation id' }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const updatePayload: Record<string, unknown> = {};

    if (body.name !== undefined) updatePayload.name = sanitizeText(body.name, 200) || 'Untitled automation';
    if (body.description !== undefined)
      updatePayload.description =
        typeof body.description === 'string' ? sanitizeText(body.description, 2000) : null;
    if (body.status !== undefined && ['draft', 'active', 'paused'].includes(body.status)) {
      updatePayload.status = body.status;
    }
    if (body.trigger_type !== undefined && TRIGGER_TYPES.includes(body.trigger_type)) {
      updatePayload.trigger_type = body.trigger_type;
    }
    if (body.trigger_config !== undefined && typeof body.trigger_config === 'object') {
      updatePayload.trigger_config = body.trigger_config;
    }
    if (body.action_type !== undefined && ACTION_TYPES.includes(body.action_type)) {
      updatePayload.action_type = body.action_type;
    }
    if (body.action_config !== undefined && typeof body.action_config === 'object') {
      updatePayload.action_config = body.action_config;
    }
    if (body.agent_id !== undefined) {
      updatePayload.agent_id =
        body.agent_id === null || body.agent_id === ''
          ? null
          : typeof body.agent_id === 'string'
            ? body.agent_id.trim()
            : null;
    }
    if (body.template_key !== undefined) {
      updatePayload.template_key =
        typeof body.template_key === 'string' ? sanitizeText(body.template_key, 100) : null;
    }
    if (body.regenerate_webhook === true) {
      updatePayload.webhook_token = generateWebhookToken();
      updatePayload.webhook_secret = generateWebhookSecret();
    }

    const supabase = createAdminClient();
    const effectiveTriggerType = body.trigger_type !== undefined ? body.trigger_type : undefined;
    if (
      effectiveTriggerType === 'webhook_received' &&
      !updatePayload.webhook_token &&
      !updatePayload.webhook_secret
    ) {
      const { data: current } = await supabase
        .from('automations')
        .select('webhook_token')
        .eq('id', automationId)
        .eq('organization_id', organizationId)
        .single();
      const currentRow = current as { webhook_token?: string | null } | null;
      if (!currentRow?.webhook_token) {
        updatePayload.webhook_token = generateWebhookToken();
        updatePayload.webhook_secret = generateWebhookSecret();
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      const { data } = await supabase
        .from('automations')
        .select('*')
        .eq('id', automationId)
        .eq('organization_id', organizationId)
        .single();
      let out = data as AutomationRow | null;
      if (out) out = await ensureWebhookToken(supabase, out);
      if (out && out.trigger_type === 'webhook_received' && out.webhook_token) {
        (out as Record<string, unknown>).webhook_url = buildAutomationWebhookUrl(out.webhook_token, request);
      }
      return NextResponse.json(out ?? { error: 'Automation not found' }, { status: out ? 200 : 404 });
    }

    const { data, error } = await supabase
      .from('automations')
      .update(updatePayload)
      .eq('id', automationId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      console.error('[API] automations PATCH', error);
      return NextResponse.json({ error: 'Failed to update automation' }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    let out = data as AutomationRow;
    if (out.trigger_type === 'webhook_received' && out.webhook_token) {
      (out as Record<string, unknown>).webhook_url = buildAutomationWebhookUrl(out.webhook_token, request);
    }
    return NextResponse.json(out);
  } catch (err) {
    return handleApiError(err, 'automations/PATCH/:id');
  }
}

/** DELETE /api/automations/:id (session or API key). */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const organizationId = await getOrganizationIdOrFromApiKey(request);
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized', code: 'auth_required' }, { status: 403 });

    const { id } = await context.params;
    const automationId = normalizeUuid(id);
    if (!isUuid(automationId))
      return NextResponse.json({ error: 'Invalid automation id' }, { status: 400 });

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('automations')
      .delete()
      .eq('id', automationId)
      .eq('organization_id', organizationId);

    if (error) {
      console.error('[API] automations DELETE', error);
      return NextResponse.json({ error: 'Failed to delete automation' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err, 'automations/DELETE/:id');
  }
}
