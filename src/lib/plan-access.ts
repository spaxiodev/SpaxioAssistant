/**
 * Server-side plan + feature access for layout and page gating.
 * Uses entitlements (DB) + plan-config (feature → plan mapping).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getPlanForOrg } from '@/lib/entitlements';
import {
  type FeatureKey,
  type PlanSlug,
  FEATURE_KEYS,
  hasFeatureAccess,
  PLAN_DISPLAY_NAMES,
  normalizePlanSlug,
} from '@/lib/plan-config';

export type PlanAccess = {
  planSlug: PlanSlug | null;
  planName: string;
  featureAccess: Record<FeatureKey, boolean>;
  adminAllowed: boolean;
};

/** Load current plan and compute feature access for the org. Admin bypass applied. */
export async function getPlanAccess(
  supabase: SupabaseClient,
  organizationId: string,
  adminAllowed: boolean
): Promise<PlanAccess> {
  const plan = await getPlanForOrg(supabase, organizationId);
  const slug = plan?.slug ?? 'free';
  const normalized = normalizePlanSlug(slug) ?? 'free';
  const planName = plan?.name ?? PLAN_DISPLAY_NAMES[normalized] ?? slug;

  const featureAccess = {} as Record<FeatureKey, boolean>;
  const effectiveSlug = adminAllowed ? 'enterprise' : slug;
  for (const key of FEATURE_KEYS) {
    featureAccess[key] = adminAllowed || hasFeatureAccess(effectiveSlug, key);
  }

  return {
    planSlug: normalized,
    planName,
    featureAccess,
    adminAllowed,
  };
}
