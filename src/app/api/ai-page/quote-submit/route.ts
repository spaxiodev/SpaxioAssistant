/**
 * Public: submit quote form for an AI page run.
 * - Validates required contact fields
 * - Stores collected fields into run session_state
 * - Runs pricing engine (if configured) and stores estimate in session_state
 * - Creates quote_request (and related outcomes) by completing the run
 * - Returns an assistant-style reply with the estimate
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getClientIp, isUuid, normalizeUuid, sanitizeText } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import type { SessionState } from '@/lib/ai-pages/types';
import { validateCollectedFields } from '@/lib/ai-pages/intake-service';
import type { IntakeFieldSchema } from '@/lib/ai-pages/types';
import { getPricingContext, runEstimate } from '@/lib/quote-pricing/estimate-quote-service';
import { createOutcomesForRun } from '@/lib/ai-pages/outcome-service';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

function formatMoney(amount: number, currency: string) {
  const prefix = currency === 'USD' ? '$' : `${currency} `;
  return `${prefix}${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const body = await request.json().catch(() => ({}));
  const rawRunId = body.run_id ?? body.runId;
  const rawConversationId = body.conversation_id ?? body.conversationId ?? null;

  const runId = normalizeUuid(String(rawRunId));
  if (!isUuid(runId)) {
    return NextResponse.json({ error: 'Invalid run_id' }, { status: 400, headers: corsHeaders });
  }

  const key = `ai-page-quote-submit:${runId}:ip:${ip}`;
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
    return NextResponse.json({ error: 'Session not found or not active' }, { status: 404, headers: corsHeaders });
  }

  const conversationId =
    rawConversationId && typeof rawConversationId === 'string' && isUuid(normalizeUuid(rawConversationId))
      ? normalizeUuid(rawConversationId)
      : run.conversation_id ?? null;

  if (conversationId && run.conversation_id && conversationId !== run.conversation_id) {
    return NextResponse.json({ error: 'Conversation does not match session' }, { status: 400, headers: corsHeaders });
  }

  const { data: page } = await supabase
    .from('ai_pages')
    .select('id, page_type, outcome_config, intake_schema')
    .eq('id', run.ai_page_id)
    .single();

  const pageType = page?.page_type ?? 'general';
  if (pageType !== 'quote') {
    return NextResponse.json({ error: 'This page is not a quote assistant' }, { status: 400, headers: corsHeaders });
  }

  const collectedRaw = typeof body.collected === 'object' && body.collected !== null ? (body.collected as Record<string, unknown>) : {};
  const collected: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(collectedRaw)) {
    // prevent megabyte payloads; keep consistent with other endpoints
    if (typeof v === 'string') collected[k] = sanitizeText(v, 5000);
    else if (typeof v === 'number' || typeof v === 'boolean') collected[k] = v;
    else if (v == null) collected[k] = null;
    else collected[k] = String(v).slice(0, 5000);
  }

  const intakeSchema = (page?.intake_schema ?? []) as IntakeFieldSchema[];
  const { valid, missing } = validateCollectedFields(collected, intakeSchema);
  if (!valid && missing.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: 'missing_required',
        missing_required: missing,
        message: `Please provide: ${missing.join(', ')}`,
      },
      { status: 400, headers: corsHeaders }
    );
  }

  // Build next session state with collected_fields
  const currentState = (run.session_state as SessionState) ?? {};
  let nextState: SessionState = {
    ...currentState,
    collected_fields: { ...(currentState.collected_fields ?? {}), ...collected },
  };

  // Run pricing engine to compute estimate (if configured)
  let reply: string = 'Thanks — I’ve received your details.';
  try {
    const pricingContext = await getPricingContext(supabase, {
      organizationId: run.organization_id,
      aiPageId: run.ai_page_id,
    });
    if (pricingContext && pricingContext.rules.length > 0) {
      const serviceId =
        typeof nextState.selected_service_id === 'string' && nextState.selected_service_id
          ? nextState.selected_service_id
          : pricingContext.services.length === 1
            ? pricingContext.services[0]!.id
            : null;
      const result = runEstimate({ inputs: nextState.collected_fields ?? {}, context: pricingContext, serviceId });
      if (result.applied_rules.length > 0) {
        nextState = {
          ...nextState,
          selected_service_id: serviceId,
          estimate: {
            subtotal: result.subtotal,
            total: result.total,
            estimate_low: result.estimate_low,
            estimate_high: result.estimate_high,
            line_items: result.applied_rules.map((r) => ({ rule_name: r.rule_name, amount: r.amount, label: r.label })),
            confidence: result.confidence,
            human_review_recommended: result.human_review_recommended,
            output_mode: result.output_mode,
          },
        };

        const currency = pricingContext.profile.currency ?? 'USD';
        if (result.estimate_low != null && result.estimate_high != null) {
          reply = `Based on what you shared, your estimate is **${formatMoney(result.estimate_low, currency)} – ${formatMoney(
            result.estimate_high,
            currency
          )}**.`;
        } else {
          reply = `Based on what you shared, your price is **${formatMoney(result.total, currency)}**.`;
        }
        if (result.human_review_recommended) {
          reply += ` A team member may review this before finalizing.`;
        }
      }
    }
  } catch {
    // Non-fatal: continue without estimate
  }

  // Persist state, log messages, then complete run (creates quote_request + estimate run linkage).
  await supabase.from('ai_page_runs').update({ session_state: nextState }).eq('id', runId);
  if (conversationId) {
    await supabase.from('messages').insert([
      {
        conversation_id: conversationId,
        role: 'user',
        content: '[Quote form submitted]',
      },
      {
        conversation_id: conversationId,
        role: 'assistant',
        content: reply,
      },
    ]);
    await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
  }

  const outcomeConfig = (page?.outcome_config as { create_quote_request?: boolean; create_lead?: boolean; create_ticket?: boolean }) ?? {};
  const result = await createOutcomesForRun(supabase, {
    organizationId: run.organization_id,
    aiPageId: run.ai_page_id,
    runId: run.id,
    conversationId,
    sessionState: nextState,
    pageType,
    outcomeConfig: {
      create_quote_request: outcomeConfig.create_quote_request !== false,
      create_lead: outcomeConfig.create_lead !== false,
      create_ticket: outcomeConfig.create_ticket !== false,
    },
  });

  return NextResponse.json(
    {
      success: true,
      reply,
      run_id: runId,
      conversation_id: conversationId,
      session_state: nextState,
      quote_request_id: result.quoteRequestId,
    },
    { headers: corsHeaders }
  );
}

