import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { getClientIp, isUuid, normalizeUuid } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { hasActiveSubscription } from '@/lib/entitlements';
import { widgetNoSubscriptionResponse } from '@/lib/billing/access';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { logAiSearchEvent } from '@/lib/ai-search/analytics';

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
  const eventType = body.eventType === 'conversion' ? 'conversion' : 'click';
  const productId = typeof body.productId === 'string' ? body.productId : '';
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.slice(0, 128) : '';
  const queryText = typeof body.query === 'string' ? body.query.slice(0, 2000) : null;
  const normalizedIntent = typeof body.normalizedIntent === 'string' ? body.normalizedIntent.slice(0, 400) : null;
  const locale = typeof body.locale === 'string' ? body.locale.slice(0, 16) : null;

  if (!rawWidgetId || !productId) {
    return NextResponse.json({ error: 'Missing widgetId or productId' }, { status: 400, headers: corsHeaders });
  }

  const widgetId = normalizeUuid(String(rawWidgetId));
  if (!isUuid(widgetId)) {
    return NextResponse.json({ error: 'Invalid widgetId' }, { status: 400, headers: corsHeaders });
  }

  const perIp = rateLimit({ key: `widget-ai-search-ev:${widgetId}:ip:${ip}`, limit: 120, windowMs: 60_000 });
  if (!perIp.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: corsHeaders });
  }

  const supabase = createAdminClient();
  const { data: widget } = await supabase.from('widgets').select('id, organization_id').eq('id', widgetId).single();

  if (!widget) {
    return NextResponse.json({ error: 'Widget not found' }, { status: 404, headers: corsHeaders });
  }

  const adminAllowed = await isOrgAllowedByAdmin(supabase, widget.organization_id);
  const allowed = await hasActiveSubscription(supabase, widget.organization_id, adminAllowed);
  if (!allowed) {
    return NextResponse.json(widgetNoSubscriptionResponse(), { status: 402, headers: corsHeaders });
  }

  const { data: product } = await supabase
    .from('catalog_products')
    .select('id, price, margin, cost')
    .eq('id', productId)
    .eq('organization_id', widget.organization_id)
    .maybeSingle();

  let marginUsd: number | null = null;
  if (product) {
    let m: number | null = null;
    if (product.margin != null && typeof product.margin === 'number') {
      m = product.margin > 1 ? product.margin / 100 : product.margin;
    } else if (product.price != null && product.cost != null && product.price > 0) {
      m = (product.price - product.cost) / product.price;
    }
    if (m != null && product.price != null) marginUsd = m * product.price;
  }

  await logAiSearchEvent(supabase, {
    organizationId: widget.organization_id,
    widgetId: widget.id,
    eventType,
    queryText,
    normalizedIntent,
    locale,
    productId,
    sessionId: sessionId || null,
    metadata: { margin_estimate_usd: marginUsd },
  });

  return NextResponse.json({ ok: true }, { headers: corsHeaders });
}
