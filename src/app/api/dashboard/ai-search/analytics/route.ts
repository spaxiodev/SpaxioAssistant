import { NextResponse } from 'next/server';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-error';

export async function GET() {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAdminClient();
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: events, error } = await supabase
      .from('ai_search_events')
      .select('event_type, query_text, normalized_intent, product_id, metadata, created_at')
      .eq('organization_id', orgId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(5000);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = events ?? [];
    const queries = rows.filter((e) => e.event_type === 'query').length;
    const clicks = rows.filter((e) => e.event_type === 'click' || e.event_type === 'conversion').length;
    const noResults = rows.filter((e) => e.event_type === 'no_results').length;

    const intentCounts: Record<string, number> = {};
    for (const e of rows) {
      if (e.event_type === 'query' && e.normalized_intent) {
        const k = e.normalized_intent.slice(0, 200);
        intentCounts[k] = (intentCounts[k] ?? 0) + 1;
      }
    }
    const topIntents = Object.entries(intentCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([intent, count]) => ({ intent, count }));

    const productClicks: Record<string, number> = {};
    for (const e of rows) {
      if ((e.event_type === 'click' || e.event_type === 'conversion') && e.product_id) {
        productClicks[e.product_id] = (productClicks[e.product_id] ?? 0) + 1;
      }
    }

    const topProductIds = Object.entries(productClicks)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id);

    let marginImpact = { estimated_margin_usd: 0 as number, clicks_with_margin: 0 };
    if (topProductIds.length > 0) {
      const { data: prods } = await supabase
        .from('catalog_products')
        .select('id, price, margin, cost')
        .eq('organization_id', orgId)
        .in('id', topProductIds);

      if (prods && prods.length > 0) {
        let sum = 0;
        let n = 0;
        for (const p of prods) {
          const clicksN = productClicks[p.id] ?? 0;
          let m = 0;
          if (p.margin != null && typeof p.margin === 'number') {
            m = p.margin > 1 ? p.margin / 100 : p.margin;
          } else if (p.price != null && p.cost != null && p.price > 0) {
            m = (p.price - p.cost) / p.price;
          }
          if (m > 0 && p.price != null) {
            sum += m * p.price * clicksN;
            n += clicksN;
          }
        }
        marginImpact = { estimated_margin_usd: Math.round(sum * 100) / 100, clicks_with_margin: n };
      }
    }

    const recommendedProducts = topProductIds.length
      ? (
          await supabase
            .from('catalog_products')
            .select('id, title')
            .eq('organization_id', orgId)
            .in('id', topProductIds)
        ).data ?? []
      : [];

    return NextResponse.json({
      period_days: 30,
      total_queries: queries,
      total_clicks: clicks,
      no_result_searches: noResults,
      top_intents: topIntents,
      margin_impact: marginImpact,
      frequently_recommended: recommendedProducts.map((p) => ({
        id: p.id,
        title: p.title,
        clicks: productClicks[p.id] ?? 0,
      })),
    });
  } catch (err) {
    return handleApiError(err, 'dashboard/ai-search/analytics');
  }
}
