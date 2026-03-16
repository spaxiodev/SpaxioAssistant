/**
 * Finalize AI page run and create outcomes (quote request, lead, ticket). Public; validated by run_id.
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPageRun, updatePageRunState } from '@/lib/ai-pages/session-service';
import { createOutcomesForRun } from '@/lib/ai-pages/outcome-service';
import { getClientIp, isUuid, normalizeUuid } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';

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
  const rawRunId = body.run_id ?? body.runId;

  const runId = normalizeUuid(String(rawRunId));
  if (!isUuid(runId)) {
    return NextResponse.json({ error: 'Invalid run_id' }, { status: 400, headers: corsHeaders });
  }

  const key = `ai-page-complete:ip:${ip}`;
  const rl = rateLimit({ key, limit: 20, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: corsHeaders });
  }

  const supabase = createAdminClient();

  const { data: run } = await supabase
    .from('ai_page_runs')
    .select('id, organization_id, ai_page_id, conversation_id, status, session_state')
    .eq('id', runId)
    .maybeSingle();

  if (!run || run.status !== 'active') {
    return NextResponse.json({ error: 'Session not found or already completed' }, { status: 404, headers: corsHeaders });
  }

  const { data: page } = await supabase
    .from('ai_pages')
    .select('page_type, outcome_config')
    .eq('id', run.ai_page_id)
    .single();

  const outcomeConfig = (page?.outcome_config as { create_quote_request?: boolean; create_lead?: boolean; create_ticket?: boolean }) ?? {};
  const sessionState = (run.session_state as { collected_fields?: Record<string, unknown> }) ?? {};

  const result = await createOutcomesForRun(supabase, {
    organizationId: run.organization_id,
    aiPageId: run.ai_page_id,
    runId: run.id,
    conversationId: run.conversation_id,
    sessionState,
    pageType: page?.page_type ?? 'general',
    outcomeConfig: {
      create_quote_request: outcomeConfig.create_quote_request !== false && (run.session_state as Record<string, unknown>)?.collected_fields != null,
      create_lead: outcomeConfig.create_lead !== false,
      create_ticket: outcomeConfig.create_ticket !== false,
    },
  });

  return NextResponse.json(
    {
      success: true,
      run_id: runId,
      quote_request_id: result.quoteRequestId,
      lead_id: result.leadId,
      support_ticket_id: result.supportTicketId,
    },
    { headers: corsHeaders }
  );
}
