/**
 * Inbound webhook by automation token: POST /api/webhooks/:token
 * Finds the automation by webhook_token, validates it is active, runs it with the request body as payload.
 * No auth required: the token in the path is the secret. Each automation has an isolated endpoint.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { runAutomation } from '@/lib/automations/runner';
import type { AutomationRunInput } from '@/lib/automations/types';
import { AUTOMATION_EVENT_PAYLOAD_MAX_BYTES } from '@/lib/automations/types';
import { canUseAutomation } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { handleApiError } from '@/lib/api-error';
import { rateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/validation';

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const rawToken = (token ?? '').trim().toLowerCase();
    if (!rawToken || rawToken.length < 16) {
      return NextResponse.json(
        { error: 'Invalid webhook token', code: 'validation_error' },
        { status: 400 }
      );
    }

    const ip = getClientIp(request);
    const rateLimitByIp = rateLimit({ key: `webhooks-ip:${ip}`, limit: 120, windowMs: 60_000 });
    const rateLimitByToken = rateLimit({
      key: `webhooks:${rawToken.slice(0, 20)}`,
      limit: 60,
      windowMs: 60_000,
    });
    if (!rateLimitByIp.allowed || !rateLimitByToken.allowed) {
      return NextResponse.json({ error: 'Too many requests', code: 'rate_limited' }, { status: 429 });
    }

    const rawBody = await request.text();
    if (rawBody.length > AUTOMATION_EVENT_PAYLOAD_MAX_BYTES) {
      return NextResponse.json(
        { error: 'Payload too large', code: 'payload_too_large' },
        { status: 413 }
      );
    }

    let payload: Record<string, unknown> = {};
    if (rawBody) {
      try {
        payload = JSON.parse(rawBody) as Record<string, unknown>;
      } catch {
        return NextResponse.json(
          { error: 'Invalid JSON body', code: 'validation_error' },
          { status: 400 }
        );
      }
    }

    const supabase = createAdminClient();
    const { data: automation, error: fetchError } = await supabase
      .from('automations')
      .select('id, organization_id, name, trigger_type, trigger_config, action_type, action_config, agent_id')
      .eq('webhook_token', rawToken)
      .eq('status', 'active')
      .maybeSingle();

    if (fetchError) {
      console.error('[API] webhooks/[token] fetch', fetchError);
      return NextResponse.json({ error: 'Webhook not found', code: 'not_found' }, { status: 404 });
    }
    if (!automation) {
      return NextResponse.json({ error: 'Webhook not found', code: 'not_found' }, { status: 404 });
    }

    const adminAllowed = await isOrgAllowedByAdmin(supabase, automation.organization_id);
    const allowed = await canUseAutomation(supabase, automation.organization_id, adminAllowed);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Automations not available for this workspace', code: 'forbidden' },
        { status: 403 }
      );
    }

    const input: AutomationRunInput = {
      trigger_type: 'webhook_received',
      ...payload,
    };

    const envelope = {
      workspace_id: automation.organization_id,
      source: 'webhook_inbound',
      event_type: 'webhook.received',
      timestamp: new Date().toISOString(),
      payload: input,
    };

    const result = await runAutomation({
      automation,
      input,
      supabase,
      eventEnvelope: envelope,
    });

    return NextResponse.json({
      ok: true,
      run_id: result.runId,
      status: result.status,
      ...(result.output && Object.keys(result.output).length > 0 && { output: result.output }),
    });
  } catch (err) {
    return handleApiError(err, 'webhooks/[token]/POST');
  }
}
