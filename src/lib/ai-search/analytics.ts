import type { SupabaseClient } from '@supabase/supabase-js';

export type AiSearchEventType = 'query' | 'click' | 'no_results' | 'conversion' | 'session_intent';

export async function logAiSearchEvent(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    widgetId: string | null;
    eventType: AiSearchEventType;
    queryText?: string | null;
    normalizedIntent?: string | null;
    locale?: string | null;
    productId?: string | null;
    sessionId?: string | null;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await supabase.from('ai_search_events').insert({
      organization_id: params.organizationId,
      widget_id: params.widgetId,
      event_type: params.eventType,
      query_text: params.queryText ?? null,
      normalized_intent: params.normalizedIntent ?? null,
      locale: params.locale ?? null,
      product_id: params.productId ?? null,
      session_id: params.sessionId ?? null,
      metadata: params.metadata ?? {},
    });
  } catch (e) {
    console.warn('[ai-search] analytics insert failed', e);
  }
}
