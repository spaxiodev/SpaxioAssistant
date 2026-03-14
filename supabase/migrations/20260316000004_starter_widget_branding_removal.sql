-- Starter plan: allow widget branding removal
UPDATE public.plan_entitlements
SET value = 'true'::jsonb
WHERE plan_id = (SELECT id FROM public.plans WHERE slug = 'starter')
  AND entitlement_key = 'widget_branding_removal';
