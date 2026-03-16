/**
 * Create or resume AI page session. Public (no auth); validated by slug + optional handoff token.
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPublishedPageBySlug } from '@/lib/ai-pages/config-service';
import { resolveHandoffToken } from '@/lib/ai-pages/handoff-service';
import { createPageRun, getPageRunByConversation } from '@/lib/ai-pages/session-service';
import { rateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/validation';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const body = await request.json().catch(() => ({}));
  const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
  const handoffToken = typeof body.handoff_token === 'string' ? body.handoff_token.trim() : null;

  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400, headers: corsHeaders });
  }

  const key = `ai-page-session:ip:${ip}`;
  const rl = rateLimit({ key, limit: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: corsHeaders });
  }

  const supabase = createAdminClient();
  const page = await getPublishedPageBySlug(supabase, slug);
  if (!page) {
    return NextResponse.json({ error: 'Page not found or not published' }, { status: 404, headers: corsHeaders });
  }

  let handoffConversationId: string | null = null;
  if (handoffToken) {
    const resolved = await resolveHandoffToken(supabase, handoffToken);
    if (resolved && resolved.aiPageId === page.id) {
      handoffConversationId = resolved.conversationId;
    }
  }

  const result = await createPageRun(supabase, {
    organizationId: page.organization_id,
    aiPageId: page.id,
    handoffConversationId: handoffConversationId || undefined,
  });

  if (!result) {
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500, headers: corsHeaders });
  }

  return NextResponse.json(
    {
      run_id: result.runId,
      conversation_id: result.conversationId,
      page_slug: slug,
    },
    { headers: corsHeaders }
  );
}
