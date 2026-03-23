import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CatalogProductRow,
  ContentSearchHit,
  ParsedQuery,
  AiSearchRankingConfig,
  RankedProduct,
} from './types';
import { parseNaturalLanguageQuery } from './parse-query';
import { rankProducts } from './ranking';
import { decorateResults } from './explanations';
import { searchKnowledge } from '@/lib/knowledge/search';

export function filterCatalogForSearch(
  products: CatalogProductRow[],
  filters: ParsedQuery['filters'],
  hideOutOfStock: boolean
): CatalogProductRow[] {
  return products.filter((p) => {
    if (!p.active) return false;
    if (hideOutOfStock && p.inventory_count <= 0) return false;
    if (filters.in_stock_only && p.inventory_count <= 0) return false;
    if (filters.max_price != null && p.price != null && p.price > filters.max_price) return false;
    if (filters.min_price != null && p.price != null && p.price < filters.min_price) return false;
    return true;
  });
}

export function fallbackSuggestions(products: CatalogProductRow[], locale: string): string[] {
  const pool = products.filter((p) => p.active && p.inventory_count > 0);
  const sorted = [...pool].sort((a, b) => (b.popularity_score ?? 0) - (a.popularity_score ?? 0));
  const titles = sorted.slice(0, 5).map((p) => p.title);
  if (titles.length > 0) return titles;
  if (locale.startsWith('fr')) {
    return ['Voir les nouveautés', 'Meilleures ventes', 'Promotions'];
  }
  return ['New arrivals', 'Best sellers', 'Deals under $50'];
}

export type PipelineResult = {
  parsed: ParsedQuery;
  results: RankedProduct[];
  contentHits: ContentSearchHit[];
  fallbackSuggestions: string[];
};

export async function runAiSearchPipeline(
  supabase: SupabaseClient,
  organizationId: string,
  rawQuery: string,
  conversationHistory: { role: string; content: string }[],
  locale: string,
  config: AiSearchRankingConfig
): Promise<PipelineResult> {
  const { data: rows } = await supabase
    .from('catalog_products')
    .select('*')
    .eq('organization_id', organizationId)
    .limit(2500);

  const products = (rows ?? []) as CatalogProductRow[];

  const parsed = await parseNaturalLanguageQuery(rawQuery, conversationHistory, locale);

  const filtered = filterCatalogForSearch(products, parsed.filters, config.hide_out_of_stock);

  const ranked = rankProducts(filtered, parsed, config);
  const decorated = decorateResults(ranked, parsed, locale);

  let contentHits: ContentSearchHit[] = [];
  if (config.include_site_content && rawQuery.trim().length > 2) {
    const lang = locale.slice(0, 2).toLowerCase();
    const matches = await searchKnowledge(supabase, {
      organizationId,
      query: rawQuery,
      matchCount: 4,
      matchThreshold: 0.48,
      preferredLanguage: lang,
    });
    contentHits = matches.map((m) => ({
      type: 'content' as const,
      chunk_id: m.chunk_id,
      title: m.document_title,
      snippet: m.content.slice(0, 420),
      source_name: m.source_name,
      similarity: m.similarity,
    }));
  }

  const suggestions =
    decorated.length === 0 ? fallbackSuggestions(products, locale) : [];

  return {
    parsed,
    results: decorated,
    contentHits,
    fallbackSuggestions: suggestions,
  };
}
