import type { CatalogProductRow, ParsedQuery, SearchMode } from './types';

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

function buildProductText(p: CatalogProductRow): string {
  const tagStr = (p.tags ?? []).join(' ');
  const attrStr =
    p.attributes && typeof p.attributes === 'object'
      ? JSON.stringify(p.attributes).toLowerCase()
      : '';
  const metaStr =
    p.searchable_metadata && typeof p.searchable_metadata === 'object'
      ? JSON.stringify(p.searchable_metadata).toLowerCase()
      : '';
  const variantStr = p.variants ? JSON.stringify(p.variants).toLowerCase() : '';
  return [
    p.title,
    p.description ?? '',
    p.category ?? '',
    tagStr,
    attrStr,
    metaStr,
    variantStr,
  ]
    .join(' ')
    .toLowerCase();
}

function modeFloor(mode: SearchMode): number {
  if (mode === 'strict') return 0.52;
  if (mode === 'broad') return 0.28;
  return 0.38;
}

/** Lexical relevance 0–1 using token overlap + filter agreement. */
export function computeLexicalRelevance(
  product: CatalogProductRow,
  parsed: ParsedQuery,
  searchMode: SearchMode
): number {
  const hay = buildProductText(product);
  const hayTokens = new Set(tokenize(hay));
  const queryTokens = new Set(
    tokenize(
      [
        parsed.intent_summary,
        parsed.filters.use_case ?? '',
        ...parsed.filters.keywords,
        ...parsed.filters.must_have_text,
        ...parsed.filters.styles,
      ].join(' ')
    )
  );

  let overlap = 0;
  let denom = 0;
  for (const t of queryTokens) {
    denom += 1;
    if (hayTokens.has(t) || hay.includes(t)) overlap += 1;
  }

  const base = denom > 0 ? overlap / Math.max(denom, 4) : 0.15;

  let filterBoost = 0;
  const f = parsed.filters;

  if (f.category && product.category) {
    if (product.category.toLowerCase().includes(f.category.toLowerCase())) filterBoost += 0.12;
  }

  for (const c of f.colors) {
    if (c && hay.includes(c.toLowerCase())) filterBoost += 0.06;
  }
  for (const s of f.sizes) {
    if (s && hay.includes(s.toLowerCase())) filterBoost += 0.05;
  }
  for (const m of f.materials) {
    if (m && hay.includes(m.toLowerCase())) filterBoost += 0.05;
  }

  if (f.max_price != null && product.price != null && product.price <= f.max_price) {
    filterBoost += 0.08;
  }
  if (f.min_price != null && product.price != null && product.price >= f.min_price) {
    filterBoost += 0.05;
  }

  if (f.in_stock_only && product.inventory_count <= 0) {
    filterBoost -= 0.4;
  }

  const raw = Math.min(1, base * 0.85 + filterBoost + 0.08);
  const floor = modeFloor(searchMode);
  if (raw < floor) return raw * 0.6;
  return raw;
}
