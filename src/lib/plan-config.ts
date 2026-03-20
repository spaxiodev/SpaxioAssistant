/**
 * Central plan/permissions config for subscription-based feature access.
 * Single source of truth for plan order and which plan unlocks which feature.
 * Use hasFeatureAccess(planSlug, featureKey) and getUpgradePlanForFeature(featureKey) everywhere.
 */

export const PLAN_SLUGS = [
  'free',
  'starter',
  'pro',
  'business',
  'enterprise',
] as const;

export type PlanSlug = (typeof PLAN_SLUGS)[number];

/** Plan display names (can be overridden by DB plans.name). */
export const PLAN_DISPLAY_NAMES: Record<PlanSlug, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro / Growth',
  business: 'Business',
  enterprise: 'Enterprise',
};

/** Legacy/custom slugs that map to a tier for comparison. legacy_assistant_pro = same as pro. */
const PLAN_TIER_ORDER: Record<string, number> = {
  free: 0,
  starter: 10,
  pro: 20,
  legacy_assistant_pro: 20,
  business: 30,
  enterprise: 40,
  custom: 45,
};

/** Normalize plan slug for comparison (legacy_assistant_pro → pro). */
export function normalizePlanSlug(slug: string | null | undefined): PlanSlug | null {
  if (!slug || typeof slug !== 'string') return null;
  const s = slug.toLowerCase().trim();
  if (PLAN_SLUGS.includes(s as PlanSlug)) return s as PlanSlug;
  if (s === 'legacy_assistant_pro' || s === 'custom') return 'pro';
  return null;
}

/** Numeric tier for comparison (higher = more access). */
export function getPlanTier(slug: string | null | undefined): number {
  const normalized = normalizePlanSlug(slug);
  if (normalized) return PLAN_TIER_ORDER[normalized] ?? 0;
  const raw = slug ? PLAN_TIER_ORDER[slug] : undefined;
  return typeof raw === 'number' ? raw : 0;
}

/** True if planA has at least the same tier as planB. */
export function planTierAtLeast(planSlug: string | null | undefined, requiredSlug: PlanSlug): boolean {
  return getPlanTier(planSlug) >= getPlanTier(requiredSlug);
}

// -----------------------------------------------------------------------------
// Feature keys and minimum plan required
// -----------------------------------------------------------------------------

export const FEATURE_KEYS = [
  'automations',
  'webhooks',
  'tool_calling',
  'api_access',
  'remove_branding',
  'ai_actions',
  'inbox',
  'bookings',
  'voice',
  'integrations',
  'team_members',
  'ai_pages',
  'followup_emails',
  'ai_followup',
  'followup_drafts',
  // Intelligence & advanced features
  'ai_lead_scoring',
  'analytics_advanced',
  'ai_suggestions',
  'advanced_branding',
  'conversation_learning',
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

/** Minimum plan slug required for each feature. */
export const FEATURE_MIN_PLAN: Record<FeatureKey, PlanSlug> = {
  automations: 'pro',
  webhooks: 'pro',
  tool_calling: 'pro',
  api_access: 'business',
  remove_branding: 'starter',
  ai_actions: 'starter',
  inbox: 'starter',
  bookings: 'starter',
  voice: 'pro',
  integrations: 'pro',
  team_members: 'starter',
  ai_pages: 'pro',
  followup_emails: 'starter',
  ai_followup: 'pro',
  followup_drafts: 'starter',
  // Intelligence & advanced features
  ai_lead_scoring: 'starter',
  analytics_advanced: 'pro',
  ai_suggestions: 'starter',
  advanced_branding: 'pro',
  conversation_learning: 'pro',
};

/** Whether the given plan has access to the feature. */
export function hasFeatureAccess(
  userPlanSlug: string | null | undefined,
  featureKey: FeatureKey
): boolean {
  const required = FEATURE_MIN_PLAN[featureKey];
  return planTierAtLeast(userPlanSlug, required);
}

/** Recommended plan to upgrade to for this feature. */
export function getUpgradePlanForFeature(featureKey: FeatureKey): PlanSlug {
  return FEATURE_MIN_PLAN[featureKey];
}

/** Next plan tier for limit upgrades (e.g. more agents). */
export function getNextPlanSlug(currentSlug: string | null | undefined): PlanSlug {
  const t = getPlanTier(currentSlug);
  if (t < 10) return 'starter';
  if (t < 20) return 'pro';
  if (t < 30) return 'business';
  return 'enterprise';
}

/** Human-readable feature label for upgrade prompts. */
export const FEATURE_LABELS: Record<FeatureKey, string> = {
  automations: 'Automations & workflows',
  webhooks: 'Webhooks',
  tool_calling: 'Tool calling',
  api_access: 'API access',
  remove_branding: 'Remove widget branding',
  ai_actions: 'AI Actions',
  inbox: 'Inbox',
  bookings: 'Bookings',
  voice: 'Voice agents',
  integrations: 'Integrations',
  team_members: 'Team members',
  ai_pages: 'AI Pages',
  followup_emails: 'Follow-up emails',
  ai_followup: 'AI follow-up generation',
  followup_drafts: 'Follow-up draft approvals',
  // Intelligence & advanced features
  ai_lead_scoring: 'AI lead scoring & qualification',
  analytics_advanced: 'Advanced analytics',
  ai_suggestions: 'AI setup suggestions',
  advanced_branding: 'Advanced widget branding',
  conversation_learning: 'Conversation learning & insights',
};

// -----------------------------------------------------------------------------
// Upgrade URL
// -----------------------------------------------------------------------------

export type UpgradeUrlParams = {
  from?: string;
  current?: string;
  recommended?: string;
};

/** Build /pricing URL with optional query params for analytics and pre-select. */
export function buildUpgradeUrl(params: UpgradeUrlParams = {}): string {
  const search = new URLSearchParams();
  if (params.from) search.set('from', params.from);
  if (params.current) search.set('current', params.current);
  if (params.recommended) search.set('recommended', params.recommended);
  const qs = search.toString();
  return qs ? `/pricing?${qs}` : '/pricing';
}
