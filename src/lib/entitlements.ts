/**
 * Central entitlements / permissions layer for plan-based feature gating.
 * Do not scatter raw plan-name checks; use this module everywhere.
 *
 * Migration note: Legacy price STRIPE_PRICE_ID maps to plan legacy_assistant_pro (see billing webhook).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { getPlanTier } from '@/lib/plan-config';

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
  // AI Actions, Inbox, Bookings, Voice
  inbox_enabled: boolean;
  human_seats: number;
  ai_actions_enabled: boolean;
  bookings_enabled: boolean;
  voice_enabled: boolean;
  monthly_voice_minutes: number;
  advanced_escalation: boolean;
  ai_draft_replies: boolean;
  phone_integration: boolean;
  max_active_voice_agents: number;
  max_businesses: number;
  ai_pages_enabled: boolean;
  max_ai_pages: number;
  followup_emails_enabled: boolean;
  ai_followup_enabled: boolean;
  followup_drafts_enabled: boolean;
  monthly_followup_email_limit: number;
  delayed_followups_enabled: boolean;
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
  inbox_enabled: false,
  human_seats: 0,
  ai_actions_enabled: false,
  bookings_enabled: false,
  voice_enabled: false,
  monthly_voice_minutes: 0,
  advanced_escalation: false,
  ai_draft_replies: false,
  phone_integration: false,
  max_active_voice_agents: 0,
  max_businesses: 1,
  ai_pages_enabled: false,
  max_ai_pages: 0,
  followup_emails_enabled: false,
  ai_followup_enabled: false,
  followup_drafts_enabled: false,
  monthly_followup_email_limit: 0,
  delayed_followups_enabled: false,
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
  ai_pages_count: number;
}> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const [usageRes, agentsRes, sourcesRes, membersRes, sourcesList, aiPagesRes] = await Promise.all([
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
    supabase.from('ai_pages').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
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
    ai_pages_count: aiPagesRes.count ?? 0,
  };
}

/** Whether the org can create another AI page (ai_pages_enabled and under max_ai_pages). */
export async function canCreateAiPage(
  supabase: SupabaseClient,
  organizationId: string,
  adminAllowed = false
): Promise<boolean> {
  if (adminAllowed) return true;
  const { entitlements } = await getEntitlements(supabase, organizationId);
  if (!entitlements.ai_pages_enabled) return false;
  const usage = await getCurrentUsage(supabase, organizationId);
  const max = Number(entitlements.max_ai_pages);
  return usage.ai_pages_count < (Number.isFinite(max) ? max : 0);
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

// -----------------------------------------------------------------------------
// AI Actions, Inbox, Bookings, Voice entitlements
// -----------------------------------------------------------------------------

/** Whether the org can use the Human+AI Inbox. */
export async function canUseInbox(
  supabase: SupabaseClient,
  organizationId: string,
  adminAllowed = false
): Promise<boolean> {
  if (adminAllowed) return true;
  const { entitlements } = await getEntitlements(supabase, organizationId);
  return entitlements.inbox_enabled;
}

/** Whether the org can use AI Actions (create_lead, book_appointment, etc.). */
export async function canUseAiActions(
  supabase: SupabaseClient,
  organizationId: string,
  adminAllowed = false
): Promise<boolean> {
  if (adminAllowed) return true;
  const { entitlements } = await getEntitlements(supabase, organizationId);
  return entitlements.ai_actions_enabled;
}

/** Whether the org can send follow-up emails (template/internal workflows). */
export async function canUseFollowUpEmails(
  supabase: SupabaseClient,
  organizationId: string,
  adminAllowed = false
): Promise<boolean> {
  if (adminAllowed) return true;
  const { entitlements } = await getEntitlements(supabase, organizationId);
  return entitlements.followup_emails_enabled;
}

/** Whether the org can use AI-generated follow-up content. */
export async function canUseAiFollowUp(
  supabase: SupabaseClient,
  organizationId: string,
  adminAllowed = false
): Promise<boolean> {
  if (adminAllowed) return true;
  const { entitlements } = await getEntitlements(supabase, organizationId);
  return entitlements.ai_followup_enabled;
}

/** Whether the org can use draft/approval flow for follow-up messaging. */
export async function canUseFollowUpDrafts(
  supabase: SupabaseClient,
  organizationId: string,
  adminAllowed = false
): Promise<boolean> {
  if (adminAllowed) return true;
  const { entitlements } = await getEntitlements(supabase, organizationId);
  return entitlements.followup_drafts_enabled;
}

/** Whether the org can use bookings / appointments. */
export async function canUseBookings(
  supabase: SupabaseClient,
  organizationId: string,
  adminAllowed = false
): Promise<boolean> {
  if (adminAllowed) return true;
  const { entitlements } = await getEntitlements(supabase, organizationId);
  return entitlements.bookings_enabled;
}

/** Whether the org can use voice agents. */
export async function canUseVoice(
  supabase: SupabaseClient,
  organizationId: string,
  adminAllowed = false
): Promise<boolean> {
  if (adminAllowed) return true;
  const { entitlements } = await getEntitlements(supabase, organizationId);
  return entitlements.voice_enabled;
}

/** Max human seats for inbox (assignment / takeover). */
export async function getHumanSeatsLimit(
  supabase: SupabaseClient,
  organizationId: string,
  adminAllowed = false
): Promise<number> {
  if (adminAllowed) return 999;
  const { entitlements } = await getEntitlements(supabase, organizationId);
  return Number(entitlements.human_seats) || 0;
}

/** Monthly voice minutes limit. */
export async function getMonthlyVoiceMinutesLimit(
  supabase: SupabaseClient,
  organizationId: string,
  adminAllowed = false
): Promise<number> {
  if (adminAllowed) return 999999;
  const { entitlements } = await getEntitlements(supabase, organizationId);
  return Number(entitlements.monthly_voice_minutes) || 0;
}

/** Whether the org has exceeded monthly voice minutes (based on voice_sessions duration_seconds in current month). */
export async function hasExceededMonthlyVoiceMinutes(
  supabase: SupabaseClient,
  organizationId: string,
  adminAllowed = false
): Promise<boolean> {
  if (adminAllowed) return false;
  const limit = await getMonthlyVoiceMinutesLimit(supabase, organizationId, false);
  if (!Number.isFinite(limit) || limit <= 0) return true;
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { data: sessions } = await supabase
    .from('voice_sessions')
    .select('duration_seconds')
    .eq('organization_id', organizationId)
    .gte('started_at', periodStart);
  const totalSeconds = (sessions ?? []).reduce(
    (sum, s) => sum + ((s as { duration_seconds: number | null }).duration_seconds ?? 0),
    0
  );
  const usedMinutes = Math.ceil(totalSeconds / 60);
  return usedMinutes >= limit;
}

/** Whether the org has advanced escalation (thresholds, business hours). */
export async function hasAdvancedEscalation(
  supabase: SupabaseClient,
  organizationId: string,
  adminAllowed = false
): Promise<boolean> {
  if (adminAllowed) return true;
  const { entitlements } = await getEntitlements(supabase, organizationId);
  return entitlements.advanced_escalation;
}

/** Whether the org can use AI draft replies in inbox. */
export async function canUseAiDraftReplies(
  supabase: SupabaseClient,
  organizationId: string,
  adminAllowed = false
): Promise<boolean> {
  if (adminAllowed) return true;
  const { entitlements } = await getEntitlements(supabase, organizationId);
  return entitlements.ai_draft_replies;
}

/** Whether the org has phone integration (Twilio etc.) entitlement. */
export async function hasPhoneIntegration(
  supabase: SupabaseClient,
  organizationId: string,
  adminAllowed = false
): Promise<boolean> {
  if (adminAllowed) return true;
  const { entitlements } = await getEntitlements(supabase, organizationId);
  return entitlements.phone_integration;
}

/** Max concurrent / active voice agents. */
export async function getMaxActiveVoiceAgents(
  supabase: SupabaseClient,
  organizationId: string,
  adminAllowed = false
): Promise<number> {
  if (adminAllowed) return 999;
  const { entitlements } = await getEntitlements(supabase, organizationId);
  return Number(entitlements.max_active_voice_agents) || 0;
}

// -----------------------------------------------------------------------------
// Multi-business: max organizations (businesses) a user can own
// -----------------------------------------------------------------------------

/** Number of organizations the user owns (role = owner). */
export async function getOwnedOrganizationsCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count } = await supabase
    .from('organization_members')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('role', 'owner');
  return count ?? 0;
}

/** Max businesses allowed and whether user can create another. Based on highest plan among orgs user owns. */
export async function getMaxBusinessesForUser(
  supabase: SupabaseClient,
  userId: string,
  adminAllowed = false
): Promise<{ max: number; ownedCount: number; canCreate: boolean }> {
  const { data: ownedMembers } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('role', 'owner');
  const orgIds = (ownedMembers ?? []).map((m) => m.organization_id);
  const ownedCount = orgIds.length;

  if (adminAllowed) {
    return { max: 999, ownedCount, canCreate: true };
  }

  const plans = await Promise.all(orgIds.map((orgId) => getPlanForOrg(supabase, orgId)));
  let bestTier = 0;
  let bestPlanId: string | null = null;
  for (const plan of plans) {
    if (!plan) continue;
    const tier = getPlanTier(plan.slug);
    if (tier > bestTier) {
      bestTier = tier;
      bestPlanId = plan.id;
    }
  }
  let max = 1;
  if (bestPlanId) {
    const { data: row } = await supabase
      .from('plan_entitlements')
      .select('value')
      .eq('plan_id', bestPlanId)
      .eq('entitlement_key', 'max_businesses')
      .maybeSingle();
    const v = row?.value;
    max = typeof v === 'number' ? v : Number(v) || 1;
  }
  return { max, ownedCount, canCreate: ownedCount < max };
}

/** Whether the user can create a new business (under their plan limit). */
export async function canCreateBusiness(
  supabase: SupabaseClient,
  userId: string,
  adminAllowed = false
): Promise<boolean> {
  const { canCreate } = await getMaxBusinessesForUser(supabase, userId, adminAllowed);
  return canCreate;
}
