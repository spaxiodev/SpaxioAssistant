import type { AiSearchRankingConfig, CatalogProductRow, ParsedQuery, RankedProduct, SearchMode } from './types';
import { computeLexicalRelevance } from './lexical-relevance';
import {
  computeCatalogStats,
  cumulativePriorityBonus,
  inventoryScore,
  popularityScoreNorm,
  profitScore,
  promotionScore,
} from './business-scores';

function relevanceThreshold(mode: SearchMode): number {
  if (mode === 'strict') return 0.48;
  if (mode === 'broad') return 0.26;
  return 0.34;
}

export function rankProducts(
  products: CatalogProductRow[],
  parsed: ParsedQuery,
  settings: AiSearchRankingConfig
): RankedProduct[] {
  if (products.length === 0) return [];

  const stats = computeCatalogStats(products);
  const threshold = relevanceThreshold(settings.search_mode);

  const rw = settings.relevance_weight;
  const pw = settings.profit_weight;
  const promW = settings.promotion_weight;
  const invW = settings.inventory_weight;
  const popW = settings.popularity_weight;

  const scored: RankedProduct[] = [];

  for (const p of products) {
    const relevance = computeLexicalRelevance(p, parsed, settings.search_mode);
    if (relevance < threshold) continue;

    const profit = profitScore(p, stats, settings.use_custom_boost);
    const prom = promotionScore(p);
    const inv = inventoryScore(p, stats);
    const pop = popularityScoreNorm(p, stats);

    const pri = cumulativePriorityBonus(p, settings.priority_order, stats);

    const final =
      relevance * rw +
      profit * pw +
      prom * promW +
      inv * invW +
      pop * popW +
      pri;

    scored.push({
      product: p,
      relevance_score: relevance,
      profit_score: profit,
      promotion_score: prom,
      inventory_score: inv,
      popularity_score_norm: pop,
      final_score: final,
      match_explanation: '',
      badges: [],
    });
  }

  scored.sort((a, b) => b.final_score - a.final_score);
  return scored.slice(0, 24);
}
