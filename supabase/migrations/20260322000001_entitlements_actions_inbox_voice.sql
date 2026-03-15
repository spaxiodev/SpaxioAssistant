-- New plan entitlements for AI Actions, Inbox, Bookings, Voice
-- Adds rows to plan_entitlements for existing plans (free, starter, pro, business, enterprise, legacy_assistant_pro).

-- Entitlement keys to add (value type in comment):
-- inbox_enabled (boolean)
-- human_seats (number) – for inbox human takeover
-- ai_actions_enabled (boolean)
-- bookings_enabled (boolean)
-- voice_enabled (boolean)
-- monthly_voice_minutes (number)
-- advanced_escalation (boolean)
-- ai_draft_replies (boolean)
-- phone_integration (boolean)
-- max_active_voice_agents (number)

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'inbox_enabled', 'false'::jsonb FROM public.plans WHERE slug = 'free'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'human_seats', '0'::jsonb FROM public.plans WHERE slug = 'free'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'ai_actions_enabled', 'false'::jsonb FROM public.plans WHERE slug = 'free'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'bookings_enabled', 'false'::jsonb FROM public.plans WHERE slug = 'free'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'voice_enabled', 'false'::jsonb FROM public.plans WHERE slug = 'free'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'monthly_voice_minutes', '0'::jsonb FROM public.plans WHERE slug = 'free'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'advanced_escalation', 'false'::jsonb FROM public.plans WHERE slug = 'free'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'ai_draft_replies', 'false'::jsonb FROM public.plans WHERE slug = 'free'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'phone_integration', 'false'::jsonb FROM public.plans WHERE slug = 'free'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'max_active_voice_agents', '0'::jsonb FROM public.plans WHERE slug = 'free'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;

-- Starter
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'inbox_enabled', 'true'::jsonb FROM public.plans WHERE slug = 'starter'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'human_seats', '1'::jsonb FROM public.plans WHERE slug = 'starter'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'ai_actions_enabled', 'true'::jsonb FROM public.plans WHERE slug = 'starter'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'bookings_enabled', 'true'::jsonb FROM public.plans WHERE slug = 'starter'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'voice_enabled', 'false'::jsonb FROM public.plans WHERE slug = 'starter'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'monthly_voice_minutes', '0'::jsonb FROM public.plans WHERE slug = 'starter'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'advanced_escalation', 'false'::jsonb FROM public.plans WHERE slug = 'starter'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'ai_draft_replies', 'true'::jsonb FROM public.plans WHERE slug = 'starter'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'phone_integration', 'false'::jsonb FROM public.plans WHERE slug = 'starter'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'max_active_voice_agents', '0'::jsonb FROM public.plans WHERE slug = 'starter'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;

-- Pro
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'inbox_enabled', 'true'::jsonb FROM public.plans WHERE slug = 'pro'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'human_seats', '5'::jsonb FROM public.plans WHERE slug = 'pro'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'ai_actions_enabled', 'true'::jsonb FROM public.plans WHERE slug = 'pro'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'bookings_enabled', 'true'::jsonb FROM public.plans WHERE slug = 'pro'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'voice_enabled', 'true'::jsonb FROM public.plans WHERE slug = 'pro'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'monthly_voice_minutes', '120'::jsonb FROM public.plans WHERE slug = 'pro'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'advanced_escalation', 'true'::jsonb FROM public.plans WHERE slug = 'pro'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'ai_draft_replies', 'true'::jsonb FROM public.plans WHERE slug = 'pro'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'phone_integration', 'false'::jsonb FROM public.plans WHERE slug = 'pro'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'max_active_voice_agents', '2'::jsonb FROM public.plans WHERE slug = 'pro'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;

-- Business
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'inbox_enabled', 'true'::jsonb FROM public.plans WHERE slug = 'business'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'human_seats', '15'::jsonb FROM public.plans WHERE slug = 'business'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'ai_actions_enabled', 'true'::jsonb FROM public.plans WHERE slug = 'business'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'bookings_enabled', 'true'::jsonb FROM public.plans WHERE slug = 'business'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'voice_enabled', 'true'::jsonb FROM public.plans WHERE slug = 'business'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'monthly_voice_minutes', '500'::jsonb FROM public.plans WHERE slug = 'business'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'advanced_escalation', 'true'::jsonb FROM public.plans WHERE slug = 'business'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'ai_draft_replies', 'true'::jsonb FROM public.plans WHERE slug = 'business'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'phone_integration', 'true'::jsonb FROM public.plans WHERE slug = 'business'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'max_active_voice_agents', '5'::jsonb FROM public.plans WHERE slug = 'business'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;

-- Enterprise
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'inbox_enabled', 'true'::jsonb FROM public.plans WHERE slug = 'enterprise'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'human_seats', '50'::jsonb FROM public.plans WHERE slug = 'enterprise'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'ai_actions_enabled', 'true'::jsonb FROM public.plans WHERE slug = 'enterprise'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'bookings_enabled', 'true'::jsonb FROM public.plans WHERE slug = 'enterprise'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'voice_enabled', 'true'::jsonb FROM public.plans WHERE slug = 'enterprise'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'monthly_voice_minutes', '2000'::jsonb FROM public.plans WHERE slug = 'enterprise'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'advanced_escalation', 'true'::jsonb FROM public.plans WHERE slug = 'enterprise'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'ai_draft_replies', 'true'::jsonb FROM public.plans WHERE slug = 'enterprise'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'phone_integration', 'true'::jsonb FROM public.plans WHERE slug = 'enterprise'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'max_active_voice_agents', '25'::jsonb FROM public.plans WHERE slug = 'enterprise'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;

-- Legacy Assistant Pro (same as Pro)
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT (SELECT id FROM public.plans WHERE slug = 'legacy_assistant_pro'), pe.entitlement_key, pe.value
FROM public.plan_entitlements pe
JOIN public.plans p ON p.id = pe.plan_id
WHERE p.slug = 'pro'
AND pe.entitlement_key IN (
  'inbox_enabled', 'human_seats', 'ai_actions_enabled', 'bookings_enabled', 'voice_enabled',
  'monthly_voice_minutes', 'advanced_escalation', 'ai_draft_replies', 'phone_integration', 'max_active_voice_agents'
)
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
