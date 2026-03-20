/**
 * Fair Access Control Layer — comprehensive plan-based feature and usage gating.
 *
 * Builds on subscription-access.ts with:
 * - All usage metrics (agents, widgets, automations, team, knowledge, messages, actions…)
 * - Warning thresholds at 70 / 90 / 100%
 * - Rich AccessStatus for UI (allowed / blocked / warning / limit_reached / requires_upgrade)
 * - Soft widget fallback response (ai_disabled: true, allow_lead_capture: true)
 * - Add-on-ready interfaces for future Stripe add-ons
 * - canCreateResource() helper used by page-level gates and API enforcement
 *
 * Use getOrganizationAccessSnapshot() as the single entry point for server-side decisions.
 * Prefer this over calling getOrganizationSubscriptionAccess() directly in new code.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import {
  getOrganizationSubscriptionAccess,
  type OrganizationSubscriptionAccess,
  type UsageStatus,
} from '@/lib/billing/subscription-access';
import { getEntitlements, getCurrentUsage } from '@/lib/entitlements';
import { getNextPlanSlug } from '@/lib/plan-config';

// ─── Re-exports for convenience ───────────────────────────────────────────────
export type {
  OrganizationSubscriptionAccess,
  UsageStatus,
  SubscriptionStatus,
  BlockedReason,
} from '@/lib/billing/subscription-access';

// ─── Feature Keys ─────────────────────────────────────────────────────────────

/** Hard-gated feature keys — unlocked by plan tier, not counting towards usage. */
export type PlanFeatureKey =
  | 'white_label'
  | 'custom_branding'
  | 'advanced_branding'
  | 'widget_branding_removal'
  | 'advanced_analytics'
  | 'webhooks'
  | 'api_access'
  | 'voice'
  | 'advanced_automations'
  | 'tool_calling'
  | 'ai_pages'
  | 'inbox'
  | 'bookings'
  | 'ai_followup'
  | 'followup_drafts'
  | 'ai_lead_scoring'
  | 'ai_suggestions'
  | 'conversation_learning'
  | 'email_automation';

// ─── Usage Metric Keys ────────────────────────────────────────────────────────

/** Countable resources and periodic metrics tracked against plan limits. */
export type UsageMetricKey =
  | 'monthly_messages'
  | 'monthly_ai_actions'
  | 'knowledge_sources'
  | 'team_members'
  | 'agents'
  | 'widgets'
  | 'automations'
  | 'followup_emails'
  | 'voice_minutes'
  | 'document_uploads'
  | 'ai_pages';

// ─── Access Status ────────────────────────────────────────────────────────────

export type AccessStatus =
  | 'allowed'           // under limit, feature unlocked
  | 'blocked'           // feature not on plan (hard gate)
  | 'warning'           // 70–89%: show warning but allow creation
  | 'limit_reached'     // 100%: block new resource creation
  | 'requires_upgrade'  // plan does not include this feature at all
  | 'requires_addon_later'; // plan too low; reserved for future add-on purchasing

// ─── Warning Levels ───────────────────────────────────────────────────────────

export type UsageWarningLevel = 'healthy' | 'nearing_limit' | 'high_usage' | 'limit_reached';

export type UsageWarning = {
  metric: UsageMetricKey;
  level: UsageWarningLevel;
  used: number;
  limit: number;
  pct: number;
  label: string;
  /** Ready-to-display message for the warning banner. */
  message: string;
};

// ─── Rich Usage Snapshot ──────────────────────────────────────────────────────

export type RichUsageStatus = UsageStatus & {
  agents_count: number;
  agents_limit: number;
  agents_pct: number;
  agents_status: UsageWarningLevel;

  knowledge_sources_count: number;
  knowledge_sources_limit: number;
  knowledge_sources_pct: number;
  knowledge_sources_status: UsageWarningLevel;

  team_members_count: number;
  team_members_limit: number;
  team_members_pct: number;
  team_members_status: UsageWarningLevel;

  automations_count: number;
  automations_limit: number;
  automations_pct: number;
  automations_status: UsageWarningLevel;

  widgets_count: number;
  widgets_limit: number;
  widgets_pct: number;
  widgets_status: UsageWarningLevel;

  document_uploads_count: number;
  document_uploads_limit: number;
  document_uploads_pct: number;
  document_uploads_status: UsageWarningLevel;

  ai_pages_count: number;
  ai_pages_limit: number;
  ai_pages_pct: number;
  ai_pages_status: UsageWarningLevel;

  messages_pct: number;
  messages_status: UsageWarningLevel;

  ai_actions_pct: number;
  ai_actions_status: UsageWarningLevel;
};

// ─── Add-on Ready Interfaces ──────────────────────────────────────────────────
// These types are forward-looking; add-on purchasing is not yet implemented.
// Structure is ready to be wired up to Stripe once product is ready.

export type AddOnType =
  | 'extra_messages'
  | 'extra_ai_actions'
  | 'extra_team_seats'
  | 'extra_widgets'
  | 'extra_voice_minutes';

export type AddOnSlot = {
  type: AddOnType;
  quantity: number;
  label: string;
  /** Reserved: Stripe price ID for future add-on checkout. */
  stripePriceId?: string;
};

// ─── Full Access Snapshot ─────────────────────────────────────────────────────

export type OrganizationAccessSnapshot = OrganizationSubscriptionAccess & {
  richUsage: RichUsageStatus;
  usageWarnings: UsageWarning[];
  /** Always empty until add-on purchasing is implemented. Kept for forward compatibility. */
  addOns: AddOnSlot[];
};

// ─── Human-readable labels ───────────────────────────────────────────────────

export const USAGE_LABELS: Record<UsageMetricKey, string> = {
  monthly_messages: 'AI replies',
  monthly_ai_actions: 'AI actions',
  knowledge_sources: 'Knowledge sources',
  team_members: 'Team members',
  agents: 'Assistants',
  widgets: 'Widgets',
  automations: 'Automations',
  followup_emails: 'Follow-up emails',
  voice_minutes: 'Voice minutes',
  document_uploads: 'Uploaded documents',
  ai_pages: 'AI Pages',
};

export const FEATURE_DISPLAY_LABELS: Record<PlanFeatureKey, string> = {
  white_label: 'White label',
  custom_branding: 'Custom branding',
  advanced_branding: 'Advanced widget branding',
  widget_branding_removal: 'Remove "Powered by Spaxio" branding',
  advanced_analytics: 'Advanced analytics',
  webhooks: 'Webhooks',
  api_access: 'API access',
  voice: 'Voice support',
  advanced_automations: 'Automations & workflows',
  tool_calling: 'AI tool calling',
  ai_pages: 'AI Pages',
  inbox: 'Human inbox',
  bookings: 'Bookings',
  ai_followup: 'AI follow-up generation',
  followup_drafts: 'Follow-up draft approvals',
  ai_lead_scoring: 'AI lead scoring',
  ai_suggestions: 'AI suggestions',
  conversation_learning: 'Conversation learning & insights',
  email_automation: 'Email auto-replies',
};

// ─── Computation helpers ──────────────────────────────────────────────────────

function usagePct(used: number, limit: number): number {
  if (!limit || limit <= 0) return used > 0 ? 100 : 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

function warningLevel(pct: number, atOrOverLimit: boolean): UsageWarningLevel {
  if (atOrOverLimit || pct >= 100) return 'limit_reached';
  if (pct >= 90) return 'high_usage';
  if (pct >= 70) return 'nearing_limit';
  return 'healthy';
}

function warningMessage(label: string, pct: number, level: UsageWarningLevel): string {
  if (level === 'limit_reached') return `Your ${label.toLowerCase()} limit has been reached for this period.`;
  if (level === 'high_usage') return `You've used ${pct}% of your ${label.toLowerCase()} this period.`;
  return `You've used ${pct}% of your ${label.toLowerCase()} — you're getting close to your limit.`;
}

// ─── Core: getOrganizationAccessSnapshot ─────────────────────────────────────

/**
 * Comprehensive access snapshot for an organization.
 * Includes all usage metrics, warning thresholds, feature gating, and add-on slots.
 *
 * This is the primary entry point for all access decisions — prefer over calling
 * getOrganizationSubscriptionAccess() directly in new code.
 */
export async function getOrganizationAccessSnapshot(
  supabase: SupabaseClient,
  organizationId: string,
  adminAllowed: boolean
): Promise<OrganizationAccessSnapshot> {
  // Fetch base snapshot + raw usage + entitlements in parallel
  const [base, rawUsage, entResult] = await Promise.all([
    getOrganizationSubscriptionAccess(supabase, organizationId, adminAllowed),
    getCurrentUsage(supabase, organizationId),
    getEntitlements(supabase, organizationId),
  ]);

  const ent = entResult.entitlements;

  // Fetch widgets and automations counts (not in getCurrentUsage)
  const [widgetsRes, automationsRes] = await Promise.all([
    supabase
      .from('widgets')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId),
    supabase
      .from('automations')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId),
  ]);

  const widgetsCount = widgetsRes.count ?? 0;
  const automationsCount = automationsRes.count ?? 0;

  // Resolve limits from entitlements
  const widgetsLimit = Number(ent.max_widgets ?? 1);
  const automationsLimit = Number(ent.max_automations ?? 0);
  const agentsLimit = Number(ent.max_agents ?? 1);
  const knowledgeLimit = Number(ent.max_knowledge_sources ?? 1);
  const teamLimit = Number(ent.max_team_members ?? 1);
  const docLimit = Number(ent.max_document_uploads ?? 0);
  const aiPagesLimit = Number(ent.max_ai_pages ?? 0);

  const msgPct = usagePct(base.usage.message_count, base.usage.message_limit);
  const actPct = usagePct(base.usage.ai_action_count, base.usage.ai_action_limit);
  const aPct = usagePct(rawUsage.agents_count, agentsLimit);
  const kPct = usagePct(rawUsage.knowledge_sources_count, knowledgeLimit);
  const tmPct = usagePct(rawUsage.team_members_count, teamLimit);
  const autoPct = usagePct(automationsCount, automationsLimit);
  const wPct = usagePct(widgetsCount, widgetsLimit);
  const dPct = usagePct(rawUsage.document_uploads_count, docLimit);
  const aipPct = usagePct(rawUsage.ai_pages_count, aiPagesLimit);

  const richUsage: RichUsageStatus = {
    ...base.usage,

    agents_count: rawUsage.agents_count,
    agents_limit: agentsLimit,
    agents_pct: aPct,
    agents_status: warningLevel(aPct, rawUsage.agents_count >= agentsLimit),

    knowledge_sources_count: rawUsage.knowledge_sources_count,
    knowledge_sources_limit: knowledgeLimit,
    knowledge_sources_pct: kPct,
    knowledge_sources_status: warningLevel(kPct, rawUsage.knowledge_sources_count >= knowledgeLimit),

    team_members_count: rawUsage.team_members_count,
    team_members_limit: teamLimit,
    team_members_pct: tmPct,
    team_members_status: warningLevel(tmPct, rawUsage.team_members_count >= teamLimit),

    automations_count: automationsCount,
    automations_limit: automationsLimit,
    automations_pct: autoPct,
    automations_status: warningLevel(autoPct, automationsCount >= automationsLimit && automationsLimit > 0),

    widgets_count: widgetsCount,
    widgets_limit: widgetsLimit,
    widgets_pct: wPct,
    widgets_status: warningLevel(wPct, widgetsCount >= widgetsLimit),

    document_uploads_count: rawUsage.document_uploads_count,
    document_uploads_limit: docLimit,
    document_uploads_pct: dPct,
    document_uploads_status: warningLevel(dPct, rawUsage.document_uploads_count >= docLimit && docLimit > 0),

    ai_pages_count: rawUsage.ai_pages_count,
    ai_pages_limit: aiPagesLimit,
    ai_pages_pct: aipPct,
    ai_pages_status: warningLevel(aipPct, rawUsage.ai_pages_count >= aiPagesLimit && aiPagesLimit > 0),

    messages_pct: msgPct,
    messages_status: warningLevel(msgPct, base.usage.messages_exceeded),

    ai_actions_pct: actPct,
    ai_actions_status: warningLevel(actPct, base.usage.ai_actions_exceeded),
  };

  const usageWarnings = buildUsageWarnings(richUsage, ent.automations_enabled);

  return {
    ...base,
    richUsage,
    usageWarnings,
    addOns: [],
  };
}

// ─── Warning builder ──────────────────────────────────────────────────────────

/**
 * Build the list of actionable usage warnings for display in dashboard/billing.
 * Only includes limited metrics at or above 70%.
 */
export function buildUsageWarnings(
  usage: RichUsageStatus,
  automationsEnabled: boolean
): UsageWarning[] {
  const checks: Array<{
    metric: UsageMetricKey;
    used: number;
    limit: number;
    status: UsageWarningLevel;
    pct: number;
  }> = [
    {
      metric: 'monthly_messages',
      used: usage.message_count,
      limit: usage.message_limit,
      status: usage.messages_status,
      pct: usage.messages_pct,
    },
    {
      metric: 'monthly_ai_actions',
      used: usage.ai_action_count,
      limit: usage.ai_action_limit,
      status: usage.ai_actions_status,
      pct: usage.ai_actions_pct,
    },
    {
      metric: 'agents',
      used: usage.agents_count,
      limit: usage.agents_limit,
      status: usage.agents_status,
      pct: usage.agents_pct,
    },
    {
      metric: 'knowledge_sources',
      used: usage.knowledge_sources_count,
      limit: usage.knowledge_sources_limit,
      status: usage.knowledge_sources_status,
      pct: usage.knowledge_sources_pct,
    },
    {
      metric: 'team_members',
      used: usage.team_members_count,
      limit: usage.team_members_limit,
      status: usage.team_members_status,
      pct: usage.team_members_pct,
    },
    {
      metric: 'widgets',
      used: usage.widgets_count,
      limit: usage.widgets_limit,
      status: usage.widgets_status,
      pct: usage.widgets_pct,
    },
  ];

  if (automationsEnabled) {
    checks.push({
      metric: 'automations',
      used: usage.automations_count,
      limit: usage.automations_limit,
      status: usage.automations_status,
      pct: usage.automations_pct,
    });
  }

  return checks
    .filter((c) => c.limit > 0 && c.pct >= 70)
    .map((c) => ({
      metric: c.metric,
      level: c.status,
      used: c.used,
      limit: c.limit,
      pct: c.pct,
      label: USAGE_LABELS[c.metric],
      message: warningMessage(USAGE_LABELS[c.metric], c.pct, c.status),
    }));
}

// ─── Feature access helpers ───────────────────────────────────────────────────

/** Check whether a hard-gated plan feature is available from a snapshot. */
export function hasFeatureAccess(
  snapshot: OrganizationAccessSnapshot,
  feature: PlanFeatureKey
): boolean {
  if (snapshot.adminBypass) return true;
  const ent = snapshot.entitlements;
  switch (feature) {
    case 'white_label':             return ent.white_label;
    case 'custom_branding':         return ent.custom_branding;
    case 'advanced_branding':       return ent.advanced_branding_enabled;
    case 'widget_branding_removal': return ent.widget_branding_removal;
    case 'advanced_analytics':      return ent.analytics_advanced_enabled;
    case 'webhooks':                return ent.webhook_access;
    case 'api_access':              return ent.api_access;
    case 'voice':                   return ent.voice_enabled;
    case 'advanced_automations':    return ent.automations_enabled;
    case 'tool_calling':            return ent.tool_calling_enabled;
    case 'ai_pages':                return ent.ai_pages_enabled;
    case 'inbox':                   return ent.inbox_enabled;
    case 'bookings':                return ent.bookings_enabled;
    case 'ai_followup':             return ent.ai_followup_enabled;
    case 'followup_drafts':         return ent.followup_drafts_enabled;
    case 'ai_lead_scoring':         return ent.ai_lead_scoring_enabled;
    case 'ai_suggestions':          return ent.ai_suggestions_enabled;
    case 'conversation_learning':   return ent.conversation_learning_enabled;
    case 'email_automation':        return ent.followup_emails_enabled;
    default:                        return false;
  }
}

// ─── Usage limit helpers ──────────────────────────────────────────────────────

/** Get the plan limit for a usage metric from a snapshot. Returns 0 if unlimited/undefined. */
export function getUsageLimit(
  snapshot: OrganizationAccessSnapshot,
  metric: UsageMetricKey
): number {
  const ru = snapshot.richUsage;
  switch (metric) {
    case 'monthly_messages':   return ru.message_limit;
    case 'monthly_ai_actions': return ru.ai_action_limit;
    case 'agents':             return ru.agents_limit;
    case 'knowledge_sources':  return ru.knowledge_sources_limit;
    case 'team_members':       return ru.team_members_limit;
    case 'automations':        return ru.automations_limit;
    case 'widgets':            return ru.widgets_limit;
    case 'document_uploads':   return ru.document_uploads_limit;
    case 'ai_pages':           return ru.ai_pages_limit;
    default:                   return 0;
  }
}

/** Get the current usage count for a metric from a snapshot. */
export function getUsageCount(
  snapshot: OrganizationAccessSnapshot,
  metric: UsageMetricKey
): number {
  const ru = snapshot.richUsage;
  switch (metric) {
    case 'monthly_messages':   return ru.message_count;
    case 'monthly_ai_actions': return ru.ai_action_count;
    case 'agents':             return ru.agents_count;
    case 'knowledge_sources':  return ru.knowledge_sources_count;
    case 'team_members':       return ru.team_members_count;
    case 'automations':        return ru.automations_count;
    case 'widgets':            return ru.widgets_count;
    case 'document_uploads':   return ru.document_uploads_count;
    case 'ai_pages':           return ru.ai_pages_count;
    default:                   return 0;
  }
}

/** Get the warning level for a specific metric from a snapshot. */
export function getUsageStatus(
  snapshot: OrganizationAccessSnapshot,
  metric: UsageMetricKey
): UsageWarningLevel {
  const ru = snapshot.richUsage;
  switch (metric) {
    case 'monthly_messages':   return ru.messages_status;
    case 'monthly_ai_actions': return ru.ai_actions_status;
    case 'agents':             return ru.agents_status;
    case 'knowledge_sources':  return ru.knowledge_sources_status;
    case 'team_members':       return ru.team_members_status;
    case 'automations':        return ru.automations_status;
    case 'widgets':            return ru.widgets_status;
    case 'document_uploads':   return ru.document_uploads_status;
    case 'ai_pages':           return ru.ai_pages_status;
    default:                   return 'healthy';
  }
}

// ─── Resource creation check ──────────────────────────────────────────────────

/**
 * Check if a new resource can be created given a current count and limit.
 *
 * Returns:
 * - 'allowed'          → below 70% — create freely
 * - 'warning'          → 70–89% — create but show warning
 * - 'limit_reached'    → at or above limit — block creation
 * - 'requires_upgrade' → limit is 0 or plan doesn't support this resource
 */
export function canCreateResource(
  currentCount: number,
  limit: number,
  adminAllowed: boolean
): AccessStatus {
  if (adminAllowed) return 'allowed';
  if (limit <= 0) return 'requires_upgrade';
  if (currentCount >= limit) return 'limit_reached';
  const pct = usagePct(currentCount, limit);
  if (pct >= 90) return 'warning';
  return 'allowed';
}

/** Convenience: get create status from snapshot + metric key. */
export function canCreateResourceFromSnapshot(
  snapshot: OrganizationAccessSnapshot,
  metric: UsageMetricKey
): AccessStatus {
  return canCreateResource(
    getUsageCount(snapshot, metric),
    getUsageLimit(snapshot, metric),
    snapshot.adminBypass
  );
}

// ─── Upgrade reason helpers ───────────────────────────────────────────────────

/** Human-readable upgrade reason for a specific metric or feature. */
export function getUpgradeReason(
  snapshot: OrganizationAccessSnapshot,
  metric?: UsageMetricKey | PlanFeatureKey
): string {
  const nextPlan = getNextPlanSlug(snapshot.planSlug);
  const nextPlanName = nextPlan.charAt(0).toUpperCase() + nextPlan.slice(1);

  if (!metric) {
    if (snapshot.usageWarnings.length > 0) {
      const w = snapshot.usageWarnings[0];
      if (w.level === 'limit_reached') {
        return `You've reached the ${w.label.toLowerCase()} limit for your plan. Upgrade to ${nextPlanName} to continue.`;
      }
      return `You've used ${w.pct}% of your ${w.label.toLowerCase()} this period. Upgrade to ${nextPlanName} for more.`;
    }
    return `Upgrade to ${nextPlanName} to unlock more features and higher limits.`;
  }

  const usageMetrics: UsageMetricKey[] = [
    'monthly_messages', 'monthly_ai_actions', 'agents', 'knowledge_sources',
    'team_members', 'automations', 'widgets',
  ];

  if (usageMetrics.includes(metric as UsageMetricKey)) {
    const label = USAGE_LABELS[metric as UsageMetricKey] ?? metric;
    return `You've reached the ${label.toLowerCase()} limit for your plan. Upgrade to ${nextPlanName} for more.`;
  }

  const featureLabel = FEATURE_DISPLAY_LABELS[metric as PlanFeatureKey] ?? metric;
  return `${featureLabel} is not included in your current plan. Upgrade to ${nextPlanName} to unlock it.`;
}

// ─── Widget soft fallback ─────────────────────────────────────────────────────

/**
 * Soft limit response for /api/widget/chat when AI message limit is reached.
 *
 * Returns a 200 OK (not a 403) so the widget renders a graceful fallback
 * rather than an error screen. Lead capture and quote forms remain available.
 *
 * Shape returned to the widget:
 * {
 *   ok: true,
 *   reply: "...",
 *   usage_state: "message_limit_reached",
 *   ai_disabled: true,
 *   allow_lead_capture: true,
 *   allow_quote_request: true,
 *   upgrade_url: "/pricing"
 * }
 */
export function widgetAiLimitResponse(
  currentPlanSlug: string,
  corsHeaders: Record<string, string> = {}
): NextResponse {
  const nextPlan = getNextPlanSlug(currentPlanSlug);
  return NextResponse.json(
    {
      ok: true,
      reply:
        "We've received your message. Our team will get back to you shortly. Feel free to leave your contact details and we'll follow up as soon as possible.",
      usage_state: 'message_limit_reached',
      ai_disabled: true,
      allow_lead_capture: true,
      allow_quote_request: true,
      upgrade_url: '/pricing',
      current_plan: currentPlanSlug,
      recommended_plan: nextPlan,
    },
    { headers: corsHeaders }
  );
}

/**
 * Soft response for /api/widget/chat when the org has no active subscription.
 * Widget still loads and lead capture remains available.
 */
export function widgetNoSubscriptionResponse(
  corsHeaders: Record<string, string> = {}
): NextResponse {
  return NextResponse.json(
    {
      ok: true,
      reply:
        "Thank you for reaching out. Please leave your contact details and our team will get back to you.",
      usage_state: 'subscription_required',
      ai_disabled: true,
      allow_lead_capture: true,
      allow_quote_request: true,
    },
    { headers: corsHeaders }
  );
}
