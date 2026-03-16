import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { getClientIp, isUuid, normalizeUuid } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { emitAutomationEvent } from '@/lib/automations/engine';
import { canUseAutomation } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { triggerFollowUpRun } from '@/lib/follow-up/trigger-follow-up';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

function sanitize(s: unknown): string {
  if (s == null) return '';
  return String(s).slice(0, 5000);
}

const withCors = (body: object, status: number) =>
  NextResponse.json(body, { status, headers: corsHeaders });

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const body = await request.json().catch(() => ({}));
    const rawWidgetId = body.widgetId;
    const rawConversationId = body.conversationId ?? null;
    const widgetId = rawWidgetId ? normalizeUuid(String(rawWidgetId)) : '';
    let conversationId: string | null = null;
    if (rawConversationId && typeof rawConversationId === 'string') {
      const candidate = normalizeUuid(rawConversationId);
      if (isUuid(candidate)) conversationId = candidate;
    }

    const customerName = sanitize(body.customerName).slice(0, 500);
    const serviceType = sanitize(body.serviceType).slice(0, 500);
    const projectDetails = sanitize(body.projectDetails).slice(0, 2000);
    const dimensionsSize = sanitize(body.dimensionsSize).slice(0, 500);
    const location = sanitize(body.location).slice(0, 500);
    const notes = sanitize(body.notes).slice(0, 2000);
    const budgetText = sanitize(body.budgetText ?? body.budget).slice(0, 500);
    const budgetAmount = typeof body.budgetAmount === 'number' && Number.isFinite(body.budgetAmount)
      ? body.budgetAmount
      : null;

    if (!rawWidgetId || !customerName) {
      return withCors({ error: 'Missing required fields' }, 400);
    }
    if (!isUuid(widgetId)) {
      return withCors({ error: 'Invalid widgetId' }, 400);
    }

    const perIpKey = `widget-quote:ip:${ip}`;
    const rl = rateLimit({ key: perIpKey, limit: 30, windowMs: 60_000 });
    if (!rl.allowed) {
      return withCors({ error: 'Too many requests' }, 429);
    }

    const supabase = createAdminClient();
    const { data: widget, error: widgetError } = await supabase
      .from('widgets')
      .select('id, organization_id')
      .eq('id', widgetId)
      .single();

    if (widgetError || !widget) {
      return withCors({ error: 'Widget not found' }, 404);
    }

    const { data: quote } = await supabase
      .from('quote_requests')
      .insert({
        organization_id: widget.organization_id,
        conversation_id: conversationId,
        customer_name: customerName,
        service_type: serviceType || null,
        project_details: projectDetails || null,
        dimensions_size: dimensionsSize || null,
        location: location || null,
        notes: notes || null,
        budget_text: budgetText || null,
        budget_amount: budgetAmount,
      })
      .select('id')
      .single();

    if (!quote) {
      return withCors({ error: 'Failed to save quote request' }, 500);
    }

    // AI follow-up run (fire-and-forget)
    if (process.env.OPENAI_API_KEY) {
      triggerFollowUpRun(supabase, {
        organizationId: widget.organization_id,
        sourceType: 'quote_request_submitted',
        sourceId: quote.id,
        context: {
          quoteRequest: {
            id: quote.id,
            customer_name: customerName,
            service_type: serviceType || null,
            project_details: projectDetails || null,
            budget_text: budgetText || null,
            budget_amount: budgetAmount,
            location: location || null,
            notes: notes || null,
          },
        },
      }).catch((err) => console.warn('[widget/quote] follow-up trigger failed', err));
    }

    const adminAllowed = await isOrgAllowedByAdmin(supabase, widget.organization_id);
    const automationsAllowed = await canUseAutomation(supabase, widget.organization_id, adminAllowed);
    if (automationsAllowed) {
      emitAutomationEvent(supabase, {
        organization_id: widget.organization_id,
        event_type: 'quote_request_submitted',
        payload: {
          trigger_type: 'quote_request_submitted',
          conversation_id: conversationId ?? undefined,
          quote_request_id: quote.id,
          customer_name: customerName,
          service_type: serviceType || undefined,
          project_details: projectDetails || undefined,
          budget_amount: budgetAmount ?? undefined,
        },
        trace_id: `quote-${quote.id}`,
        source: 'widget_quote',
        actor: { type: 'quote_request', id: quote.id },
      }).catch((err) => console.error('[widget/quote] automation emit failed', err));
    }

    return withCors({ success: true, quoteRequestId: quote.id }, 200);
  } catch (err) {
    const res = handleApiError(err, 'widget/quote');
    Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }
}
