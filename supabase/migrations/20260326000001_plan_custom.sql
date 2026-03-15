-- Add "Custom" plan with 100 agents (same as Enterprise) for tier naming.
-- Agent limits by tier: free=1, starter=2, pro=5, business=25, enterprise/custom=100.

INSERT INTO public.plans (slug, name, stripe_price_id, sort_order)
SELECT 'custom', 'Custom', NULL, 45
WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE slug = 'custom');

-- Copy enterprise entitlements to custom (max_agents = 100, etc.)
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT (SELECT id FROM public.plans WHERE slug = 'custom'), pe.entitlement_key, pe.value
FROM public.plan_entitlements pe
JOIN public.plans p ON p.id = pe.plan_id
WHERE p.slug = 'enterprise'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
