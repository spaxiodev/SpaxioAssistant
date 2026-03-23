import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { getClientIp, isUuid, normalizeUuid } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { canRemoveBranding } from '@/lib/entitlements';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

async function handleConfigRequest(request: Request, rawWidgetId: string | null | undefined) {
  const ip = getClientIp(request);

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
    .select('business_name, chatbot_name, chatbot_welcome_message, primary_brand_color, widget_logo_url, widget_label_override, show_widget_label, widget_enabled, widget_position_preset, default_language, supported_languages, auto_detect_website_language, fallback_language, match_ai_response_to_website_language, show_language_switcher, custom_translations, widget_action_mappings, quote_form_config')
    .eq('organization_id', widget.organization_id)
    .single();

  const aiSearchRes = await supabase
    .from('ai_search_settings')
    .select('enabled, display_mode, quick_prompts, include_site_content')
    .eq('organization_id', widget.organization_id)
    .maybeSingle();
  const aiSearchSettings = aiSearchRes.error ? null : aiSearchRes.data;

  const enabled = settings?.widget_enabled !== false;
  const brandingAllowed = await canRemoveBranding(supabase, widget.organization_id, false);
  const showWidgetLabel = brandingAllowed ? (settings?.show_widget_label ?? false) : true;
  const widgetLabel = brandingAllowed ? (settings?.widget_label_override ?? null) : null;

  const supportedLanguages = Array.isArray(settings?.supported_languages) && settings.supported_languages.length > 0
    ? settings.supported_languages
    : ['en', 'fr', 'es', 'de', 'pt', 'it'];
  const defaultLanguage = typeof settings?.default_language === 'string' && settings.default_language.trim()
    ? settings.default_language.trim().toLowerCase().slice(0, 2)
    : 'en';
  const fallbackLanguage = typeof settings?.fallback_language === 'string' && settings.fallback_language.trim()
    ? settings.fallback_language.trim().toLowerCase().slice(0, 2)
    : 'en';
  const customTranslations = (settings?.custom_translations && typeof settings.custom_translations === 'object')
    ? (settings.custom_translations as Record<string, Record<string, string>>)
    : undefined;
  const actionMappings = (settings?.widget_action_mappings && typeof settings.widget_action_mappings === 'object')
    ? (settings.widget_action_mappings as Record<string, { selector?: string; url?: string; section_id?: string }>)
    : undefined;

  // Default pricing profile for inline quote form (AI can prompt this form; user gets estimate on the spot)
  let quoteProfileId: string | undefined;
  let quoteVariables: { key: string; label: string; variable_type: string; unit_label?: string | null; required: boolean; default_value?: string | null; options?: unknown }[] | undefined;
  let quoteCurrency: string | undefined;
  const { data: defaultProfile } = await supabase
    .from('quote_pricing_profiles')
    .select('id, currency')
    .eq('organization_id', widget.organization_id)
    .order('is_default', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (defaultProfile?.id) {
    quoteProfileId = defaultProfile.id;
    quoteCurrency = defaultProfile.currency ?? 'USD';
    const { data: vars } = await supabase
      .from('quote_pricing_variables')
      .select('key, label, variable_type, unit_label, required, default_value, options')
      .eq('pricing_profile_id', defaultProfile.id)
      .order('sort_order');
    if (vars && vars.length > 0) {
      quoteVariables = vars.map((v) => ({
        key: v.key,
        label: v.label,
        variable_type: v.variable_type,
        unit_label: v.unit_label ?? undefined,
        required: v.required ?? false,
        default_value: v.default_value ?? undefined,
        options: v.options ?? undefined,
      }));
    }
  }

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
      defaultLanguage,
      supportedLanguages,
      autoDetectWebsiteLanguage: settings?.auto_detect_website_language !== false,
      fallbackLanguage,
      matchAIResponseToWebsiteLanguage: settings?.match_ai_response_to_website_language !== false,
      showLanguageSwitcher: settings?.show_language_switcher === true,
      customTranslations: customTranslations ?? undefined,
      actionMappings: actionMappings ?? undefined,
      quoteProfileId: quoteProfileId ?? undefined,
      quoteVariables: quoteVariables ?? undefined,
      quoteCurrency: quoteCurrency ?? undefined,
      quoteFormConfig: (settings?.quote_form_config && typeof settings.quote_form_config === 'object')
        ? (settings.quote_form_config as Record<string, unknown>)
        : undefined,
      aiSearch: {
        enabled: aiSearchSettings?.enabled === true,
        displayMode: (aiSearchSettings?.display_mode as string) ?? 'modal',
        quickPrompts: Array.isArray(aiSearchSettings?.quick_prompts)
          ? (aiSearchSettings.quick_prompts as string[]).filter((s) => typeof s === 'string').slice(0, 12)
          : [],
        includeSiteContent: aiSearchSettings?.include_site_content === true,
      },
    },
    { headers: corsHeaders }
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return handleConfigRequest(request, searchParams.get('widgetId'));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const rawWidgetId = typeof body?.widgetId === 'string' ? body.widgetId : null;
  return handleConfigRequest(request, rawWidgetId);
}
