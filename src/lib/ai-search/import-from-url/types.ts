/** Normalized product row before insert into catalog_products */
export type ExtractedProductDraft = {
  title: string;
  description?: string | null;
  price?: number | null;
  compare_at_price?: number | null;
  image_url?: string | null;
  product_url?: string | null;
  external_id?: string | null;
  category?: string | null;
  tags?: string[];
};

export type ImportFromUrlResult = {
  products: ExtractedProductDraft[];
  method: 'json_ld' | 'openai';
  pageUrl: string;
  finalUrl: string;
  /** How many Product nodes were found in JSON-LD before capping (0 if OpenAI path). */
  jsonLdCount: number;
};
