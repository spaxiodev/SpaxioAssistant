import { NextResponse } from 'next/server';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-error';
import { getPlanForOrg } from '@/lib/entitlements';
import { hasFeatureAccess } from '@/lib/plan-config';
import { ensureAiSearchSettingsRow } from '@/lib/ai-search/ensure-settings';
import { rowToRankingConfig, normalizePriorityOrder, normalizeQuickPrompts } from '@/lib/ai-search/settings-defaults';

const DISPLAY_MODES = new Set(['replace_search', 'beside_search', 'modal', 'widget_only']);
const SEARCH_MODES = new Set(['strict', 'balanced', 'broad']);

export async function GET() {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAdminClient();
    const plan = await getPlanForOrg(supabase, orgId);
    const featureOk = hasFeatureAccess(plan?.slug, 'ai_search');

    let row: Record<string, unknown>;
    try {
      row = await ensureAiSearchSettingsRow(supabase, orgId);
    } catch {
      return NextResponse.json(
        { error: 'AI Search tables are not ready. Run the latest database migration in Supabase.' },
        { status: 503 }
      );
    }
    const { data: widget } = await supabase
      .from('widgets')
      .select('id')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const config = rowToRankingConfig(row);
    return NextResponse.json({
      settings: { ...config, id: row.id },
      widgetId: widget?.id ?? null,
      featureAccess: { ai_search: featureOk } as Record<string, boolean>,
    });
  } catch (err) {
    return handleApiError(err, 'dashboard/ai-search/settings GET');
  }
}

export async function POST(request: Request) {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAdminClient();
    const plan = await getPlanForOrg(supabase, orgId);
    if (!hasFeatureAccess(plan?.slug, 'ai_search')) {
      return NextResponse.json({ error: 'Upgrade required' }, { status: 403 });
    }

    try {
      await ensureAiSearchSettingsRow(supabase, orgId);
    } catch {
      return NextResponse.json(
        { error: 'AI Search tables are not ready. Run the latest database migration in Supabase.' },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const updates: Record<string, unknown> = {};

    if (typeof body.enabled === 'boolean') updates.enabled = body.enabled;
    if (typeof body.display_mode === 'string' && DISPLAY_MODES.has(body.display_mode)) {
      updates.display_mode = body.display_mode;
    }
    if (typeof body.search_mode === 'string' && SEARCH_MODES.has(body.search_mode)) {
      updates.search_mode = body.search_mode;
    }

    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(2, Math.max(0, v)) : null);
    const rw = num(body.relevance_weight);
    if (rw != null) updates.relevance_weight = rw;
    const pw = num(body.profit_weight);
    if (pw != null) updates.profit_weight = pw;
    const prom = num(body.promotion_weight);
    if (prom != null) updates.promotion_weight = prom;
    const iw = num(body.inventory_weight);
    if (iw != null) updates.inventory_weight = iw;
    const popw = num(body.popularity_weight);
    if (popw != null) updates.popularity_weight = popw;

    if (typeof body.use_custom_boost === 'boolean') updates.use_custom_boost = body.use_custom_boost;
    if (typeof body.hide_out_of_stock === 'boolean') updates.hide_out_of_stock = body.hide_out_of_stock;
    if (typeof body.include_site_content === 'boolean') updates.include_site_content = body.include_site_content;

    if (body.priority_order !== undefined) {
      updates.priority_order = normalizePriorityOrder(body.priority_order);
    }
    if (body.quick_prompts !== undefined) {
      updates.quick_prompts = normalizeQuickPrompts(body.quick_prompts);
    }

    const { data, error } = await supabase
      .from('ai_search_settings')
      .update(updates)
      .eq('organization_id', orgId)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const config = rowToRankingConfig(data as Record<string, unknown>);
    return NextResponse.json({ settings: { ...config, id: data.id } });
  } catch (err) {
    return handleApiError(err, 'dashboard/ai-search/settings POST');
  }
}
