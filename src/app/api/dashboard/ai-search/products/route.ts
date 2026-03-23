import { NextResponse } from 'next/server';
import { getOrganizationId } from '@/lib/auth-server';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-error';
import { getPlanForOrg } from '@/lib/entitlements';
import { hasFeatureAccess } from '@/lib/plan-config';

export async function GET(request: Request) {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const limit = Math.min(500, Math.max(1, Number(searchParams.get('limit')) || 200));

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('catalog_products')
      .select('*')
      .eq('organization_id', orgId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ products: data ?? [] });
  } catch (err) {
    return handleApiError(err, 'dashboard/ai-search/products GET');
  }
}

type IncomingProduct = {
  id?: string;
  external_id?: string | null;
  title: string;
  description?: string | null;
  tags?: string[];
  category?: string | null;
  attributes?: Record<string, unknown>;
  variants?: unknown;
  price?: number | null;
  compare_at_price?: number | null;
  cost?: number | null;
  margin?: number | null;
  inventory_count?: number;
  promoted?: boolean;
  popularity_score?: number;
  custom_boost_score?: number;
  searchable_metadata?: Record<string, unknown>;
  image_url?: string | null;
  product_url?: string | null;
  active?: boolean;
};

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

    const body = await request.json().catch(() => ({}));
    const items: IncomingProduct[] = Array.isArray(body.products) ? body.products : [];
    if (items.length === 0) return NextResponse.json({ error: 'products array required' }, { status: 400 });
    if (items.length > 200) return NextResponse.json({ error: 'Max 200 products per request' }, { status: 400 });

    const rows = items.map((p) => {
      const title = typeof p.title === 'string' ? p.title.trim().slice(0, 500) : '';
      if (!title) return null;
      return {
        external_id: typeof p.external_id === 'string' ? p.external_id.slice(0, 200) : null,
        title,
        description: typeof p.description === 'string' ? p.description.slice(0, 8000) : null,
        tags: Array.isArray(p.tags) ? p.tags.map((t) => String(t).slice(0, 80)).slice(0, 40) : [],
        category: typeof p.category === 'string' ? p.category.slice(0, 200) : null,
        attributes: p.attributes && typeof p.attributes === 'object' ? p.attributes : {},
        variants: p.variants ?? [],
        price: typeof p.price === 'number' ? p.price : null,
        compare_at_price: typeof p.compare_at_price === 'number' ? p.compare_at_price : null,
        cost: typeof p.cost === 'number' ? p.cost : null,
        margin: typeof p.margin === 'number' ? p.margin : null,
        inventory_count: typeof p.inventory_count === 'number' ? Math.round(p.inventory_count) : 0,
        promoted: Boolean(p.promoted),
        popularity_score: typeof p.popularity_score === 'number' ? p.popularity_score : 0,
        custom_boost_score: typeof p.custom_boost_score === 'number' ? p.custom_boost_score : 0,
        searchable_metadata:
          p.searchable_metadata && typeof p.searchable_metadata === 'object' ? p.searchable_metadata : {},
        image_url: typeof p.image_url === 'string' ? p.image_url.slice(0, 2000) : null,
        product_url: typeof p.product_url === 'string' ? p.product_url.slice(0, 2000) : null,
        active: p.active !== false,
        organization_id: orgId,
      };
    });

    const clean = rows.filter((r): r is NonNullable<typeof r> => r != null);
    if (clean.length === 0) return NextResponse.json({ error: 'No valid products' }, { status: 400 });

    const { data, error } = await supabase.from('catalog_products').insert(clean).select('id');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ inserted: (data ?? []).length });
  } catch (err) {
    return handleApiError(err, 'dashboard/ai-search/products POST');
  }
}
