-- Add max_automations entitlement for plan-based automation limits.
-- Existing plans get default limits; Pro+ already have automations_enabled.

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'max_automations', '0'::jsonb FROM public.plans WHERE slug = 'free'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'max_automations', '2'::jsonb FROM public.plans WHERE slug = 'starter'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'max_automations', '10'::jsonb FROM public.plans WHERE slug = 'pro'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'max_automations', '50'::jsonb FROM public.plans WHERE slug = 'business'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'max_automations', '200'::jsonb FROM public.plans WHERE slug = 'enterprise'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'max_automations', '10'::jsonb FROM public.plans WHERE slug = 'legacy_assistant_pro'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;

COMMENT ON TABLE public.plan_entitlements IS 'Per-plan limits and feature flags (includes max_automations).';
