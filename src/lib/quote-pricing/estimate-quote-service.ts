/**
 * Orchestrates loading pricing context, running the engine, and persisting estimation runs.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { runPricingEngine } from './quote-pricing-engine';
import type { EstimationResult, PricingContext, QuotePricingProfileRow, QuoteServiceRow, QuotePricingVariableRow, QuotePricingRuleRow } from './types';

export async function getPricingContext(
  supabase: SupabaseClient,
  params: { organizationId: string; pricingProfileId?: string | null; aiPageId?: string | null }
): Promise<PricingContext | null> {
  const { organizationId, pricingProfileId, aiPageId } = params;

  let profileId = pricingProfileId;
  if (!profileId && aiPageId) {
    const { data: page } = await supabase
      .from('ai_pages')
      .select('pricing_profile_id')
      .eq('id', aiPageId)
      .single();
    profileId = (page?.pricing_profile_id as string) ?? null;
  }
  if (!profileId) {
    const { data: defaultProfile } = await supabase
      .from('quote_pricing_profiles')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('is_default', true)
      .maybeSingle();
    profileId = defaultProfile?.id ?? null;
  }
  if (!profileId) {
    const { data: anyProfile } = await supabase
      .from('quote_pricing_profiles')
      .select('id')
      .eq('organization_id', organizationId)
      .limit(1)
      .maybeSingle();
    profileId = anyProfile?.id ?? null;
  }
  if (!profileId) return null;

  const [profileRes, servicesRes, variablesRes, rulesRes] = await Promise.all([
    supabase.from('quote_pricing_profiles').select('*').eq('id', profileId).single(),
    supabase.from('quote_services').select('*').eq('pricing_profile_id', profileId).eq('is_active', true),
    supabase.from('quote_pricing_variables').select('*').eq('pricing_profile_id', profileId).order('sort_order'),
    supabase.from('quote_pricing_rules').select('*').eq('pricing_profile_id', profileId).eq('is_active', true).order('sort_order'),
  ]);

  const profile = profileRes.data as QuotePricingProfileRow | null;
  if (!profile) return null;

  return {
    profile,
    services: (servicesRes.data ?? []) as QuoteServiceRow[],
    variables: (variablesRes.data ?? []) as QuotePricingVariableRow[],
    rules: (rulesRes.data ?? []) as QuotePricingRuleRow[],
  };
}

export function runEstimate(params: {
  inputs: Record<string, unknown>;
  context: PricingContext;
  serviceId: string | null;
}): EstimationResult {
  const serviceVars = params.serviceId
    ? params.context.variables.filter((v) => !v.service_id || v.service_id === params.serviceId)
    : params.context.variables.filter((v) => !v.service_id);
  return runPricingEngine({
    inputs: params.inputs,
    variables: serviceVars,
    rules: params.context.rules,
    serviceId: params.serviceId,
    pricingMode: params.context.profile.pricing_mode,
  });
}

export async function persistEstimationRun(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    pricingProfileId: string | null;
    aiPageId?: string | null;
    quoteRequestId?: string | null;
    leadId?: string | null;
    conversationId?: string | null;
    serviceId?: string | null;
    result: EstimationResult;
  }
): Promise<string | null> {
  const { data } = await supabase
    .from('quote_estimation_runs')
    .insert({
      organization_id: params.organizationId,
      pricing_profile_id: params.pricingProfileId,
      ai_page_id: params.aiPageId ?? null,
      quote_request_id: params.quoteRequestId ?? null,
      lead_id: params.leadId ?? null,
      conversation_id: params.conversationId ?? null,
      service_id: params.serviceId ?? null,
      extracted_inputs: params.result.extracted_inputs,
      applied_rules: params.result.applied_rules,
      estimate_subtotal: params.result.subtotal,
      estimate_total: params.result.total,
      estimate_low: params.result.estimate_low,
      estimate_high: params.result.estimate_high,
      confidence: params.result.confidence,
      assumptions: params.result.assumptions,
      output_mode: params.result.output_mode,
      human_review_recommended: params.result.human_review_recommended,
    })
    .select('id')
    .single();
  return data?.id ?? null;
}
