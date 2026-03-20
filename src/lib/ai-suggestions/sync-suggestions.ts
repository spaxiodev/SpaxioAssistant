/**
 * Sync AI suggestions for an organization:
 * 1. Load context (config gaps, data patterns)
 * 2. Generate candidates
 * 3. Upsert new suggestions, skip existing active ones of the same type
 * 4. Expire stale suggestions older than 7 days that are still active
 *
 * Call this from: dashboard intelligence API (lazy, on each load, with cache).
 * Not called on every widget chat — only from trusted server contexts.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { generateSuggestionCandidates } from './generate-suggestions';
import type { SuggestionContext, SuggestionType, AiSuggestion } from './types';

/** Load the full suggestion context for an org from the DB. */
async function loadSuggestionContext(
  supabase: SupabaseClient,
  organizationId: string
): Promise<SuggestionContext> {
  const [
    { data: businessSettings },
    { count: agentCount },
    { count: knowledgeSourceCount },
    { count: leadCount },
    { count: highPriorityLeadCount },
    { count: quoteRequestCount },
    { count: pendingQuoteCount },
    { data: pricingProfiles },
    { count: pricingRulesCount },
    { count: automationsCount },
    { count: conversationsCount },
    { data: widgets },
    { data: existingSuggestions },
  ] = await Promise.all([
    supabase
      .from('business_settings')
      .select('business_name, website_url, website_learned_at, description, industry, business_hours, services')
      .eq('organization_id', organizationId)
      .maybeSingle(),
    supabase.from('agents').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('knowledge_sources').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('qualification_priority', 'high'),
    supabase.from('quote_requests').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase
      .from('quote_requests')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'pending'),
    supabase
      .from('quote_pricing_profiles')
      .select('id')
      .eq('organization_id', organizationId)
      .limit(1),
    supabase
      .from('quote_pricing_rules')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_active', true),
    supabase
      .from('automations')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'active'),
    supabase
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .in(
        'widget_id',
        (await supabase.from('widgets').select('id').eq('organization_id', organizationId)).data?.map((w) => w.id) ?? []
      ),
    supabase.from('widgets').select('id, enabled').eq('organization_id', organizationId).limit(1),
    supabase
      .from('ai_suggestions')
      .select('suggestion_type')
      .eq('organization_id', organizationId)
      .eq('status', 'active'),
  ]);

  // Get high-priority unreviewed leads (leads without a follow-up sent, approximate)
  const unreviewedHighPriorityLeadCount = highPriorityLeadCount ?? 0;

  return {
    organizationId,
    businessSettings: businessSettings
      ? {
          business_name: businessSettings.business_name,
          website_url: (businessSettings as Record<string, unknown>).website_url as string | null,
          website_learned_at: (businessSettings as Record<string, unknown>).website_learned_at as string | null,
          description: (businessSettings as Record<string, unknown>).description as string | null,
          industry: (businessSettings as Record<string, unknown>).industry as string | null,
          business_hours: (businessSettings as Record<string, unknown>).business_hours,
          services: (businessSettings as Record<string, unknown>).services,
        }
      : null,
    agentCount: agentCount ?? 0,
    knowledgeSourceCount: knowledgeSourceCount ?? 0,
    leadCount: leadCount ?? 0,
    highPriorityLeadCount: highPriorityLeadCount ?? 0,
    unreviewedHighPriorityLeadCount,
    quoteRequestCount: quoteRequestCount ?? 0,
    pendingQuoteCount: pendingQuoteCount ?? 0,
    hasQuotePricingProfile: (pricingProfiles?.length ?? 0) > 0,
    hasPricingRules: (pricingRulesCount ?? 0) > 0,
    hasFollowUpAutomation: (automationsCount ?? 0) > 0,
    conversationsCount: conversationsCount ?? 0,
    followUpEmailsEnabled: true, // All plans can at least see this
    aiFollowUpEnabled: false, // Would require entitlement check
    widgetEnabled: (widgets ?? []).some((w) => (w as { enabled?: boolean }).enabled !== false),
    existingSuggestionTypes: (existingSuggestions ?? []).map((s) => s.suggestion_type as SuggestionType),
  };
}

/** Sync suggestions for an org. Idempotent — safe to call on every dashboard load. */
export async function syncSuggestionsForOrg(
  supabase: SupabaseClient,
  organizationId: string
): Promise<AiSuggestion[]> {
  // Load context and generate candidates
  const context = await loadSuggestionContext(supabase, organizationId);
  const candidates = generateSuggestionCandidates(context);

  // Insert new suggestions (skip if same type already active)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Expire old active suggestions that have outlived their usefulness
  await supabase
    .from('ai_suggestions')
    .update({ status: 'dismissed', dismissed_at: new Date().toISOString() })
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .lt('created_at', sevenDaysAgo.toISOString())
    .not('suggestion_type', 'in', '("review_high_priority_leads","add_pricing_info")');

  // Insert new candidates (skip existing active types)
  const existingTypes = new Set(context.existingSuggestionTypes ?? []);
  const toInsert = candidates.filter((c) => !existingTypes.has(c.suggestion_type));

  if (toInsert.length > 0) {
    await supabase.from('ai_suggestions').insert(
      toInsert.map((c) => ({
        organization_id: organizationId,
        suggestion_type: c.suggestion_type,
        title: c.title,
        description: c.description,
        action_href: c.action_href ?? null,
        action_label: c.action_label ?? null,
        priority: c.priority,
        status: 'active',
        grounding_data: c.grounding_data ?? {},
        expires_at: c.expires_at ?? null,
      }))
    );
  }

  // Return current active suggestions sorted by priority
  const { data: active } = await supabase
    .from('ai_suggestions')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .order('priority', { ascending: false })
    .limit(8);

  return (active ?? []) as AiSuggestion[];
}
