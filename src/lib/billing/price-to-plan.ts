/**
 * Resolve Stripe price_id to plan_id for webhook and checkout.
 * Migration: Legacy STRIPE_PRICE_ID maps to plan legacy_assistant_pro.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/** Get plan_id (UUID) for a Stripe price ID. Uses plans.stripe_price_id then env legacy mapping. */
export async function getPlanIdFromStripePriceId(
  supabase: SupabaseClient,
  stripePriceId: string | null
): Promise<string | null> {
  if (!stripePriceId) return null;
  const { data: plan } = await supabase
    .from('plans')
    .select('id')
    .eq('stripe_price_id', stripePriceId)
    .maybeSingle();
  if (plan) return plan.id;
  const legacyPriceId = process.env.STRIPE_PRICE_ID;
  if (legacyPriceId && stripePriceId === legacyPriceId) {
    const { data: legacyPlan } = await supabase
      .from('plans')
      .select('id')
      .eq('slug', 'legacy_assistant_pro')
      .single();
    return legacyPlan?.id ?? null;
  }
  return null;
}

/** Get Stripe price ID for a plan (by slug). Uses plans.stripe_price_id or env fallbacks. */
export async function getStripePriceIdForPlan(
  supabase: SupabaseClient,
  planSlug: string
): Promise<string | null> {
  const { data: plan } = await supabase
    .from('plans')
    .select('stripe_price_id')
    .eq('slug', planSlug)
    .maybeSingle();
  if (plan?.stripe_price_id) return plan.stripe_price_id;
  const envMap: Record<string, string | undefined> = {
    starter: process.env.STRIPE_PRICE_ID_STARTER,
    pro: process.env.STRIPE_PRICE_ID_PRO,
    business: process.env.STRIPE_PRICE_ID_BUSINESS,
    legacy_assistant_pro: process.env.STRIPE_PRICE_ID,
  };
  return envMap[planSlug] ?? null;
}
