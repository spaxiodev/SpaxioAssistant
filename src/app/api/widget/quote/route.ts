/**
 * Widget: submit quote request with lead capture.
 * - Validates widget + organization
 * - Creates or upserts lead (name, email, phone, source=widget_quote)
 * - Creates quote_request linked to lead + conversation
 * - Runs pricing estimate if configured, stores in quote_request
 * - Emits automation event "quote_request_submitted"
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { getClientIp, isUuid, normalizeUuid } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { emitAutomationEvent } from '@/lib/automations/engine';
import { canUseAutomation } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { triggerFollowUpRun } from '@/lib/follow-up/trigger-follow-up';
import { getPricingContext, runEstimate, persistEstimationRun } from '@/lib/quote-pricing/estimate-quote-service';
import { sendQuoteRequestConfirmation } from '@/lib/email/send-quote-confirmation';
import { extractQuoteFieldsFromFormAnswers } from '@/lib/quote-requests/form-answers-fields';
import { QUOTE_SUBMISSION_SOURCE } from '@/lib/quote-requests/submission-source';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

function sanitize(s: unknown, max = 5000): string {
  if (s == null) return '';
  return String(s).trim().slice(0, max);
}

function normalizeLanguageCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if (!v) return null;
  // Normalize "fr-CA" -> "fr"
  const two = v.includes('-') ? v.slice(0, 2) : v;
  const code = two.slice(0, 2);
  return code ? code : null;
}

function toInputs(answers: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(answers)) {
    if (v === 'true') out[k] = true;
    else if (v === 'false') out[k] = false;
    else if (v === '') continue;
    else if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (/^\d+$/.test(String(v))) out[k] = Number(v);
    else if (/^\d+\.\d+$/.test(String(v))) out[k] = parseFloat(String(v));
    else out[k] = String(v).slice(0, 5000);
  }
  return out;
}

const withCors = (body: object, status: number) =>
  NextResponse.json(body, { status, headers: corsHeaders });

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const body = await request.json().catch(() => ({}));
    const explicitLanguage = normalizeLanguageCode(body.language ?? body.activeLocale);
    const browserLocale = normalizeLanguageCode(body.browserLocale);
    const resolvedLanguage = explicitLanguage ?? browserLocale ?? 'en';

    const rawWidgetId = body.widgetId;
    const rawConversationId = body.conversationId ?? null;
    const widgetId = rawWidgetId ? normalizeUuid(String(rawWidgetId)) : '';
    let conversationId: string | null = null;
    if (rawConversationId && typeof rawConversationId === 'string') {
      const candidate = normalizeUuid(rawConversationId);
      if (isUuid(candidate)) conversationId = candidate;
    }

    const name = sanitize(body.name, 500);
    const email = sanitize(body.email, 255);
    const phone = sanitize(body.phone, 50);
    const answers = typeof body.answers === 'object' && body.answers !== null
      ? (body.answers as Record<string, unknown>)
      : {};

    const moneyLocale = resolvedLanguage === 'fr' ? 'fr-FR' : 'en-US';
    const t = {
      missingFields: resolvedLanguage === 'fr' ? 'Champs requis manquants (nom, email)' : 'Missing required fields (name, email)',
      invalidEmail: resolvedLanguage === 'fr' ? "Veuillez saisir une adresse e-mail valide" : 'Invalid email',
      tooManyRequests: resolvedLanguage === 'fr' ? 'Trop de demandes. Veuillez réessayer plus tard.' : 'Too many requests',
      quoteSubmitted: resolvedLanguage === 'fr' ? 'Demande de devis envoyée' : 'Quote request submitted',
    } as const;

    if (!rawWidgetId || !name || !email) {
      return withCors({ error: t.missingFields }, 400);
    }
    if (!isUuid(widgetId)) {
      return withCors({ error: 'Invalid widgetId' }, 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return withCors({ error: t.invalidEmail }, 400);
    }

    const perIpKey = `widget-quote:ip:${ip}`;
    const rl = rateLimit({ key: perIpKey, limit: 30, windowMs: 60_000 });
    if (!rl.allowed) {
      return withCors({ error: t.tooManyRequests }, 429);
    }

    const supabase = createAdminClient();
    const { data: widget, error: widgetError } = await supabase
      .from('widgets')
      .select('id, organization_id')
      .eq('id', widgetId)
      .single();

    if (widgetError || !widget) {
      return withCors({ error: 'Widget not found' }, 404);
    }

    const orgId = widget.organization_id;

    // 1. Create or upsert lead
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('organization_id', orgId)
      .eq('email', email)
      .limit(1)
      .maybeSingle();

    let leadId: string;
    if (existingLead) {
      await supabase
        .from('leads')
        .update({
          name,
          phone: phone || null,
          conversation_id: conversationId,
          source: 'widget_quote',
          qualification_priority: 'high',
          customer_language: resolvedLanguage,
        })
        .eq('id', existingLead.id);
      leadId = existingLead.id;
    } else {
      const { data: newLead, error: leadError } = await supabase
        .from('leads')
        .insert({
          organization_id: orgId,
          conversation_id: conversationId,
          name,
          email,
          phone: phone || null,
          source: 'widget_quote',
          qualification_priority: 'high',
          customer_language: resolvedLanguage,
        })
        .select('id')
        .single();

      if (leadError || !newLead) {
        return withCors({ error: 'Failed to save lead' }, 500);
      }
      leadId = newLead.id;
    }

    // 2. Run estimate (if pricing configured)
    const inputs = toInputs(answers);
    let estimateTotal: number | null = null;
    let estimateLow: number | null = null;
    let estimateHigh: number | null = null;
    let currency = 'USD';
    let estimationRunId: string | null = null;

    const context = await getPricingContext(supabase, { organizationId: orgId });
    if (context && context.rules.length > 0) {
      const serviceId = context.services.length === 1 ? context.services[0]!.id : null;
      const result = runEstimate({ inputs, context, serviceId });
      estimateTotal = result.total;
      estimateLow = result.estimate_low ?? null;
      estimateHigh = result.estimate_high ?? null;
      currency = context.profile.currency ?? 'USD';

      estimationRunId = await persistEstimationRun(supabase, {
        organizationId: orgId,
        pricingProfileId: context.profile.id,
        quoteRequestId: null,
        leadId,
        conversationId: conversationId ?? undefined,
        serviceId,
        result,
      });
    }

    // 3. Create quote_request
    const formAnswers = Object.keys(answers).length > 0 ? answers : null;
    const extracted = extractQuoteFieldsFromFormAnswers(answers as Record<string, unknown>);
    const { data: quote, error: quoteError } = await supabase
      .from('quote_requests')
      .insert({
        organization_id: orgId,
        conversation_id: conversationId,
        lead_id: leadId,
        customer_name: name,
        customer_email: email,
        customer_phone: phone || null,
        customer_language: resolvedLanguage,
        service_type: extracted.service_type,
        project_details: extracted.project_details,
        location: extracted.location,
        budget_text: extracted.budget_text,
        budget_amount: extracted.budget_amount,
        dimensions_size: extracted.dimensions_size,
        notes: extracted.notes,
        form_answers: formAnswers,
        estimate_total: estimateTotal,
        estimate_low: estimateLow,
        estimate_high: estimateHigh,
        estimation_run_id: estimationRunId,
        submission_source: QUOTE_SUBMISSION_SOURCE.AI_WIDGET,
        submission_metadata: {
          conversation_id: conversationId ?? undefined,
        },
      })
      .select('id')
      .single();

    if (quoteError || !quote) {
      return withCors({ error: 'Failed to save quote request' }, 500);
    }

    // Update estimation run with quote_request_id
    if (estimationRunId) {
      await supabase
        .from('quote_estimation_runs')
        .update({ quote_request_id: quote.id })
        .eq('id', estimationRunId);
    }

    // 4. Send confirmation email to customer
    sendQuoteRequestConfirmation({
      supabase,
      organizationId: orgId,
      customerName: name,
      customerEmail: email,
      estimateTotal,
      estimateLow,
      estimateHigh,
      currency,
      formAnswers: formAnswers ?? null,
      language: resolvedLanguage,
    }).catch((err) => console.warn('[widget/quote] confirmation email failed', err));

    // 5. AI follow-up run
    if (process.env.OPENAI_API_KEY) {
      triggerFollowUpRun(supabase, {
        organizationId: orgId,
        sourceType: 'quote_request_submitted',
        sourceId: quote.id,
        leadId,
        context: {
          customerLanguage: resolvedLanguage,
          quoteRequest: {
            id: quote.id,
            customer_name: name,
            customer_email: email,
            customer_phone: phone || null,
            estimate_total: estimateTotal,
            estimate_low: estimateLow,
            estimate_high: estimateHigh,
            form_answers: formAnswers,
          },
        },
      }).catch((err) => console.warn('[widget/quote] follow-up trigger failed', err));
    }

    // 6. Automation event
    const adminAllowed = await isOrgAllowedByAdmin(supabase, orgId);
    const automationsAllowed = await canUseAutomation(supabase, orgId, adminAllowed);
    if (automationsAllowed) {
      emitAutomationEvent(supabase, {
        organization_id: orgId,
        event_type: 'quote_request_submitted',
        payload: {
          trigger_type: 'quote_request_submitted',
          conversation_id: conversationId ?? undefined,
          quote_request_id: quote.id,
          lead_id: leadId,
          customer_name: name,
          customer_email: email,
          customer_phone: phone || undefined,
          customer_language: resolvedLanguage,
          estimate_total: estimateTotal ?? undefined,
          estimate_low: estimateLow ?? undefined,
          estimate_high: estimateHigh ?? undefined,
          form_answers: formAnswers ?? undefined,
        },
        trace_id: `quote-${quote.id}`,
        source: 'widget_quote',
        actor: { type: 'quote_request', id: quote.id },
      }).catch((err) => console.error('[widget/quote] automation emit failed', err));
      emitAutomationEvent(supabase, {
        organization_id: orgId,
        event_type: 'new_high_intent_lead',
        payload: {
          trigger_type: 'new_high_intent_lead',
          conversation_id: conversationId ?? undefined,
          quote_request_id: quote.id,
          lead_id: leadId,
          customer_name: name,
          customer_email: email,
          customer_phone: phone || undefined,
          qualification_priority: 'high',
        },
        trace_id: `high-intent-quote-${quote.id}`,
        source: 'widget_quote',
        actor: { type: 'quote_request', id: quote.id },
      }).catch((err) => console.error('[widget/quote] high intent emit failed', err));
    }

    // 7. Format estimate string for response
    let estimateStr = '';
    if (estimateLow != null && estimateHigh != null) {
      const prefix = currency === 'USD' ? '$' : `${currency} `;
      estimateStr = `${prefix}${Number(estimateLow).toLocaleString(moneyLocale, { minimumFractionDigits: 2 })} – ${prefix}${Number(estimateHigh).toLocaleString(moneyLocale, { minimumFractionDigits: 2 })}`;
    } else if (estimateTotal != null) {
      const prefix = currency === 'USD' ? '$' : `${currency} `;
      estimateStr = `${prefix}${Number(estimateTotal).toLocaleString(moneyLocale, { minimumFractionDigits: 2 })}`;
    }

    return withCors({
      success: true,
      estimate: estimateStr || undefined,
      message: t.quoteSubmitted,
    }, 200);
  } catch (err) {
    const res = handleApiError(err, 'widget/quote');
    Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }
}
