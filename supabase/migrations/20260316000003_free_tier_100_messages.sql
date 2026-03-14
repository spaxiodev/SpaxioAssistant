-- Free tier: 100 messages/month (was 500)
UPDATE public.plan_entitlements
SET value = '100'::jsonb
WHERE plan_id = (SELECT id FROM public.plans WHERE slug = 'free')
  AND entitlement_key = 'monthly_messages';
