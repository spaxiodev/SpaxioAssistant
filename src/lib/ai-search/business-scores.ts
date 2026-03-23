import type { CatalogProductRow, PriorityKey } from './types';

export type CatalogStats = {
  maxInventory: number;
  maxPopularity: number;
  maxBoost: number;
  maxPrice: number;
  newestTs: number;
};

export function computeCatalogStats(products: CatalogProductRow[]): CatalogStats {
  let maxInventory = 1;
  let maxPopularity = 1;
  let maxBoost = 1;
  let maxPrice = 1;
  let newestTs = 0;
  for (const p of products) {
    maxInventory = Math.max(maxInventory, p.inventory_count);
    maxPopularity = Math.max(maxPopularity, Math.abs(p.popularity_score ?? 0));
    maxBoost = Math.max(maxBoost, Math.abs(p.custom_boost_score ?? 0));
    if (p.price != null) maxPrice = Math.max(maxPrice, p.price);
    const ts = Date.parse(p.created_at);
    if (!Number.isNaN(ts)) newestTs = Math.max(newestTs, ts);
  }
  return { maxInventory, maxPopularity, maxBoost, maxPrice, newestTs };
}

function effectiveMargin(p: CatalogProductRow): number | null {
  if (p.margin != null && Number.isFinite(p.margin)) {
    const m = p.margin;
    return m > 1 ? m / 100 : m;
  }
  if (p.price != null && p.cost != null && p.price > 0) {
    return (p.price - p.cost) / p.price;
  }
  return null;
}

export function profitScore(
  p: CatalogProductRow,
  stats: CatalogStats,
  useCustomBoost: boolean
): number {
  const m = effectiveMargin(p);
  if (m != null) return Math.max(0, Math.min(1, m));
  if (useCustomBoost && stats.maxBoost > 0) {
    return Math.max(0, Math.min(1, (p.custom_boost_score ?? 0) / stats.maxBoost));
  }
  if (p.promoted) return 0.45;
  return 0.2;
}

export function promotionScore(p: CatalogProductRow): number {
  return p.promoted ? 1 : 0.15;
}

export function inventoryScore(p: CatalogProductRow, stats: CatalogStats): number {
  if (stats.maxInventory <= 0) return 0;
  return Math.max(0, Math.min(1, p.inventory_count / stats.maxInventory));
}

export function popularityScoreNorm(p: CatalogProductRow, stats: CatalogStats): number {
  if (stats.maxPopularity <= 0) return 0;
  return Math.max(0, Math.min(1, (p.popularity_score ?? 0) / stats.maxPopularity));
}

export function newestScore(p: CatalogProductRow, stats: CatalogStats): number {
  if (!stats.newestTs) return 0.5;
  const ts = Date.parse(p.created_at);
  if (Number.isNaN(ts)) return 0.35;
  return Math.max(0, Math.min(1, ts / stats.newestTs));
}

/** Small additive bonus so owner priorities break ties without overriding relevance. */
export function priorityBonus(
  p: CatalogProductRow,
  key: PriorityKey,
  stats: CatalogStats
): number {
  switch (key) {
    case 'promoted':
      return p.promoted ? 0.04 : 0;
    case 'high_margin':
      return profitScore(p, stats, true) * 0.03;
    case 'overstock':
      return inventoryScore(p, stats) * 0.03;
    case 'newest':
      return newestScore(p, stats) * 0.03;
    case 'popular':
      return popularityScoreNorm(p, stats) * 0.03;
    default:
      return 0;
  }
}

export function cumulativePriorityBonus(
  p: CatalogProductRow,
  order: PriorityKey[],
  stats: CatalogStats
): number {
  let s = 0;
  for (let i = 0; i < order.length; i++) {
    const w = (order.length - i) / order.length;
    s += w * priorityBonus(p, order[i], stats);
  }
  return s;
}
