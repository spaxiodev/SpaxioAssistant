import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { getClientIp, isUuid, normalizeUuid } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { canRemoveBranding } from '@/lib/entitlements';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { searchParams } = new URL(request.url);
  const rawWidgetId = searchParams.get('widgetId');

  if (!rawWidgetId || typeof rawWidgetId !== 'string') {
    return NextResponse.json({ error: 'Missing widgetId' }, { status: 400, headers: corsHeaders });
  }

  const widgetId = normalizeUuid(rawWidgetId);
  if (!isUuid(widgetId)) {
    console.warn('Invalid widgetId in config route', { ip, widgetIdSample: rawWidgetId.slice(0, 8) });
    return NextResponse.json({ error: 'Invalid widgetId' }, { status: 400, headers: corsHeaders });
  }

  const keyBase = `widget-config:${widgetId}`;
  const perIpKey = `${keyBase}:ip:${ip}`;

  const perIp = rateLimit({ key: perIpKey, limit: 60, windowMs: 60_000 });
  if (!perIp.allowed) {
    console.warn('Rate limit hit on widget config route', { ipSample: ip.slice(0, 16) });
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

  const { data: settings } = await supabase
    .from('business_settings')
    .select('business_name, chatbot_name, chatbot_welcome_message, primary_brand_color, widget_logo_url, widget_label_override, show_widget_label, widget_enabled, widget_position_preset')
    .eq('organization_id', widget.organization_id)
    .single();

  const enabled = settings?.widget_enabled !== false;
  const brandingAllowed = await canRemoveBranding(supabase, widget.organization_id, false);
  const showWidgetLabel = brandingAllowed ? (settings?.show_widget_label ?? false) : true;
  const widgetLabel = brandingAllowed ? (settings?.widget_label_override ?? null) : null;

  return NextResponse.json(
    {
      enabled,
      welcomeMessage: settings?.chatbot_welcome_message ?? 'Hi! How can I help you today?',
      chatbotName: settings?.chatbot_name ?? settings?.business_name ?? 'Assistant',
      primaryBrandColor: settings?.primary_brand_color ?? '#0f172a',
      businessName: settings?.business_name ?? null,
      widgetLogoUrl: settings?.widget_logo_url ?? null,
      widgetLabel,
      showWidgetLabel,
      positionPreset: settings?.widget_position_preset ?? 'bottom-right',
    },
    { headers: corsHeaders }
  );
}
