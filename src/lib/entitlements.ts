/**
 * Central entitlements / permissions layer for plan-based feature gating.
 * Do not scatter raw plan-name checks; use this module everywhere.
 *
 * Migration note: Legacy price STRIPE_PRICE_ID maps to plan legacy_assistant_pro (see billing webhook).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

type PlanRow = Database['public']['Tables']['plans']['Row'];
type PlanEntitlementRow = Database['public']['Tables']['plan_entitlements']['Row'];

export type Entitlements = {
  max_agents: number;
  max_automations: number;
  monthly_messages: number;
  monthly_ai_actions: number;
  max_knowledge_sources: number;
  max_document_uploads: number;
  max_team_members: number;
  widget_branding_removal: boolean;
  custom_branding: boolean;
  automations_enabled: boolean;
  tool_calling_enabled: boolean;
  webhook_access: boolean;
  api_access: boolean;
  analytics_level: string;
  priority_support: boolean;
  white_label: boolean;
  integrations_enabled: boolean;
};

const DEFAULT_ENTITLEMENTS: Entitlements = {
  max_agents: 1,
  max_automations: 0,
  monthly_messages: 100,
  monthly_ai_actions: 100,
  max_knowledge_sources: 1,
  max_document_uploads: 0,
  max_team_members: 0,
  widget_branding_removal: false,
  custom_branding: false,
  automations_enabled: false,
  tool_calling_enabled: false,
  webhook_access: false,
  api_access: false,
  analytics_level: 'basic',
  priority_support: false,
  white_label: false,
  integrations_enabled: false,
};

function parseEntitlementValue(value: unknown): number | boolean | string {
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') return value;
  if (value === null || value === undefined) return 0;
  return String(value);
}

function entitlementsFromRows(rows: PlanEntitlementRow[]): Entitlements {
  const out = { ...DEFAULT_ENTITLEMENTS };
  for (const row of rows) {
    const key = row.entitlement_key as keyof Entitlements;
    if (!(key in out)) continue;
    const v = row.value as unknown;
    const parsed = parseEntitlementValue(v);
    (out as Record<string, number | boolean | string>)[key] = parsed;
  }
  return out;
}

/** Resolve plan for org: subscription.plan_id or stripe_price_id mapping, else Free. */
export async function getPlanForOrg(
  supabase: SupabaseClient,
  organizationId: string
): Promise<PlanRow | null> {
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan_id, stripe_price_id')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (sub?.plan_id) {
    const { data: plan } = await supabase.from('plans').select('*').eq('id', sub.plan_id).single();
    return plan ?? null;
  }

  // Legacy: map current STRIPE_PRICE_ID to legacy_assistant_pro (migration-safe)
  const legacyPriceId = process.env.STRIPE_PRICE_ID;
  if (sub?.stripe_price_id && legacyPriceId && sub.stripe_price_id === legacyPriceId) {
    const { data: plan } = await supabase.from('plans').select('*').eq('slug', 'legacy_assistant_pro').single();
    return plan ?? null;
  }

  // Optional: support multiple price IDs via env (e.g. STRIPE_PRICE_ID_STARTER, STRIPE_PRICE_ID_PRO)
  const priceToSlug: Record<string, string> = {};
  if (process.env.STRIPE_PRICE_ID_STARTER) priceToSlug[process.env.STRIPE_PRICE_ID_STARTER] = 'starter';
  if (process.env.STRIPE_PRICE_ID_PRO) priceToSlug[process.env.STRIPE_PRICE_ID_PRO] = 'pro';
  if (process.env.STRIPE_PRICE_ID_BUSINESS) priceToSlug[process.env.STRIPE_PRICE_ID_BUSINESS] = 'business';
  if (sub?.stripe_price_id && priceToSlug[sub.stripe_price_id]) {
    const slug = priceToSlug[sub.stripe_price_id];
    const { data: plan } = await supabase.from('plans').select('*').eq('slug', slug).single();
    return plan ?? null;
  }

  // Default: Free plan (use maybeSingle so missing row doesn't throw)
  const { data: freePlan } = await supabase.from('plans').select('*').eq('slug', 'free').maybeSingle();
  return freePlan ?? null;
}

/** Load full entitlements for an org (plan + defaults). Admin bypass not applied here; apply in callers. */
export async function getEntitlements(
  supabase: SupabaseClient,
  organizationId: string
): Promise<{ plan: PlanRow | null; entitlements: Entitlements }> {
  const plan = await getPlanForOrg(supabase, organizationId);
  if (!plan) {
    return { plan: null, entitlements: DEFAULT_ENTITLEMENTS };
  }
  const { data: rows } = await supabase
    .from('plan_entitlements')
    .select('*')
    .eq('plan_id', plan.id);
  const entitlements = entitlementsFromRows(rows ?? []);
  return { plan, entitlements };
}

/** Current usage counts for the org (this billing period). */
export async function getCurrentUsage(
  supabase: SupabaseClient,
  organizationId: string
): Promise<{
  message_count: number;
  ai_action_count: number;
  agents_count: number;
  knowledge_sources_count: number;
  team_members_count: number;
  document_uploads_count: number;
}> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const [usageRes, agentsRes, sourcesRes, membersRes, sourcesList] = await Promise.all([
    supabase
      .from('org_usage')
      .select('message_count, ai_action_count')
      .eq('organization_id', organizationId)
      .eq('period_start', periodStart)
      .maybeSingle(),
    supabase.from('agents').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('knowledge_sources').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('organization_members').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('knowledge_sources').select('id').eq('organization_id', organizationId),
  ]);

  const sourceIds = (sourcesList.data ?? []).map((s) => s.id);
  let document_uploads_count = 0;
  if (sourceIds.length > 0) {
    const { count } = await supabase
      .from('knowledge_documents')
      .select('id', { count: 'exact', head: true })
      .in('source_id', sourceIds);
    document_uploads_count = count ?? 0;
  }

  const usage = usageRes.data;
  return {
    message_count: usage?.message_count ?? 0,
    ai_action_count: usage?.ai_action_count ?? 0,
    agents_count: agentsRes.count ?? 0,
    knowledge_sources_count: sourcesRes.count ?? 0,
    team_members_count: membersRes.count ?? 0,
    document_uploads_count,
  };
}

/** Whether the org can create another agent (under max_agents). */
export async function canCreateAgent(
  supabase: SupabaseClient,
  organizationId: string,
  adminAllowed = false
): Promise<boolean> {
  if (adminAllowed) return true;
  const { entitlements } = await getEntitlements(supabase, organizationId);
  const { data: agents } = await supabase
    .from('agents')
    .select('id')
    .eq('organization_id', organizationId);
  const count = agents?.length ?? 0;
  const max = Number(entitlements.max_agents);
  return count < (Number.isFinite(max) ? max : 0);
}

/** Whether the org can use automations. */
export async function canUseAutomation(
  supabase: SupabaseClient,
  organizationId: string,
  adminAllowed = false
): Promise<boolean> {
  if (adminAllowed) return true;
  const { entitlements } = await getEntitlements(supabase, organizationId);
  return entitlements.automations_enabled;
}

/** Whether the org can create another automation (under max_automations). */
export async function canCreateAutomation(
  supabase: SupabaseClient,
  organizationId: string,
  adminAllowed = false
): Promise<boolean> {
  if (adminAllowed) return true;
  const { entitlements } = await getEntitlements(supabase, organizationId);
  if (!entitlements.automations_enabled) return false;
  const { count } = await supabase
    .from('automations')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId);
  const max = Number(entitlements.max_automations);
  return (count ?? 0) < (Number.isFinite(max) && max > 0 ? max : 999);
}

/** Whether the org can remove widget branding. */
export async function canRemoveBranding(
  supabase: SupabaseClient,
  organizationId: string,
  adminAllowed = false
): Promise<boolean> {
  if (adminAllowed) return true;
  const { entitlements } = await getEntitlements(supabase, organizationId);
  return entitlements.widget_branding_removal;
}

/** Whether the org has exceeded monthly message limit. */
export async function hasExceededMonthlyMessages(
  supabase: SupabaseClient,
  organizationId: string,
  adminAllowed = false
): Promise<boolean> {
  if (adminAllowed) return false;
  const { entitlements } = await getEntitlements(supabase, organizationId);
  const usage = await getCurrentUsage(supabase, organizationId);
  const limit = Number(entitlements.monthly_messages);
  return usage.message_count >= (Number.isFinite(limit) ? limit : 0);
}

/** Whether the org has exceeded monthly AI actions limit. */
export async function hasExceededMonthlyAiActions(
  supabase: SupabaseClient,
  organizationId: string,
  adminAllowed = false
): Promise<boolean> {
  if (adminAllowed) return false;
  const { entitlements } = await getEntitlements(supabase, organizationId);
  const usage = await getCurrentUsage(supabase, organizationId);
  const limit = Number(entitlements.monthly_ai_actions);
  return usage.ai_action_count >= (Number.isFinite(limit) ? limit : 0);
}

/** Whether the org can add another knowledge source. */
export async function canAddKnowledgeSource(
  supabase: SupabaseClient,
  organizationId: string,
  adminAllowed = false
): Promise<boolean> {
  if (adminAllowed) return true;
  const { entitlements } = await getEntitlements(supabase, organizationId);
  const usage = await getCurrentUsage(supabase, organizationId);
  const max = Number(entitlements.max_knowledge_sources);
  return usage.knowledge_sources_count < (Number.isFinite(max) ? max : 0);
}

/** Whether the org can add another document upload. */
export async function canAddDocumentUpload(
  supabase: SupabaseClient,
  organizationId: string,
  adminAllowed = false
): Promise<boolean> {
  if (adminAllowed) return true;
  const { entitlements } = await getEntitlements(supabase, organizationId);
  const usage = await getCurrentUsage(supabase, organizationId);
  const max = Number(entitlements.max_document_uploads);
  return usage.document_uploads_count < (Number.isFinite(max) ? max : 0);
}

/** Whether the org can use tool calling. */
export async function canUseToolCalling(
  supabase: SupabaseClient,
  organizationId: string,
  adminAllowed = false
): Promise<boolean> {
  if (adminAllowed) return true;
  const { entitlements } = await getEntitlements(supabase, organizationId);
  return entitlements.tool_calling_enabled;
}

/** Whether the org has webhook access. */
export async function hasWebhookAccess(
  supabase: SupabaseClient,
  organizationId: string,
  adminAllowed = false
): Promise<boolean> {
  if (adminAllowed) return true;
  const { entitlements } = await getEntitlements(supabase, organizationId);
  return entitlements.webhook_access;
}

/** Whether the org has API access. */
export async function hasApiAccess(
  supabase: SupabaseClient,
  organizationId: string,
  adminAllowed = false
): Promise<boolean> {
  if (adminAllowed) return true;
  const { entitlements } = await getEntitlements(supabase, organizationId);
  return entitlements.api_access;
}

/** Whether the org has at least the given analytics level (e.g. 'advanced'). */
export async function hasAnalyticsLevel(
  supabase: SupabaseClient,
  organizationId: string,
  level: 'basic' | 'advanced',
  adminAllowed = false
): Promise<boolean> {
  if (adminAllowed) return true;
  const { entitlements } = await getEntitlements(supabase, organizationId);
  const order = level === 'advanced' ? 1 : 0;
  const current = entitlements.analytics_level === 'advanced' ? 1 : 0;
  return current >= order;
}

/** Whether the org can add another team member. */
export async function canAddTeamMember(
  supabase: SupabaseClient,
  organizationId: string,
  adminAllowed = false
): Promise<boolean> {
  if (adminAllowed) return true;
  const { entitlements } = await getEntitlements(supabase, organizationId);
  const usage = await getCurrentUsage(supabase, organizationId);
  const max = Number(entitlements.max_team_members);
  return usage.team_members_count < (Number.isFinite(max) ? max : 0);
}

/** Whether the org has active subscription (paid or in trial). Used for "can use chat" etc. */
export async function hasActiveSubscription(
  supabase: SupabaseClient,
  organizationId: string,
  adminAllowed = false
): Promise<boolean> {
  if (adminAllowed) return true;
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status, trial_ends_at')
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (!sub) return false;
  if (sub.status === 'active') return true;
  if (sub.status === 'trialing' && sub.trial_ends_at) {
    return new Date(sub.trial_ends_at) > new Date();
  }
  return false;
}
