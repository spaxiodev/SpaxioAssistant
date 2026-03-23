import type { CatalogProductRow, ParsedQuery, ProductBadge, RankedProduct } from './types';

function formatMoney(amount: number | null, locale: string): string {
  if (amount == null) return '';
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
      amount
    );
  } catch {
    return `$${Math.round(amount)}`;
  }
}

export function buildMatchExplanation(p: CatalogProductRow, parsed: ParsedQuery, locale: string): string {
  const parts: string[] = [];
  const hay = [p.title, p.description ?? '', ...(p.tags ?? [])].join(' ').toLowerCase();

  for (const k of parsed.filters.keywords) {
    if (k && hay.includes(k.toLowerCase())) {
      parts.push(k);
      if (parts.length >= 2) break;
    }
  }

  if (parsed.filters.use_case && hay.includes(parsed.filters.use_case.toLowerCase())) {
    parts.push(parsed.filters.use_case);
  }

  if (p.category && parsed.filters.category && p.category.toLowerCase().includes(parsed.filters.category.toLowerCase())) {
    parts.push(p.category);
  }

  if (p.price != null && parsed.filters.max_price != null && p.price <= parsed.filters.max_price) {
    parts.push(formatMoney(p.price, locale));
  }

  if (locale.startsWith('fr')) {
    return `Correspond à votre recherche${parts.length ? ` (${parts.slice(0, 3).join(', ')})` : ''}.`;
  }
  return `Matches what you asked for${parts.length ? ` (${parts.slice(0, 3).join(', ')})` : ''}.`;
}

export function decorateResults(ranked: RankedProduct[], parsed: ParsedQuery, locale: string): RankedProduct[] {
  if (ranked.length === 0) return ranked;

  const prices = ranked.map((r) => r.product.price).filter((x): x is number => x != null && x > 0);
  const maxPrice = Math.max(...prices, 1);
  const maxPop = Math.max(...ranked.map((r) => r.popularity_score_norm), 0.01);

  return ranked.map((r, i) => {
    const badges: ProductBadge[] = [];
    const p = r.product;

    if (i === 0) badges.push('recommended');

    if (
      p.compare_at_price != null &&
      p.price != null &&
      p.compare_at_price > p.price * 1.05 &&
      r.relevance_score > 0.45
    ) {
      badges.push('best_value');
    }

    if (r.popularity_score_norm >= maxPop * 0.85 && maxPop > 0.2) {
      badges.push('popular');
    }

    if (p.price != null && p.price >= maxPrice * 0.9 && ranked.length > 2) {
      badges.push('premium');
    }

    return {
      ...r,
      badges: [...new Set(badges)],
      match_explanation: buildMatchExplanation(p, parsed, locale),
    };
  });
}
