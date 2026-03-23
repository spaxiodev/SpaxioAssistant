export type SearchMode = 'strict' | 'balanced' | 'broad';

export type AiSearchDisplayMode = 'replace_search' | 'beside_search' | 'modal' | 'widget_only';

export type PriorityKey = 'high_margin' | 'overstock' | 'promoted' | 'newest' | 'popular';

/** Runtime config for ranking (from DB row or defaults). */
export type AiSearchRankingConfig = {
  enabled: boolean;
  display_mode: AiSearchDisplayMode;
  search_mode: SearchMode;
  relevance_weight: number;
  profit_weight: number;
  promotion_weight: number;
  inventory_weight: number;
  popularity_weight: number;
  use_custom_boost: boolean;
  hide_out_of_stock: boolean;
  priority_order: PriorityKey[];
  include_site_content: boolean;
  quick_prompts: string[];
};

export type AiSearchSettingsRow = AiSearchRankingConfig & {
  id: string;
  organization_id: string;
};

export type CatalogProductRow = {
  id: string;
  organization_id: string;
  external_id: string | null;
  title: string;
  description: string | null;
  tags: string[] | null;
  category: string | null;
  attributes: Record<string, unknown> | null;
  variants: unknown;
  price: number | null;
  compare_at_price: number | null;
  cost: number | null;
  margin: number | null;
  inventory_count: number;
  promoted: boolean;
  popularity_score: number;
  custom_boost_score: number;
  searchable_metadata: Record<string, unknown> | null;
  image_url: string | null;
  product_url: string | null;
  active: boolean;
  created_at: string;
};

export type StructuredFilters = {
  category: string | null;
  colors: string[];
  sizes: string[];
  materials: string[];
  max_price: number | null;
  min_price: number | null;
  styles: string[];
  use_case: string | null;
  keywords: string[];
  must_have_text: string[];
  in_stock_only: boolean;
};

export type ParsedQuery = {
  intent_summary: string;
  normalized_intent: string;
  filters: StructuredFilters;
};

export type ProductBadge = 'recommended' | 'best_value' | 'popular' | 'premium';

export type RankedProduct = {
  product: CatalogProductRow;
  relevance_score: number;
  profit_score: number;
  promotion_score: number;
  inventory_score: number;
  popularity_score_norm: number;
  final_score: number;
  match_explanation: string;
  badges: ProductBadge[];
};

export type ContentSearchHit = {
  type: 'content';
  chunk_id: string;
  title: string | null;
  snippet: string;
  source_name: string;
  similarity: number;
};
