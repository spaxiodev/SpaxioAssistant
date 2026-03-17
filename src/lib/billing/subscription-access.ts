/**
 * Central subscription entitlement and usage resolution.
 * Single source of truth for plan access, feature gating, and usage status.
 * All server-side enforcement should use this module (or entitlements.ts which it builds on).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import {
  getPlanForOrg,
  getEntitlements,
  getCurrentUsage,
  hasActiveSubscription,
  hasExceededMonthlyMessages,
  hasExceededMonthlyAiActions,
  canCreateAgent,
  canAddKnowledgeSource,
  canUseToolCalling,
  canUseAutomation,
  canCreateAutomation,
  hasWebhookAccess,
  hasApiAccess,
  canRemoveBranding,
  canAddTeamMember,
  canCreateAiPage,
  type Entitlements,
} from '@/lib/entitlements';
import type { Database } from '@/lib/supabase/database.types';

type PlanRow = Database['public']['Tables']['plans']['Row'];
import { getNextPlanSlug, normalizePlanSlug } from '@/lib/plan-config';

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'none';

export type UsageStatus = {
  message_count: number;
  ai_action_count: number;
  message_limit: number;
  ai_action_limit: number;
  messages_remaining: number;
  ai_actions_remaining: number;
  messages_exceeded: boolean;
  ai_actions_exceeded: boolean;
  period_start: string;
  period_end: string;
};

export type BlockedReason = {
  code: 'plan_limit' | 'usage_limit' | 'feature_locked';
  feature: string;
  reason: 'upgrade_required' | 'limit_reached';
  current_plan: string;
  recommended_plan?: string;
  message: string;
};

export type OrganizationSubscriptionAccess = {
  plan: PlanRow | null;
  planSlug: string;
  planName: string;
  billingStatus: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  isActive: boolean;
  isTrialing: boolean;
  adminBypass: boolean;
  entitlements: Entitlements;
  usage: UsageStatus;
  blockedReasons: BlockedReason[];
  upgradeRecommendations: string[];
};

/** Feature keys for centralized gating (maps to entitlements + usage). */
export type SubscriptionFeatureKey =
  | 'automations'
  | 'webhooks'
  | 'tool_calling'
  | 'api_access'
  | 'widget_branding_removal'
  | 'custom_branding'
  | 'team_members'
  | 'ai_pages'
  | 'agents'
  | 'knowledge_sources'
  | 'messages'
  | 'ai_actions'
  | 'document_uploads';

/** Resolve subscription status from subscriptions row. */
function subscriptionStatus(
  status: string | null,
  trialEndsAt: string | null,
  currentPeriodEnd: string | null
): SubscriptionStatus {
  if (!status) return 'none';
  if (status === 'active') return 'active';
  if (status === 'trialing') {
    if (trialEndsAt && new Date(trialEndsAt) > new Date()) return 'trialing';
    return 'none';
  }
  if (status === 'past_due') return 'past_due';
  if (status === 'canceled' || status === 'unpaid') return 'canceled';
  return 'none';
}

/**
 * Full subscription access for an organization. Use for billing page, dashboard, and enforcement.
 * When adminBypass is true, limits and feature locks are effectively lifted (for ADMIN_USER_IDS).
 */
export async function getOrganizationSubscriptionAccess(
  supabase: SupabaseClient,
  organizationId: string,
  adminAllowed: boolean
): Promise<OrganizationSubscriptionAccess> {
  const [subRow, { plan, entitlements }, usage] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('status, trial_ends_at, current_period_end')
      .eq('organization_id', organizationId)
      .maybeSingle(),
    getEntitlements(supabase, organizationId),
    getCurrentUsage(supabase, organizationId),
  ]);

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const planSlug = normalizePlanSlug(plan?.slug ?? 'free') ?? 'free';
  const status = subscriptionStatus(
    subRow?.data?.status ?? null,
    subRow?.data?.trial_ends_at ?? null,
    subRow?.data?.current_period_end ?? null
  );
  const isActive =
    adminAllowed ||
    status === 'active' ||
    (status === 'trialing' && subRow?.data?.trial_ends_at && new Date(subRow.data.trial_ends_at) > new Date());
  const isTrialing = !adminAllowed && status === 'trialing';

  const messageLimit = Number(entitlements.monthly_messages) || 0;
  const aiActionLimit = Number(entitlements.monthly_ai_actions) || 0;
  const messagesExceeded = !adminAllowed && usage.message_count >= messageLimit && Number.isFinite(messageLimit) && messageLimit > 0;
  const aiActionsExceeded = !adminAllowed && usage.ai_action_count >= aiActionLimit && Number.isFinite(aiActionLimit) && aiActionLimit > 0;

  const usageStatus: UsageStatus = {
    message_count: usage.message_count,
    ai_action_count: usage.ai_action_count,
    message_limit: messageLimit,
    ai_action_limit: aiActionLimit,
    messages_remaining: Math.max(0, messageLimit - usage.message_count),
    ai_actions_remaining: Math.max(0, aiActionLimit - usage.ai_action_count),
    messages_exceeded: messagesExceeded,
    ai_actions_exceeded: aiActionsExceeded,
    period_start: periodStart,
    period_end: periodEnd,
  };

  const blockedReasons: BlockedReason[] = [];
  const upgradeRecommendations: string[] = [];

  if (!adminAllowed) {
    if (messagesExceeded) {
      blockedReasons.push({
        code: 'usage_limit',
        feature: 'messages',
        reason: 'limit_reached',
        current_plan: planSlug,
        recommended_plan: getNextPlanSlug(planSlug),
        message: "You've used your message limit for this month. Upgrade for more.",
      });
      upgradeRecommendations.push('Upgrade to get more messages per month.');
    }
    if (aiActionsExceeded) {
      blockedReasons.push({
        code: 'usage_limit',
        feature: 'ai_actions',
        reason: 'limit_reached',
        current_plan: planSlug,
        recommended_plan: getNextPlanSlug(planSlug),
        message: "You've used your AI actions for this month. Upgrade to unlock more.",
      });
      upgradeRecommendations.push('Upgrade to automate follow-ups and get more AI actions.');
    }
    if (!entitlements.tool_calling_enabled) {
      upgradeRecommendations.push('Your plan does not include tool calling. Upgrade to Pro to enable it.');
    }
    if (!entitlements.automations_enabled) {
      upgradeRecommendations.push('Automations are available on Pro and above.');
    }
    if (!entitlements.ai_pages_enabled) {
      upgradeRecommendations.push('AI Pages are available on Pro and above.');
    }
  }

  return {
    plan,
    planSlug,
    planName: plan?.name ?? 'Free',
    billingStatus: status,
    trialEndsAt: subRow?.data?.trial_ends_at ?? null,
    currentPeriodEnd: subRow?.data?.current_period_end ?? null,
    isActive,
    isTrialing,
    adminBypass: adminAllowed,
    entitlements,
    usage: usageStatus,
    blockedReasons,
    upgradeRecommendations,
  };
}

/** Get current plan for org (same as getPlanForOrg; re-exported for API). */
export async function getOrganizationPlan(
  supabase: SupabaseClient,
  organizationId: string
): Promise<PlanRow | null> {
  return getPlanForOrg(supabase, organizationId);
}

/** Get resolved entitlements for org. */
export async function getOrganizationEntitlements(
  supabase: SupabaseClient,
  organizationId: string
): Promise<{ plan: PlanRow | null; entitlements: Entitlements }> {
  return getEntitlements(supabase, organizationId);
}

/** Get usage status for the current billing period. */
export async function getUsageStatus(
  supabase: SupabaseClient,
  organizationId: string,
  adminAllowed: boolean
): Promise<UsageStatus> {
  const access = await getOrganizationSubscriptionAccess(supabase, organizationId, adminAllowed);
  return access.usage;
}

/** Check if org can use a feature (by feature key). */
export async function canUseFeature(
  supabase: SupabaseClient,
  organizationId: string,
  featureKey: SubscriptionFeatureKey,
  adminAllowed: boolean
): Promise<boolean> {
  if (adminAllowed) return true;
  switch (featureKey) {
    case 'automations':
      return canUseAutomation(supabase, organizationId, false);
    case 'webhooks':
      return hasWebhookAccess(supabase, organizationId, false);
    case 'tool_calling':
      return canUseToolCalling(supabase, organizationId, false);
    case 'api_access':
      return hasApiAccess(supabase, organizationId, false);
    case 'widget_branding_removal':
      return canRemoveBranding(supabase, organizationId, false);
    case 'custom_branding':
      return (await getEntitlements(supabase, organizationId)).entitlements.custom_branding;
    case 'team_members':
      return canAddTeamMember(supabase, organizationId, false);
    case 'ai_pages':
      return canCreateAiPage(supabase, organizationId, false);
    case 'agents':
      return canCreateAgent(supabase, organizationId, false);
    case 'knowledge_sources':
      return canAddKnowledgeSource(supabase, organizationId, false);
    case 'messages': {
      const exceeded = await hasExceededMonthlyMessages(supabase, organizationId, false);
      return !exceeded;
    }
    case 'ai_actions': {
      const exceeded = await hasExceededMonthlyAiActions(supabase, organizationId, false);
      return !exceeded;
    }
    case 'document_uploads': {
      const { entitlements } = await getEntitlements(supabase, organizationId);
      const usage = await getCurrentUsage(supabase, organizationId);
      const max = Number(entitlements.max_document_uploads);
      return usage.document_uploads_count < (Number.isFinite(max) ? max : 0);
    }
    default:
      return false;
  }
}

/** Structured error body for plan/usage gating. */
export type PlanLimitErrorBody = {
  error: string;
  code: 'plan_limit' | 'usage_limit';
  feature: string;
  reason: 'upgrade_required' | 'limit_reached';
  current_plan?: string;
  recommended_plan?: string;
  message: string;
};

/** Return 403 JSON response for plan/usage limit. */
export function planLimitResponse(body: PlanLimitErrorBody): NextResponse {
  return NextResponse.json(body, { status: 403 });
}

/** Assert feature access; returns NextResponse on failure, null on success. */
export async function assertFeatureAccess(
  supabase: SupabaseClient,
  organizationId: string,
  featureKey: SubscriptionFeatureKey,
  adminAllowed: boolean,
  options: { message?: string; recommendedPlan?: string } = {}
): Promise<NextResponse | null> {
  const canUse = await canUseFeature(supabase, organizationId, featureKey, adminAllowed);
  if (canUse) return null;
  const plan = await getPlanForOrg(supabase, organizationId);
  const currentSlug = normalizePlanSlug(plan?.slug ?? 'free') ?? 'free';
  const recommendedPlan = options.recommendedPlan ?? getNextPlanSlug(currentSlug);
  return planLimitResponse({
    error: options.message ?? 'This feature is not available on your plan.',
    code: 'plan_limit',
    feature: featureKey,
    reason: 'upgrade_required',
    current_plan: currentSlug,
    recommended_plan: recommendedPlan,
    message: options.message ?? `Upgrade to ${recommendedPlan} to use ${featureKey}.`,
  });
}

/** Assert usage available for messages or ai_actions; returns NextResponse on failure. */
export async function assertUsageAvailable(
  supabase: SupabaseClient,
  organizationId: string,
  metric: 'messages' | 'ai_actions',
  adminAllowed: boolean
): Promise<NextResponse | null> {
  if (adminAllowed) return null;
  const exceeded =
    metric === 'messages'
      ? await hasExceededMonthlyMessages(supabase, organizationId, false)
      : await hasExceededMonthlyAiActions(supabase, organizationId, false);
  if (!exceeded) return null;
  const plan = await getPlanForOrg(supabase, organizationId);
  const currentSlug = normalizePlanSlug(plan?.slug ?? 'free') ?? 'free';
  const feature = metric === 'messages' ? 'messages' : 'ai_actions';
  return planLimitResponse({
    error: metric === 'messages' ? "This month's message limit has been reached." : "This month's AI action limit has been reached.",
    code: 'usage_limit',
    feature,
    reason: 'limit_reached',
    current_plan: currentSlug,
    recommended_plan: getNextPlanSlug(currentSlug),
    message:
      metric === 'messages'
        ? "You've used your message limit for this month. Upgrade or try again next month."
        : "You've used your AI actions for this month. Upgrade to get more.",
  });
}

/** Human-readable upgrade reason for a feature or general. */
export async function getUpgradeReason(
  supabase: SupabaseClient,
  organizationId: string,
  featureKey?: SubscriptionFeatureKey
): Promise<string> {
  const access = await getOrganizationSubscriptionAccess(supabase, organizationId, false);
  if (access.blockedReasons.length > 0 && !featureKey) {
    return access.blockedReasons[0].message;
  }
  if (featureKey && access.upgradeRecommendations.length > 0) {
    const rec = access.upgradeRecommendations.find((r) => r.toLowerCase().includes(featureKey.replace(/_/g, ' ')));
    return rec ?? access.upgradeRecommendations[0] ?? 'Upgrade your plan for more access.';
  }
  return 'Upgrade your plan for more access.';
}
