import type { ExtractedProductDraft } from './types';

export function draftToCatalogInsert(
  organizationId: string,
  d: ExtractedProductDraft,
  importFinalUrl: string
): Record<string, unknown> {
  return {
    organization_id: organizationId,
    external_id: d.external_id ?? null,
    title: d.title,
    description: d.description ?? null,
    tags: d.tags ?? [],
    category: d.category ?? null,
    attributes: {},
    variants: [],
    price: d.price ?? null,
    compare_at_price: d.compare_at_price ?? null,
    cost: null,
    margin: null,
    inventory_count: 0,
    promoted: false,
    popularity_score: 0,
    custom_boost_score: 0,
    searchable_metadata: {
      import_source_url: importFinalUrl,
      import_method: 'url_import',
      imported_at: new Date().toISOString(),
    },
    image_url: d.image_url ?? null,
    product_url: d.product_url ?? null,
    active: true,
  };
}
