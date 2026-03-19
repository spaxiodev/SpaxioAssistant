/**
 * Create CRM/outcome records from AI page session state.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SessionState } from './types';
import { getPricingContext, runEstimate, persistEstimationRun } from '@/lib/quote-pricing/estimate-quote-service';

function str(v: unknown, max = 500): string | null {
  if (v == null) return null;
  const s = String(v).trim().slice(0, max);
  return s || null;
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function createQuoteRequestFromSession(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    conversationId: string | null;
    collected: Record<string, unknown>;
    customerLanguage?: string | null;
  }
): Promise<string | null> {
  const customerLanguage =
    typeof params.customerLanguage === 'string' ? params.customerLanguage.slice(0, 2).toLowerCase() : null;
  const name = str(params.collected.contact_name ?? params.collected.customer_name, 500) ?? str(params.collected.name, 500);
  if (!name) return null;

  const { data: existing } = await supabase
    .from('quote_requests')
    .select('id')
    .eq('conversation_id', params.conversationId)
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id;

  const email = str(params.collected.contact_email ?? params.collected.email, 255);
  const phone = str(params.collected.phone, 100);

  const { data: row } = await supabase
    .from('quote_requests')
    .insert({
      organization_id: params.organizationId,
      conversation_id: params.conversationId,
      customer_language: customerLanguage,
      customer_name: name,
      customer_email: email,
      customer_phone: phone,
      service_type: str(params.collected.service_type ?? params.collected.service_category),
      project_details: str(params.collected.project_details ?? params.collected.notes, 2000),
      dimensions_size: str(params.collected.dimensions ?? params.collected.dimensions_size),
      location: str(params.collected.location),
      notes: str(params.collected.notes, 2000),
      budget_text: str(params.collected.budget),
      budget_amount: num(params.collected.budget_amount),
    })
    .select('id')
    .single();

  return row?.id ?? null;
}

export async function createLeadFromSession(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    conversationId: string | null;
    collected: Record<string, unknown>;
    customerLanguage?: string | null;
  }
): Promise<string | null> {
  const customerLanguage =
    typeof params.customerLanguage === 'string' ? params.customerLanguage.slice(0, 2).toLowerCase() : null;
  const name = str(params.collected.contact_name ?? params.collected.name, 500);
  const email = str(params.collected.contact_email ?? params.collected.email, 255);
  if (!name || !email) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return null;

  const { data: existing } = await supabase
    .from('leads')
    .select('id')
    .eq('conversation_id', params.conversationId)
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id;

  const transcriptSnippet = str(params.collected.notes ?? params.collected.details ?? params.collected.project_details, 1000);
  const { data: row } = await supabase
    .from('leads')
    .insert({
      organization_id: params.organizationId,
      conversation_id: params.conversationId,
      customer_language: customerLanguage,
      name,
      email,
      phone: str(params.collected.phone, 100),
      message: str(params.collected.message ?? params.collected.notes, 2000),
      transcript_snippet: transcriptSnippet,
      requested_service: str(params.collected.requested_service ?? params.collected.service_category ?? params.collected.interest, 500),
      requested_timeline: str(params.collected.requested_timeline ?? params.collected.urgency ?? params.collected.preferred_time, 500),
      project_details: str(params.collected.project_details ?? params.collected.details, 2000),
      location: str(params.collected.location, 500),
    })
    .select('id')
    .single();

  return row?.id ?? null;
}

export async function createSupportTicketFromSession(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    conversationId: string | null;
    collected: Record<string, unknown>;
  }
): Promise<string | null> {
  const title = str(params.collected.issue_summary ?? params.collected.subject ?? params.collected.title, 500) || 'Support request';
  const description = str(params.collected.details ?? params.collected.notes ?? params.collected.message, 2000);

  const { data: row } = await supabase
    .from('support_tickets')
    .insert({
      organization_id: params.organizationId,
      conversation_id: params.conversationId,
      title,
      description,
      priority: 'medium',
      status: 'open',
    })
    .select('id')
    .single();

  return row?.id ?? null;
}

export async function createOutcomesForRun(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    aiPageId: string;
    runId: string;
    conversationId: string | null;
    sessionState: SessionState;
    pageType: string;
    outcomeConfig: { create_quote_request?: boolean; create_lead?: boolean; create_ticket?: boolean };
    customerLanguage?: string | null;
  }
): Promise<{
  quoteRequestId: string | null;
  leadId: string | null;
  supportTicketId: string | null;
}> {
  const collected = params.sessionState.collected_fields ?? {};
  const out: { quoteRequestId: string | null; leadId: string | null; supportTicketId: string | null } = {
    quoteRequestId: null,
    leadId: null,
    supportTicketId: null,
  };

  const base = {
    organizationId: params.organizationId,
    conversationId: params.conversationId,
    collected,
  };

  if (params.outcomeConfig.create_quote_request && (params.pageType === 'quote' || params.pageType === 'general')) {
    out.quoteRequestId = await createQuoteRequestFromSession(supabase, { ...base, customerLanguage: params.customerLanguage ?? null });

    // If quote page has pricing estimate, persist estimation run and link to quote_request
    if (out.quoteRequestId && (params.pageType === 'quote') && Object.keys(collected).length > 0) {
      try {
        const pricingContext = await getPricingContext(supabase, {
          organizationId: params.organizationId,
          aiPageId: params.aiPageId,
        });
        if (pricingContext && pricingContext.rules.length > 0) {
          const serviceId = (params.sessionState.selected_service_id as string) ?? null;
          const result = runEstimate({
            inputs: collected,
            context: pricingContext,
            serviceId,
          });
          if (result.applied_rules.length > 0) {
            const runId = await persistEstimationRun(supabase, {
              organizationId: params.organizationId,
              pricingProfileId: pricingContext.profile.id,
              aiPageId: params.aiPageId,
              quoteRequestId: out.quoteRequestId,
              leadId: out.leadId ?? undefined,
              conversationId: params.conversationId ?? undefined,
              serviceId,
              result,
            });
            if (runId) {
              await supabase
                .from('quote_requests')
                .update({
                  estimation_run_id: runId,
                  estimate_total: result.total,
                  estimate_low: result.estimate_low,
                  estimate_high: result.estimate_high,
                  estimate_line_items: result.applied_rules.map((r) => ({ name: r.rule_name, amount: r.amount, label: r.label })),
                })
                .eq('id', out.quoteRequestId);
            }
          }
        }
      } catch {
        // non-fatal
      }
    }
  }
  if (params.outcomeConfig.create_lead) {
    out.leadId = await createLeadFromSession(supabase, { ...base, customerLanguage: params.customerLanguage ?? null });
  }
  if (params.outcomeConfig.create_ticket && (params.pageType === 'support' || params.pageType === 'general')) {
    out.supportTicketId = await createSupportTicketFromSession(supabase, base);
  }

  const updates: Record<string, unknown> = {
    status: 'completed',
    completed_at: new Date().toISOString(),
    completion_percent: 100,
  };
  if (out.quoteRequestId) updates.quote_request_id = out.quoteRequestId;
  if (out.leadId) updates.lead_id = out.leadId;
  if (out.supportTicketId) updates.support_ticket_id = out.supportTicketId;
  await supabase.from('ai_page_runs').update(updates).eq('id', params.runId);

  return out;
}
