import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { getClientIp, isUuid, normalizeUuid, sanitizeText } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { hasActiveSubscription } from '@/lib/entitlements';
import { widgetNoSubscriptionResponse } from '@/lib/billing/access';
import { recordMessageUsage } from '@/lib/billing/usage';
import { getPlanForOrg } from '@/lib/entitlements';
import { hasFeatureAccess } from '@/lib/plan-config';
import { ensureAiSearchSettingsRow } from '@/lib/ai-search/ensure-settings';
import { rowToRankingConfig, defaultRankingConfig } from '@/lib/ai-search/settings-defaults';
import { runAiSearchPipeline } from '@/lib/ai-search/pipeline';
import { logAiSearchEvent } from '@/lib/ai-search/analytics';
import type { RankedProduct } from '@/lib/ai-search/types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function normalizeLanguageCode(value: unknown): string {
  if (typeof value !== 'string') return 'en';
  const v = value.trim().toLowerCase();
  return v.slice(0, 2) || 'en';
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

function serializeResult(r: RankedProduct) {
  return {
    id: r.product.id,
    title: r.product.title,
    description: r.product.description,
    price: r.product.price,
    compare_at_price: r.product.compare_at_price,
    image_url: r.product.image_url,
    product_url: r.product.product_url,
    badges: r.badges,
    match_explanation: r.match_explanation,
    relevance_score: r.relevance_score,
  };
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const body = await request.json().catch(() => ({}));
  const rawWidgetId = body.widgetId;
  const query = sanitizeText(body.query ?? body.message, 4000);
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.slice(0, 128) : '';
  const language = normalizeLanguageCode(body.language ?? body.locale);
  const history = Array.isArray(body.conversationHistory)
    ? (body.conversationHistory as { role: string; content: string }[])
        .filter((m) => m && typeof m.content === 'string')
        .map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content.slice(0, 2000),
        }))
        .slice(-8)
    : [];

  if (!rawWidgetId || !query.trim()) {
    return NextResponse.json({ error: 'Missing widgetId or query' }, { status: 400, headers: corsHeaders });
  }

  const widgetId = normalizeUuid(String(rawWidgetId));
  if (!isUuid(widgetId)) {
    return NextResponse.json({ error: 'Invalid widgetId' }, { status: 400, headers: corsHeaders });
  }

  const keyBase = `widget-ai-search:${widgetId}`;
  const perIp = rateLimit({ key: `${keyBase}:ip:${ip}`, limit: 40, windowMs: 60_000 });
  if (!perIp.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: corsHeaders });
  }

  const supabase = createAdminClient();
  const { data: widget, error: wErr } = await supabase
    .from('widgets')
    .select('id, organization_id')
    .eq('id', widgetId)
    .single();

  if (wErr || !widget) {
    return NextResponse.json({ error: 'Widget not found' }, { status: 404, headers: corsHeaders });
  }

  const { data: settingsRow } = await supabase
    .from('business_settings')
    .select('default_language, fallback_language')
    .eq('organization_id', widget.organization_id)
    .maybeSingle();

  const adminAllowed = await isOrgAllowedByAdmin(supabase, widget.organization_id);
  const allowed = await hasActiveSubscription(supabase, widget.organization_id, adminAllowed);
  if (!allowed) {
    return NextResponse.json(widgetNoSubscriptionResponse(), { status: 402, headers: corsHeaders });
  }

  const plan = await getPlanForOrg(supabase, widget.organization_id);
  if (!hasFeatureAccess(plan?.slug, 'ai_search')) {
    return NextResponse.json({ error: 'Feature not available', upgrade: true }, { status: 403, headers: corsHeaders });
  }

  const row = await ensureAiSearchSettingsRow(supabase, widget.organization_id);
  const config = rowToRankingConfig(row) ?? defaultRankingConfig();

  if (!config.enabled) {
    return NextResponse.json({ error: 'AI Search is disabled', disabled: true }, { status: 403, headers: corsHeaders });
  }

  const effectiveLocale =
    language && language !== 'en'
      ? language
      : normalizeLanguageCode(settingsRow?.default_language ?? 'en');

  const pipeline = await runAiSearchPipeline(
    supabase,
    widget.organization_id,
    query,
    history,
    effectiveLocale,
    config
  );

  await recordMessageUsage(supabase, widget.organization_id);

  await logAiSearchEvent(supabase, {
    organizationId: widget.organization_id,
    widgetId: widget.id,
    eventType: 'query',
    queryText: query.slice(0, 2000),
    normalizedIntent: pipeline.parsed.normalized_intent,
    locale: effectiveLocale,
    sessionId: sessionId || null,
    metadata: {
      result_count: pipeline.results.length,
    },
  });

  if (pipeline.results.length === 0) {
    await logAiSearchEvent(supabase, {
      organizationId: widget.organization_id,
      widgetId: widget.id,
      eventType: 'no_results',
      queryText: query.slice(0, 2000),
      normalizedIntent: pipeline.parsed.normalized_intent,
      locale: effectiveLocale,
      sessionId: sessionId || null,
    });
  }

  return NextResponse.json(
    {
      intent_summary: pipeline.parsed.intent_summary,
      normalized_intent: pipeline.parsed.normalized_intent,
      results: pipeline.results.map(serializeResult),
      content_hits: pipeline.contentHits,
      fallback_suggestions: pipeline.fallbackSuggestions,
      quick_prompts: config.quick_prompts,
      display_mode: config.display_mode,
    },
    { headers: corsHeaders }
  );
}
