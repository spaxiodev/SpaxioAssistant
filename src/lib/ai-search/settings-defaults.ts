import type { AiSearchRankingConfig, PriorityKey } from './types';

export const DEFAULT_PRIORITY_ORDER: PriorityKey[] = [
  'promoted',
  'high_margin',
  'overstock',
  'newest',
  'popular',
];

export function defaultRankingConfig(): AiSearchRankingConfig {
  return {
    enabled: false,
    display_mode: 'modal',
    search_mode: 'balanced',
    relevance_weight: 1,
    profit_weight: 0.25,
    promotion_weight: 0.35,
    inventory_weight: 0.2,
    popularity_weight: 0.25,
    use_custom_boost: true,
    hide_out_of_stock: true,
    priority_order: [...DEFAULT_PRIORITY_ORDER],
    include_site_content: false,
    quick_prompts: [],
  };
}

export function normalizePriorityOrder(raw: unknown): PriorityKey[] {
  const allowed = new Set<PriorityKey>([
    'high_margin',
    'overstock',
    'promoted',
    'newest',
    'popular',
  ]);
  if (!Array.isArray(raw)) return [...DEFAULT_PRIORITY_ORDER];
  const out: PriorityKey[] = [];
  for (const x of raw) {
    if (typeof x === 'string' && allowed.has(x as PriorityKey)) {
      out.push(x as PriorityKey);
      allowed.delete(x as PriorityKey);
    }
  }
  for (const k of DEFAULT_PRIORITY_ORDER) {
    if (allowed.has(k)) out.push(k);
  }
  return out.length ? out : [...DEFAULT_PRIORITY_ORDER];
}

export function normalizeQuickPrompts(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((s) => s.trim()).slice(0, 12);
}

export function rowToRankingConfig(row: Record<string, unknown> | null): AiSearchRankingConfig | null {
  if (!row) return null;
  return {
    enabled: Boolean(row.enabled),
    display_mode: (row.display_mode as AiSearchRankingConfig['display_mode']) ?? 'modal',
    search_mode: (row.search_mode as AiSearchRankingConfig['search_mode']) ?? 'balanced',
    relevance_weight: Number(row.relevance_weight ?? 1),
    profit_weight: Number(row.profit_weight ?? 0.25),
    promotion_weight: Number(row.promotion_weight ?? 0.35),
    inventory_weight: Number(row.inventory_weight ?? 0.2),
    popularity_weight: Number(row.popularity_weight ?? 0.25),
    use_custom_boost: row.use_custom_boost !== false,
    hide_out_of_stock: row.hide_out_of_stock !== false,
    priority_order: normalizePriorityOrder(row.priority_order),
    include_site_content: Boolean(row.include_site_content),
    quick_prompts: normalizeQuickPrompts(row.quick_prompts),
  };
}
