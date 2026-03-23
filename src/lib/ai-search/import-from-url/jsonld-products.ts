import type { ExtractedProductDraft } from './types';

function typeMatches(t: unknown, needle: string): boolean {
  if (t == null) return false;
  if (Array.isArray(t)) return t.some((x) => typeMatches(x, needle));
  return String(t).toLowerCase() === needle.toLowerCase();
}

function parseMoney(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === 'object' && v !== null && 'value' in (v as object)) {
    return parseMoney((v as { value?: unknown }).value);
  }
  return null;
}

function firstImage(img: unknown): string | null {
  if (img == null) return null;
  if (typeof img === 'string') return img;
  if (Array.isArray(img) && img.length > 0) return firstImage(img[0]);
  if (typeof img === 'object' && img !== null && 'url' in img) {
    const u = (img as { url?: unknown }).url;
    return typeof u === 'string' ? u : null;
  }
  return null;
}

function extractOfferPrice(offer: unknown): { price: number | null; compare: number | null } {
  if (!offer || typeof offer !== 'object') return { price: null, compare: null };
  const o = offer as Record<string, unknown>;
  const price =
    parseMoney(o.price) ??
    parseMoney(o.lowPrice) ??
    parseMoney((o.priceSpecification as Record<string, unknown> | undefined)?.price);
  const high = parseMoney(o.highPrice);
  if (price != null && high != null && high > price) return { price, compare: high };
  return { price, compare: null };
}

function normalizeOffers(offers: unknown): { price: number | null; compare: number | null } {
  if (offers == null) return { price: null, compare: null };
  if (Array.isArray(offers)) {
    const first = offers[0];
    return extractOfferPrice(first);
  }
  return extractOfferPrice(offers);
}

function productFromSchemaObject(
  obj: Record<string, unknown>,
  baseUrl: string
): ExtractedProductDraft | null {
  const types = obj['@type'];
  if (!typeMatches(types, 'Product')) return null;

  const name =
    (typeof obj.name === 'string' && obj.name.trim()) ||
    (typeof obj.title === 'string' && obj.title.trim()) ||
    '';
  if (!name) return null;

  const desc = typeof obj.description === 'string' ? obj.description.slice(0, 8000) : null;
  const sku = typeof obj.sku === 'string' ? obj.sku.slice(0, 200) : null;
  const { price, compare } = normalizeOffers(obj.offers);
  const image = firstImage(obj.image);
  let productUrl: string | null = typeof obj.url === 'string' ? obj.url : null;
  if (!productUrl && typeof obj['@id'] === 'string' && obj['@id'].startsWith('http')) {
    productUrl = obj['@id'];
  }

  const brand = obj.brand;
  let category: string | null = null;
  if (typeof brand === 'string') category = brand;
  else if (brand && typeof brand === 'object' && 'name' in brand) {
    const n = (brand as { name?: unknown }).name;
    if (typeof n === 'string') category = n;
  }

  const tags: string[] = [];
  if (typeof obj.category === 'string') tags.push(obj.category);

  return {
    title: name.slice(0, 500),
    description: desc,
    price,
    compare_at_price: compare,
    image_url: image ? resolveUrl(baseUrl, image) : null,
    product_url: productUrl ? resolveUrl(baseUrl, productUrl) : null,
    external_id: sku,
    category: category ? category.slice(0, 200) : null,
    tags: tags.slice(0, 20),
  };
}

function resolveUrl(base: string, href: string): string | null {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

function visitNode(
  node: unknown,
  baseUrl: string,
  out: ExtractedProductDraft[],
  seen: Set<string>
): void {
  if (node == null) return;

  if (Array.isArray(node)) {
    for (const x of node) visitNode(x, baseUrl, out, seen);
    return;
  }

  if (typeof node !== 'object') return;
  const o = node as Record<string, unknown>;

  if (o['@graph']) {
    visitNode(o['@graph'], baseUrl, out, seen);
  }

  const types = o['@type'];
  if (typeMatches(types, 'Product')) {
    const p = productFromSchemaObject(o, baseUrl);
    if (p) {
      const key = `${p.title.toLowerCase()}|${p.product_url ?? ''}|${p.external_id ?? ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(p);
      }
    }
  }

  if (typeMatches(types, 'ItemList') || typeMatches(types, 'ProductCollection')) {
    const elements = o.itemListElement;
    if (Array.isArray(elements)) {
      for (const el of elements) {
        if (el && typeof el === 'object') {
          const item = (el as Record<string, unknown>).item;
          visitNode(item, baseUrl, out, seen);
          visitNode(el, baseUrl, out, seen);
        }
      }
    }
  }

  for (const k of Object.keys(o)) {
    if (k === '@context' || k === '@type') continue;
    visitNode(o[k], baseUrl, out, seen);
  }
}

export function extractJsonLdProductBlocks(html: string, baseUrl: string): ExtractedProductDraft[] {
  const out: ExtractedProductDraft[] = [];
  const seen = new Set<string>();
  const re = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim();
    if (!raw) continue;
    try {
      const data = JSON.parse(raw) as unknown;
      visitNode(data, baseUrl, out, seen);
    } catch {
      /* ignore malformed JSON-LD */
    }
  }
  return out;
}
