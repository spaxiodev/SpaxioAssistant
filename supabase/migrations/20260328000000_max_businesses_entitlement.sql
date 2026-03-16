-- max_businesses: how many organizations (businesses) a user can own.
-- Free: 1, Starter: 5, Pro: 10, Business: 20, Enterprise: 50.
-- Legacy/custom inherit from pro (10).

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'max_businesses', '1'::jsonb FROM public.plans WHERE slug = 'free'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'max_businesses', '5'::jsonb FROM public.plans WHERE slug = 'starter'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'max_businesses', '10'::jsonb FROM public.plans WHERE slug = 'pro'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'max_businesses', '20'::jsonb FROM public.plans WHERE slug = 'business'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'max_businesses', '50'::jsonb FROM public.plans WHERE slug = 'enterprise'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;

-- legacy_assistant_pro and custom: same as pro (10)
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'max_businesses', '10'::jsonb FROM public.plans WHERE slug IN ('legacy_assistant_pro', 'custom')
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;
