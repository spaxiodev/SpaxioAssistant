-- Backfill subscription.plan_id for existing rows (migration-safe).
-- Existing Assistant Pro (active/trialing with Stripe subscription) -> legacy_assistant_pro.
-- Everyone else (no subscription, canceled, expired trial) -> free.

UPDATE public.subscriptions
SET plan_id = (SELECT id FROM public.plans WHERE slug = 'legacy_assistant_pro' LIMIT 1)
WHERE stripe_subscription_id IS NOT NULL
  AND status IN ('active', 'trialing')
  AND plan_id IS NULL;

UPDATE public.subscriptions
SET plan_id = (SELECT id FROM public.plans WHERE slug = 'free' LIMIT 1)
WHERE plan_id IS NULL;
