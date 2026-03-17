/**
 * Public AI page config by slug. Optional handoff token for context.
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPublishedPageBySlug } from '@/lib/ai-pages/config-service';
import { resolveHandoffForPublicPage } from '@/lib/ai-pages/handoff-service';
import { rateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/validation';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug')?.trim();
  const handoffToken = searchParams.get('handoff')?.trim();

  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400, headers: corsHeaders });
  }

  const key = `ai-page-config:${slug}:ip:${ip}`;
  const rl = rateLimit({ key, limit: 60, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: corsHeaders });
  }

  const supabase = createAdminClient();
  const page = await getPublishedPageBySlug(supabase, slug);
  if (!page) {
    return NextResponse.json({ error: 'Page not found or not published' }, { status: 404, headers: corsHeaders });
  }

  // Quote pages: expose pricing variables to render interactive quote form on the client.
  let quoteVariables:
    | { key: string; label: string; variable_type: string; unit_label?: string | null; required: boolean; default_value?: string | null; options?: unknown }[]
    | undefined;
  let quoteCurrency: string | undefined;
  if (page.page_type === 'quote') {
    const profileId =
      typeof (page as unknown as { pricing_profile_id?: string | null }).pricing_profile_id === 'string'
        ? (page as unknown as { pricing_profile_id?: string | null }).pricing_profile_id
        : null;
    const { data: profile } = profileId
      ? await supabase
          .from('quote_pricing_profiles')
          .select('id, currency')
          .eq('id', profileId)
          .eq('organization_id', page.organization_id)
          .maybeSingle()
      : await supabase
          .from('quote_pricing_profiles')
          .select('id, currency')
          .eq('organization_id', page.organization_id)
          .order('is_default', { ascending: false })
          .limit(1)
          .maybeSingle();

    if (profile?.id) {
      quoteCurrency = profile.currency ?? 'USD';
      const { data: vars } = await supabase
        .from('quote_pricing_variables')
        .select('key, label, variable_type, unit_label, required, default_value, options')
        .eq('pricing_profile_id', profile.id)
        .order('sort_order');
      if (vars && vars.length > 0) {
        quoteVariables = vars.map((v) => ({
          key: v.key,
          label: v.label,
          variable_type: v.variable_type,
          unit_label: v.unit_label ?? undefined,
          required: v.required ?? false,
          default_value: v.default_value ?? undefined,
          options: v.options ?? undefined,
        }));
      }
    }
  }

  let handoffContext: { intro_message?: string; context_snippet?: Record<string, unknown>; conversation_id?: string | null } | null = null;
  if (handoffToken) {
    const resolved = await resolveHandoffForPublicPage(supabase, handoffToken);
    if (resolved && resolved.pageSlug === page.slug) {
      handoffContext = {
        intro_message: undefined,
        context_snippet: resolved.contextSnippet,
        conversation_id: resolved.conversationId,
      };
    }
  }

  return NextResponse.json(
    {
      ...page,
      quoteVariables: quoteVariables ?? undefined,
      quoteCurrency: quoteCurrency ?? undefined,
      handoff_context: handoffContext ?? undefined,
    },
    { headers: corsHeaders }
  );
}
