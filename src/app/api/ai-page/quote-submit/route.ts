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
import { triggerFollowUpRun } from '@/lib/follow-up/trigger-follow-up';
import { emitAutomationEvent } from '@/lib/automations/engine';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { canUseAutomation } from '@/lib/entitlements';
import { sendQuoteRequestConfirmation } from '@/lib/email/send-quote-confirmation';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

function formatMoney(amount: number, currency: string, moneyLocale: string) {
  const prefix = currency === 'USD' ? '$' : `${currency} `;
  return `${prefix}${Number(amount).toLocaleString(moneyLocale, { minimumFractionDigits: 2 })}`;
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const body = await request.json().catch(() => ({}));
  const rawRunId = body.run_id ?? body.runId;
  const rawConversationId = body.conversation_id ?? body.conversationId ?? null;
  const language = typeof body.language === 'string' ? body.language.slice(0, 16) : 'en';
  const customerLanguage = language.slice(0, 2).toLowerCase() || 'en';
  const moneyLocale = customerLanguage === 'fr' ? 'fr-FR' : 'en-US';
  const isFrench = customerLanguage === 'fr';

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
        message: isFrench ? `Veuillez fournir : ${missing.join(', ')}` : `Please provide: ${missing.join(', ')}`,
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
  let reply: string = isFrench ? "Merci — j'ai bien reçu vos informations." : 'Thanks — I’ve received your details.';
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
          reply = isFrench
            ? `D'après ce que vous avez partagé, votre estimation est **${formatMoney(result.estimate_low, currency, moneyLocale)} – ${formatMoney(
                result.estimate_high,
                currency,
                moneyLocale
              )}**.`
            : `Based on what you shared, your estimate is **${formatMoney(result.estimate_low, currency, moneyLocale)} – ${formatMoney(
            result.estimate_high,
            currency,
            moneyLocale
          )}**.`;
        } else {
          reply = isFrench ? `D'après ce que vous avez partagé, votre prix est **${formatMoney(result.total, currency, moneyLocale)}**.` : `Based on what you shared, your price is **${formatMoney(result.total, currency, moneyLocale)}**.`;
        }
        if (result.human_review_recommended) {
          reply += isFrench
            ? " Un membre de notre équipe peut examiner cette demande avant finalisation."
            : ' A team member may review this before finalizing.';
        }
      }
    }
  } catch {
    // Non-fatal: continue without estimate
  }

  reply += isFrench
    ? " Votre demande a été transmise à l’équipe pour examen."
    : ' Your request has been sent to the team for review.';

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
    customerLanguage,
    outcomeConfig: {
      create_quote_request: outcomeConfig.create_quote_request !== false,
      create_lead: outcomeConfig.create_lead !== false,
      create_ticket: outcomeConfig.create_ticket !== false,
    },
  });

  // Send confirmation email to customer
  const leadId = result.leadId ?? null;
  const quoteRequestId = result.quoteRequestId ?? null;
  const contactName = typeof collected.contact_name === 'string' ? collected.contact_name : '';
  const contactEmail = typeof collected.contact_email === 'string' ? collected.contact_email : '';
  const contactPhone = typeof collected.phone === 'string' ? collected.phone : null;
  const estimate = (nextState as any).estimate as { total?: unknown; estimate_low?: unknown; estimate_high?: unknown } | undefined;
  const estimateTotal = typeof estimate?.total === 'number' ? estimate.total : null;
  const estimateLow = typeof estimate?.estimate_low === 'number' ? estimate.estimate_low : null;
  const estimateHigh = typeof estimate?.estimate_high === 'number' ? estimate.estimate_high : null;

  const formAnswers = (nextState.collected_fields ?? {}) as Record<string, unknown>;
  const serviceType = typeof (collected as any).service_type === 'string' ? (collected as any).service_type : null;
  const projectDetails = typeof (collected as any).project_details === 'string' ? (collected as any).project_details : null;
  const location = typeof (collected as any).location === 'string' ? (collected as any).location : null;

  if (contactEmail) {
    sendQuoteRequestConfirmation({
      supabase,
      organizationId: run.organization_id,
      customerName: contactName,
      customerEmail: contactEmail,
      estimateTotal,
      estimateLow,
      estimateHigh,
      formAnswers,
      language: customerLanguage,
    }).catch((err) => console.warn('[ai-page/quote-submit] confirmation email failed', err));
  }

  // AI follow-ups and automations should use the visitor's resolved language.
  if (process.env.OPENAI_API_KEY && quoteRequestId) {
    triggerFollowUpRun(supabase, {
      organizationId: run.organization_id,
      sourceType: 'quote_request_submitted',
      sourceId: quoteRequestId,
      leadId,
      context: {
        customerLanguage,
        quoteRequest: {
          id: quoteRequestId,
          customer_name: contactName,
          customer_email: contactEmail,
          customer_phone: contactPhone,
          service_type: serviceType,
          project_details: projectDetails,
          location,
          estimate_total: estimateTotal,
          estimate_low: estimateLow,
          estimate_high: estimateHigh,
          form_answers: formAnswers,
        },
      },
    }).catch((err) => console.warn('[ai-page/quote-submit] follow-up trigger failed', err));
  }

  if (process.env.OPENAI_API_KEY && leadId) {
    triggerFollowUpRun(supabase, {
      organizationId: run.organization_id,
      sourceType: 'lead_form_submitted',
      sourceId: leadId,
      leadId,
      context: {
        customerLanguage,
        lead: {
          id: leadId,
          name: contactName,
          email: contactEmail,
          phone: contactPhone,
          message: typeof (collected as any).message === 'string' ? (collected as any).message : null,
          requested_service: serviceType,
          requested_timeline: typeof (collected as any).requested_timeline === 'string' ? (collected as any).requested_timeline : null,
          project_details: projectDetails,
          location,
        },
      },
    }).catch((err) => console.warn('[ai-page/quote-submit] lead follow-up trigger failed', err));
  }

  // Event-driven automations
  const adminAllowed = await isOrgAllowedByAdmin(supabase, run.organization_id);
  const automationsAllowed = await canUseAutomation(supabase, run.organization_id, adminAllowed);
  if (automationsAllowed) {
    if (quoteRequestId) {
      await emitAutomationEvent(supabase, {
        organization_id: run.organization_id,
        event_type: 'quote_request_submitted',
        payload: {
          trigger_type: 'quote_request_submitted',
          conversation_id: conversationId ?? undefined,
          quote_request_id: quoteRequestId,
          lead_id: leadId ?? undefined,
          customer_name: contactName,
          customer_email: contactEmail,
          customer_phone: contactPhone ?? undefined,
          customer_language: customerLanguage,
          estimate_total: estimateTotal ?? undefined,
          estimate_low: estimateLow ?? undefined,
          estimate_high: estimateHigh ?? undefined,
          form_answers: formAnswers ?? undefined,
        },
        trace_id: `ai-quote-${quoteRequestId}`,
        source: 'ai_page_quote_submit',
        actor: { type: 'quote_request', id: quoteRequestId },
      }).catch((err) => console.error('[ai-page/quote-submit] automation emit failed', err));
    }

    if (leadId) {
      await emitAutomationEvent(supabase, {
        organization_id: run.organization_id,
        event_type: 'lead_form_submitted',
        payload: {
          trigger_type: 'lead_form_submitted',
          conversation_id: conversationId ?? undefined,
          lead_id: leadId,
          customer_language: customerLanguage,
          customer_name: contactName,
          customer_email: contactEmail,
          customer_phone: contactPhone ?? undefined,
          lead: {
            name: contactName,
            email: contactEmail,
            phone: contactPhone ?? undefined,
            message: typeof (collected as any).message === 'string' ? (collected as any).message : undefined,
            language: customerLanguage,
          },
          requested_service: serviceType ?? undefined,
          requested_timeline:
            typeof (collected as any).requested_timeline === 'string' ? (collected as any).requested_timeline : undefined,
          project_details: projectDetails ?? undefined,
          location: location ?? undefined,
        },
        trace_id: `ai-lead-${leadId}`,
        source: 'ai_page_quote_submit',
        actor: { type: 'lead', id: leadId },
      }).catch((err) => console.error('[ai-page/quote-submit] lead automation emit failed', err));
    }
  }

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

