/**
 * Widget: run pricing estimate with collected inputs. Public, rate-limited.
 * Returns total, line items, currency. Used by the inline quote form in the widget.
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getClientIp, isUuid, normalizeUuid } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { getPricingContext, runEstimate } from '@/lib/quote-pricing/estimate-quote-service';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const body = await request.json().catch(() => ({}));
  const rawWidgetId = body.widgetId;
  const widgetId = rawWidgetId ? normalizeUuid(String(rawWidgetId)) : '';
  const inputs = typeof body.inputs === 'object' && body.inputs !== null ? body.inputs as Record<string, unknown> : {};
  const serviceId = typeof body.service_id === 'string' && body.service_id ? body.service_id : null;

  if (!rawWidgetId || !isUuid(widgetId)) {
    return NextResponse.json({ error: 'Invalid or missing widgetId' }, { status: 400, headers: corsHeaders });
  }

  const perIpKey = `widget-estimate:${widgetId}:ip:${ip}`;
  const rl = rateLimit({ key: perIpKey, limit: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: corsHeaders });
  }

  const supabase = createAdminClient();
  const { data: widget, error: widgetError } = await supabase
    .from('widgets')
    .select('id, organization_id')
    .eq('id', widgetId)
    .single();

  if (widgetError || !widget) {
    return NextResponse.json({ error: 'Widget not found' }, { status: 404, headers: corsHeaders });
  }

  const context = await getPricingContext(supabase, { organizationId: widget.organization_id });
  if (!context) {
    return NextResponse.json({ error: 'Pricing not configured' }, { status: 404, headers: corsHeaders });
  }

  const result = runEstimate({
    inputs,
    context,
    serviceId: serviceId || (context.services.length === 1 ? context.services[0]!.id : null),
  });

  return NextResponse.json(
    {
      valid: result.valid,
      missing_required: result.missing_required,
      total: result.total,
      estimate_low: result.estimate_low,
      estimate_high: result.estimate_high,
      applied_rules: result.applied_rules,
      currency: context.profile.currency,
    },
    { headers: corsHeaders }
  );
}
