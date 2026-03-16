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
      handoff_context: handoffContext ?? undefined,
    },
    { headers: corsHeaders }
  );
}
