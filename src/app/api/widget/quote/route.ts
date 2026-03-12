import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { getClientIp, isUuid, normalizeUuid } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';

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

    return withCors({ success: true, quoteRequestId: quote.id }, 200);
  } catch (err) {
    const res = handleApiError(err, 'widget/quote');
    Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }
}
