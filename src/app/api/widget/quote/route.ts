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

    if (!rawWidgetId || !name || !email) {
      return withCors({ error: 'Missing required fields (name, email)' }, 400);
    }
    if (!isUuid(widgetId)) {
      return withCors({ error: 'Invalid widgetId' }, 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return withCors({ error: 'Invalid email' }, 400);
    }

    const perIpKey = `widget-quote:ip:${ip}`;
    const rl = rateLimit({ key: perIpKey, limit: 30, windowMs: 60_000 });
    if (!rl.allowed) {
      return withCors({ error: 'Too many requests' }, 429);
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
    const { data: quote, error: quoteError } = await supabase
      .from('quote_requests')
      .insert({
        organization_id: orgId,
        conversation_id: conversationId,
        lead_id: leadId,
        customer_name: name,
        customer_email: email,
        customer_phone: phone || null,
        form_answers: formAnswers,
        estimate_total: estimateTotal,
        estimate_low: estimateLow,
        estimate_high: estimateHigh,
        estimation_run_id: estimationRunId,
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

    // 4. AI follow-up run
    if (process.env.OPENAI_API_KEY) {
      triggerFollowUpRun(supabase, {
        organizationId: orgId,
        sourceType: 'quote_request_submitted',
        sourceId: quote.id,
        leadId,
        context: {
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

    // 5. Automation event
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
          estimate_total: estimateTotal ?? undefined,
          estimate_low: estimateLow ?? undefined,
          estimate_high: estimateHigh ?? undefined,
          form_answers: formAnswers ?? undefined,
        },
        trace_id: `quote-${quote.id}`,
        source: 'widget_quote',
        actor: { type: 'quote_request', id: quote.id },
      }).catch((err) => console.error('[widget/quote] automation emit failed', err));
    }

    // 6. Format estimate string for response
    let estimateStr = '';
    if (estimateLow != null && estimateHigh != null) {
      const prefix = currency === 'USD' ? '$' : `${currency} `;
      estimateStr = `${prefix}${Number(estimateLow).toLocaleString('en-US', { minimumFractionDigits: 2 })} – ${prefix}${Number(estimateHigh).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    } else if (estimateTotal != null) {
      const prefix = currency === 'USD' ? '$' : `${currency} `;
      estimateStr = `${prefix}${Number(estimateTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    }

    return withCors({
      success: true,
      estimate: estimateStr || undefined,
      message: 'Quote request submitted',
    }, 200);
  } catch (err) {
    const res = handleApiError(err, 'widget/quote');
    Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }
}
