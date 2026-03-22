/**
 * Public: submit an embedded form.
 * - Validates form is active
 * - Validates required fields
 * - Runs quote estimation if form is quote_form type
 * - Saves to form_submissions
 * - For quote_form: also saves to quote_requests for the existing CRM flow
 * - Returns success + optional estimate
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/validation';
import { handleApiError } from '@/lib/api-error';
import { getPricingContext, runEstimate, persistEstimationRun } from '@/lib/quote-pricing/estimate-quote-service';
import { QUOTE_SUBMISSION_SOURCE } from '@/lib/quote-requests/submission-source';
import { emitAutomationEvent } from '@/lib/automations/engine';
import { canUseAutomation } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { triggerFollowUpRun } from '@/lib/follow-up/trigger-follow-up';
import { sendQuoteRequestConfirmation } from '@/lib/email/send-quote-confirmation';
import { loadWidgetQuoteEmbedBundle } from '@/lib/embedded-forms/widget-quote-embed';

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

function withCors(body: object, status: number) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit({ key: `embed-submit:${ip}`, limit: 20, windowMs: 60_000 });
    if (!rl.allowed) {
      return withCors({ error: 'Too many requests. Please try again later.' }, 429);
    }

    const { id: formId } = await params;
    const body = await request.json().catch(() => ({}));

    const supabase = createAdminClient();

    // Load form + fields
    const { data: form } = await supabase
      .from('embedded_forms')
      .select(
        'id, name, form_type, organization_id, is_active, success_message, pricing_profile_id, quote_form_field_source'
      )
      .eq('id', formId)
      .single();

    if (!form) return withCors({ error: 'Form not found' }, 404);
    if (!form.is_active) return withCors({ error: 'This form is no longer active' }, 410);

    const orgId: string = form.organization_id;

    const useWidgetAiQuote =
      form.form_type === 'quote_form' && form.quote_form_field_source === 'widget_ai';

    type FieldRow = { field_key: string; label: string; field_type: string; required: boolean; options_json: unknown };
    let fields: FieldRow[];

    if (useWidgetAiQuote) {
      const bundle = await loadWidgetQuoteEmbedBundle(supabase, orgId);
      fields = bundle.fields.map((f) => ({
        field_key: f.field_key,
        label: f.label,
        field_type: f.field_type,
        required: f.required,
        options_json: f.options_json,
      }));
    } else {
      const { data: ff } = await supabase
        .from('form_fields')
        .select('field_key, label, field_type, required, options_json')
        .eq('form_id', formId);
      fields = ff ?? [];
    }

    // Extract & sanitize answers
    const rawAnswers = typeof body.answers === 'object' && body.answers !== null
      ? (body.answers as Record<string, unknown>)
      : {};

    // Validate required fields
    const missing: string[] = [];
    for (const field of fields ?? []) {
      if (field.required) {
        const val = rawAnswers[field.field_key];
        if (val === undefined || val === null || String(val).trim() === '') {
          missing.push(field.label);
        }
      }
    }
    if (missing.length > 0) {
      return withCors({ error: `Required fields missing: ${missing.join(', ')}` }, 400);
    }

    // Sanitize all answers
    const answers: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rawAnswers)) {
      if (typeof v === 'string') answers[k] = v.trim().slice(0, 5000);
      else answers[k] = v;
    }

    const customerName = sanitize(body.customer_name || answers['name'] || answers['customer_name'] || answers['full_name'], 500);
    const customerEmail = sanitize(body.customer_email || answers['email'] || answers['customer_email'], 255);
    const customerPhone = sanitize(body.customer_phone || answers['phone'] || answers['customer_phone'], 50);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (customerEmail && !emailRegex.test(customerEmail)) {
      return withCors({ error: 'Invalid email address' }, 400);
    }

    // Estimate if quote form
    let estimateTotal: number | null = null;
    let estimateLow: number | null = null;
    let estimateHigh: number | null = null;
    let quoteBreakdown: Record<string, unknown> = {};
    let currency = 'USD';
    let estimationRunId: string | null = null;
    let quoteRequestId: string | null = null;

    if (form.form_type === 'quote_form') {
      const inputs = toInputs(answers);
      const context = await getPricingContext(supabase, {
        organizationId: orgId,
        pricingProfileId: useWidgetAiQuote ? undefined : form.pricing_profile_id ?? undefined,
      });

      if (context && context.rules.length > 0) {
        const serviceId = context.services.length === 1 ? context.services[0]!.id : null;
        const result = runEstimate({ inputs, context, serviceId });
        estimateTotal = result.total;
        estimateLow = result.estimate_low ?? null;
        estimateHigh = result.estimate_high ?? null;
        currency = context.profile.currency ?? 'USD';
        quoteBreakdown = {
          applied_rules: result.applied_rules,
          subtotal: result.subtotal,
          assumptions: result.assumptions,
          confidence: result.confidence,
        };

        estimationRunId = await persistEstimationRun(supabase, {
          organizationId: orgId,
          pricingProfileId: context.profile.id,
          quoteRequestId: null,
          leadId: null,
          conversationId: undefined,
          serviceId,
          result,
        });

        // Also create quote_request for CRM visibility
        const { data: qr } = await supabase
          .from('quote_requests')
          .insert({
            organization_id: orgId,
            customer_name: customerName || null,
            customer_email: customerEmail || null,
            customer_phone: customerPhone || null,
            form_answers: Object.keys(answers).length > 0 ? answers : null,
            estimate_total: estimateTotal,
            estimate_low: estimateLow,
            estimate_high: estimateHigh,
            estimation_run_id: estimationRunId,
            submission_source: QUOTE_SUBMISSION_SOURCE.EMBEDDED_FORM,
            submission_metadata: {
              embedded_form_id: formId,
              form_name: form.name,
              ...(useWidgetAiQuote ? { mirror_ai_widget_quote: true } : {}),
            },
          })
          .select('id')
          .single();

        if (qr) {
          quoteRequestId = qr.id;
          if (estimationRunId) {
            await supabase
              .from('quote_estimation_runs')
              .update({ quote_request_id: qr.id })
              .eq('id', estimationRunId);
          }
        }
      }
    }

    // Create/upsert lead for lead and quote forms
    let leadId: string | null = null;
    if (customerEmail && (form.form_type === 'lead_form' || form.form_type === 'quote_form')) {
      const { data: existing } = await supabase
        .from('leads')
        .select('id')
        .eq('organization_id', orgId)
        .eq('email', customerEmail)
        .limit(1)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('leads')
          .update({ name: customerName || undefined, phone: customerPhone || undefined, source: 'embedded_form' })
          .eq('id', existing.id);
        leadId = existing.id;
      } else if (customerName || customerEmail) {
        const { data: newLead } = await supabase
          .from('leads')
          .insert({
            organization_id: orgId,
            name: customerName || 'Unknown',
            email: customerEmail || null,
            phone: customerPhone || null,
            source: 'embedded_form',
            qualification_priority: form.form_type === 'quote_form' ? 'high' : 'medium',
          })
          .select('id')
          .single();
        leadId = newLead?.id ?? null;
      }
    }

    // Save form submission
    const { data: submission, error: subError } = await supabase
      .from('form_submissions')
      .insert({
        form_id: formId,
        organization_id: orgId,
        customer_name: customerName || null,
        customer_email: customerEmail || null,
        customer_phone: customerPhone || null,
        answers_json: Object.keys(answers).length > 0 ? answers : {},
        calculated_total: estimateTotal,
        quote_breakdown_json: quoteBreakdown,
        source: 'embed',
        status: 'new',
        quote_request_id: quoteRequestId,
      })
      .select('id')
      .single();

    if (subError || !submission) {
      return withCors({ error: 'Failed to save submission' }, 500);
    }

    // Send confirmation email for quote forms
    if (form.form_type === 'quote_form' && customerEmail) {
      sendQuoteRequestConfirmation({
        supabase,
        organizationId: orgId,
        customerName,
        customerEmail,
        estimateTotal,
        estimateLow,
        estimateHigh,
        currency,
        formAnswers: Object.keys(answers).length > 0 ? answers : null,
        language: 'en',
      }).catch((err) => console.warn('[embed/submit] confirmation email failed', err));
    }

    // Follow-up
    if (quoteRequestId && leadId && process.env.OPENAI_API_KEY) {
      triggerFollowUpRun(supabase, {
        organizationId: orgId,
        sourceType: 'quote_request_submitted',
        sourceId: quoteRequestId,
        leadId,
        context: {
          customerLanguage: 'en',
          quoteRequest: {
            id: quoteRequestId,
            customer_name: customerName,
            customer_email: customerEmail,
            customer_phone: customerPhone,
            estimate_total: estimateTotal,
            estimate_low: estimateLow,
            estimate_high: estimateHigh,
            form_answers: answers,
          },
        },
      }).catch((err) => console.warn('[embed/submit] follow-up trigger failed', err));
    }

    // Automation events
    const adminAllowed = await isOrgAllowedByAdmin(supabase, orgId);
    const automationsAllowed = await canUseAutomation(supabase, orgId, adminAllowed);
    if (automationsAllowed) {
      emitAutomationEvent(supabase, {
        organization_id: orgId,
        event_type: 'quote_request_submitted',
        payload: {
          trigger_type: 'quote_request_submitted',
          quote_request_id: quoteRequestId ?? undefined,
          form_submission_id: submission.id,
          form_id: formId,
          form_name: form.name,
          lead_id: leadId ?? undefined,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone || undefined,
          estimate_total: estimateTotal ?? undefined,
          estimate_low: estimateLow ?? undefined,
          estimate_high: estimateHigh ?? undefined,
          form_answers: Object.keys(answers).length > 0 ? answers : undefined,
        },
        trace_id: `embed-${submission.id}`,
        source: 'embedded_form',
        actor: { type: 'form_submission', id: submission.id },
      }).catch((err) => console.error('[embed/submit] automation emit failed', err));
    }

    // Build estimate string for response
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
      submission_id: submission.id,
      estimate: estimateStr || undefined,
      success_message: form.success_message || 'Thank you! Your submission has been received.',
    }, 200);
  } catch (err) {
    const res = handleApiError(err, 'embed/submit');
    Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }
}
