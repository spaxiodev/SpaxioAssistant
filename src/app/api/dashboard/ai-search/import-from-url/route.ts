import { NextResponse } from 'next/server';
import { getOrganizationId } from '@/lib/auth-server';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-error';
import { getPlanForOrg } from '@/lib/entitlements';
import { hasFeatureAccess } from '@/lib/plan-config';
import { rateLimit } from '@/lib/rate-limit';
import { runImportProductsFromUrl } from '@/lib/ai-search/import-from-url/run-import';
import { draftToCatalogInsert } from '@/lib/ai-search/import-from-url/map-to-rows';

const BATCH = 80;

export async function POST(request: Request) {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAdminClient();
    const adminAllowed = await isOrgAllowedByAdmin(supabase, orgId);
    const plan = await getPlanForOrg(supabase, orgId);
    const effectiveSlug = adminAllowed ? 'enterprise' : plan?.slug;
    if (!hasFeatureAccess(effectiveSlug, 'ai_search')) {
      return NextResponse.json({ error: 'Upgrade required' }, { status: 403 });
    }

    const rl = rateLimit({ key: `ai-search-import-url:${orgId}`, limit: 12, windowMs: 60 * 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Import rate limit reached. Try again in about an hour.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const urlInput = typeof body.url === 'string' ? body.url.trim() : '';
    const replaceExisting = body.replaceExisting === true;

    if (!urlInput.length || urlInput.length > 2000) {
      return NextResponse.json({ error: 'A valid page URL is required.' }, { status: 400 });
    }

    const result = await runImportProductsFromUrl(urlInput);
    let rows = result.products.map((d) => draftToCatalogInsert(orgId, d, result.finalUrl));

    if (replaceExisting) {
      const { error: delErr } = await supabase.from('catalog_products').delete().eq('organization_id', orgId);
      if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    } else {
      const { data: existing } = await supabase
        .from('catalog_products')
        .select('external_id, product_url')
        .eq('organization_id', orgId)
        .limit(5000);

      const extSet = new Set<string>();
      const urlSet = new Set<string>();
      for (const e of existing ?? []) {
        if (e.external_id) extSet.add(String(e.external_id));
        if (e.product_url) urlSet.add(String(e.product_url));
      }

      rows = rows.filter((r) => {
        const ext = r.external_id != null ? String(r.external_id) : null;
        const u = r.product_url != null ? String(r.product_url) : null;
        if (ext && extSet.has(ext)) return false;
        if (u && urlSet.has(u)) return false;
        return true;
      });
    }

    if (rows.length === 0) {
      return NextResponse.json({
        ok: true,
        inserted: 0,
        skipped: result.products.length,
        method: result.method,
        finalUrl: result.finalUrl,
        jsonLdCount: result.jsonLdCount,
        message: 'No new products to add (duplicates skipped or catalog unchanged).',
      });
    }

    let inserted = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      const { error } = await supabase.from('catalog_products').insert(chunk);
      if (error) {
        return NextResponse.json(
          { error: error.message, inserted, partial: true },
          { status: 500 }
        );
      }
      inserted += chunk.length;
    }

    return NextResponse.json({
      ok: true,
      inserted,
      method: result.method,
      finalUrl: result.finalUrl,
      jsonLdCount: result.jsonLdCount,
      totalExtracted: result.products.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import failed';
    if (
      message.includes('Invalid URL') ||
      message.includes('could not') ||
      message.includes('Could not') ||
      message.includes('No products') ||
      message.includes('OPENAI') ||
      message.includes('Too little') ||
      message.includes('Page too large') ||
      message.includes('HTTP')
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return handleApiError(err, 'dashboard/ai-search/import-from-url');
  }
}
