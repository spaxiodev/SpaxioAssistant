/**
 * Inbound webhook for automation events.
 * External systems POST with workspace-scoped secret to trigger automations.
 * Auth: X-Webhook-Secret or Authorization: Bearer. Body: { event_type, payload? }.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { emitAutomationEvent } from '@/lib/automations/engine';
import { isValidTriggerType, AUTOMATION_EVENT_PAYLOAD_MAX_BYTES, TRIGGER_TYPES } from '@/lib/automations/types';
import { canUseAutomation } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { handleApiError } from '@/lib/api-error';
import { rateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/validation';

function getSecretFromRequest(request: Request): string | null {
  const header = request.headers.get('x-webhook-secret');
  if (header?.trim()) return header.trim();
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim();
  return null;
}

export async function POST(request: Request) {
  try {
    const secret = getSecretFromRequest(request);
    if (!secret) {
      return NextResponse.json(
        { error: 'Missing webhook secret', code: 'auth_required' },
        { status: 401 }
      );
    }

    const ip = getClientIp(request);
    const rateLimitByIp = rateLimit({ key: `automations-events-ip:${ip}`, limit: 120, windowMs: 60_000 });
    const rateLimitBySecret = rateLimit({ key: `automations-events:${secret.slice(0, 12)}`, limit: 60, windowMs: 60_000 });
    if (!rateLimitByIp.allowed || !rateLimitBySecret.allowed) {
      return NextResponse.json({ error: 'Too many requests', code: 'rate_limited' }, { status: 429 });
    }

    const rawBody = await request.text();
    if (rawBody.length > AUTOMATION_EVENT_PAYLOAD_MAX_BYTES) {
      return NextResponse.json(
        { error: 'Payload too large', code: 'payload_too_large' },
        { status: 413 }
      );
    }
    let body: Record<string, unknown>;
    try {
      body = (rawBody ? JSON.parse(rawBody) : {}) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body', code: 'validation_error' },
        { status: 400 }
      );
    }
    const eventType = typeof body.event_type === 'string' ? body.event_type.trim() : '';
    const payload = body.payload && typeof body.payload === 'object' ? body.payload as Record<string, unknown> : {};

    if (!eventType) {
      return NextResponse.json(
        { error: 'Missing event_type', code: 'validation_error' },
        { status: 400 }
      );
    }
    if (!isValidTriggerType(eventType)) {
      return NextResponse.json(
        { error: 'Invalid event_type', code: 'validation_error', allowed: [...TRIGGER_TYPES] },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data: settings, error: fetchError } = await supabase
      .from('business_settings')
      .select('organization_id, webhook_secret')
      .eq('webhook_secret', secret)
      .maybeSingle();

    if (fetchError || !settings?.organization_id) {
      return NextResponse.json({ error: 'Invalid webhook secret', code: 'auth_failed' }, { status: 401 });
    }

    const organizationId = settings.organization_id;
    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
    const allowed = await canUseAutomation(supabase, organizationId, adminAllowed);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Automations not available for this workspace' },
        { status: 403 }
      );
    }

    const traceId = body.trace_id && typeof body.trace_id === 'string'
      ? body.trace_id.slice(0, 128)
      : undefined;
    const correlationId = body.correlation_id && typeof body.correlation_id === 'string'
      ? body.correlation_id.slice(0, 128)
      : undefined;

    const result = await emitAutomationEvent(supabase, {
      organization_id: organizationId,
      event_type: eventType,
      payload: { ...payload, trigger_type: eventType },
      trace_id: traceId,
      correlation_id: correlationId,
      source: 'webhook_inbound',
    });

    return NextResponse.json({
      ok: true,
      run_ids: result.runIds,
      ...(result.errors.length > 0 && { errors: result.errors }),
    });
  } catch (err) {
    return handleApiError(err, 'automations/events/POST');
  }
}
