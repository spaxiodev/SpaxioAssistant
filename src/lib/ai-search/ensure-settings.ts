import type { SupabaseClient } from '@supabase/supabase-js';
import { defaultRankingConfig } from './settings-defaults';

export async function ensureAiSearchSettingsRow(
  supabase: SupabaseClient,
  organizationId: string
): Promise<Record<string, unknown>> {
  const { data: existing } = await supabase
    .from('ai_search_settings')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (existing) return existing as Record<string, unknown>;

  const d = defaultRankingConfig();
  const { data: inserted, error } = await supabase
    .from('ai_search_settings')
    .insert({
      organization_id: organizationId,
      enabled: d.enabled,
      display_mode: d.display_mode,
      search_mode: d.search_mode,
      relevance_weight: d.relevance_weight,
      profit_weight: d.profit_weight,
      promotion_weight: d.promotion_weight,
      inventory_weight: d.inventory_weight,
      popularity_weight: d.popularity_weight,
      use_custom_boost: d.use_custom_boost,
      hide_out_of_stock: d.hide_out_of_stock,
      priority_order: d.priority_order,
      include_site_content: d.include_site_content,
      quick_prompts: d.quick_prompts,
    })
    .select('*')
    .single();

  if (error || !inserted) {
    console.error('[ai-search] ensure settings', error);
    throw new Error('Could not create AI Search settings');
  }
  return inserted as Record<string, unknown>;
}
