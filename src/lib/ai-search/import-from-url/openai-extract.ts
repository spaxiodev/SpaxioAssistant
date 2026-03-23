import type { ExtractedProductDraft } from './types';

function normalizeDraft(p: Record<string, unknown>, baseUrl: string): ExtractedProductDraft | null {
  const title = typeof p.title === 'string' ? p.title.trim() : '';
  if (!title || title.length > 500) return null;

  const description =
    typeof p.description === 'string' ? p.description.slice(0, 8000) : null;
  const price = typeof p.price === 'number' && Number.isFinite(p.price) ? p.price : null;
  const compare =
    typeof p.compare_at_price === 'number' && Number.isFinite(p.compare_at_price)
      ? p.compare_at_price
      : null;
  let image_url: string | null = typeof p.image_url === 'string' ? p.image_url : null;
  let product_url: string | null = typeof p.product_url === 'string' ? p.product_url : null;
  const sku = typeof p.sku === 'string' ? p.sku.slice(0, 200) : null;
  const category = typeof p.category === 'string' ? p.category.slice(0, 200) : null;
  const tags = Array.isArray(p.tags)
    ? p.tags.filter((t): t is string => typeof t === 'string').map((t) => t.slice(0, 80)).slice(0, 40)
    : [];

  try {
    if (image_url) image_url = new URL(image_url, baseUrl).href;
  } catch {
    image_url = null;
  }
  try {
    if (product_url) product_url = new URL(product_url, baseUrl).href;
  } catch {
    product_url = null;
  }

  return {
    title,
    description,
    price,
    compare_at_price: compare,
    image_url,
    product_url,
    external_id: sku,
    category,
    tags,
  };
}

/**
 * When JSON-LD has no products, extract structured products from visible page text.
 */
export async function extractProductsWithOpenAI(pageText: string, sourceUrl: string): Promise<ExtractedProductDraft[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  let baseUrl: string;
  try {
    baseUrl = new URL(sourceUrl).origin;
  } catch {
    baseUrl = sourceUrl;
  }

  const OpenAI = (await import('openai')).default;
  const openai = new OpenAI({ apiKey });

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    temperature: 0.15,
    max_tokens: 4096,
    messages: [
      {
        role: 'system',
        content: `You extract product listings from text copied from a store or catalogue web page.
Return ONLY valid JSON: { "products": [ ... ] }.
Each product must have:
- title (string, required)
- description (string or null)
- price (number or null) — numeric amount only, no currency symbol in the number
- compare_at_price (number or null) — original/list price if shown as struck-through or "was" price
- image_url (string or null) — absolute https URL if clearly present in the text
- product_url (string or null) — absolute https product link if present
- sku (string or null)
- category (string or null)
- tags (string array, optional)

Rules:
- Include only real purchasable products, not shipping, warranties, or site policies.
- Skip duplicate titles.
- Maximum 200 products.
- If the page has no products, return { "products": [] }.`,
      },
      {
        role: 'user',
        content: `Page URL: ${sourceUrl}\n\n--- PAGE TEXT ---\n\n${pageText.slice(0, 28_000)}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? '';
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  const parsed = JSON.parse(cleaned) as { products?: unknown };
  const arr = Array.isArray(parsed.products) ? parsed.products : [];
  const out: ExtractedProductDraft[] = [];
  const seen = new Set<string>();

  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const d = normalizeDraft(item as Record<string, unknown>, baseUrl);
    if (!d) continue;
    const key = d.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(d);
    if (out.length >= 200) break;
  }

  return out;
}
