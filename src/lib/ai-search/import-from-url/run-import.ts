import { fetchWebsiteHtml, isValidSetupUrl, stripHtmlToText } from '@/lib/website-auto-setup/fetch-and-extract';
import { extractJsonLdProductBlocks } from './jsonld-products';
import { extractProductsWithOpenAI } from './openai-extract';
import type { ImportFromUrlResult } from './types';

const MAX_PRODUCTS = 300;

/**
 * Fetches a products page, extracts products from JSON-LD when available, otherwise uses OpenAI on visible text.
 */
export async function runImportProductsFromUrl(pageUrl: string): Promise<ImportFromUrlResult> {
  const trimmed = pageUrl.trim();
  if (!isValidSetupUrl(trimmed)) {
    throw new Error('Invalid URL. Use http(s) and a public address.');
  }

  const { html, finalUrl } = await fetchWebsiteHtml(trimmed);
  const origin = new URL(finalUrl).origin;

  let jsonLd = extractJsonLdProductBlocks(html, origin);
  const jsonLdCount = jsonLd.length;

  let method: ImportFromUrlResult['method'] = 'json_ld';

  if (jsonLd.length === 0) {
    const text = stripHtmlToText(html);
    if (text.length < 80) {
      throw new Error(
        'Could not find product data on this page. Try a collection or category URL, or ensure the page lists products.'
      );
    }
    jsonLd = await extractProductsWithOpenAI(text, finalUrl);
    method = 'openai';
  } else {
    if (jsonLd.length > MAX_PRODUCTS) {
      jsonLd = jsonLd.slice(0, MAX_PRODUCTS);
    }
    // Optional: enrich sparse JSON-LD with AI when very few items (disabled for predictability)
  }

  if (jsonLd.length === 0) {
    throw new Error('No products could be extracted. Try a different URL or add products manually.');
  }

  return {
    products: jsonLd,
    method,
    pageUrl: trimmed,
    finalUrl,
    jsonLdCount: method === 'json_ld' ? jsonLdCount : 0,
  };
}
