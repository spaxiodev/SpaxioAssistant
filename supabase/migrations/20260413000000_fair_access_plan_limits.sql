-- Fair Access Plan Limits
-- Normalizes plan entitlements to the production-ready values described in the Fair Access model.
-- Adds max_widgets entitlement. Updates Free/Starter/Pro/Business/Enterprise limits.
-- Fully additive — uses upsert (ON CONFLICT DO UPDATE) so existing subscribers are unaffected.

-- ─── Add max_widgets entitlement key to all plans ────────────────────────────
-- Free: 1 widget, Starter: 2, Pro: 3, Business: 10, Enterprise: 50, Legacy: 3

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'max_widgets', '1'::jsonb FROM public.plans WHERE slug = 'free'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'max_widgets', '2'::jsonb FROM public.plans WHERE slug = 'starter'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'max_widgets', '3'::jsonb FROM public.plans WHERE slug = 'pro'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'max_widgets', '10'::jsonb FROM public.plans WHERE slug = 'business'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'max_widgets', '50'::jsonb FROM public.plans WHERE slug = 'enterprise'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'max_widgets', '3'::jsonb FROM public.plans WHERE slug = 'legacy_assistant_pro'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;

-- ─── FREE ─────────────────────────────────────────────────────────────────────
-- 200 AI replies/mo, 1 agent, 1 widget, 1 team member, 1 knowledge source
-- No automations, no tools, no voice, branding required

UPDATE public.plan_entitlements
SET value = '200'::jsonb
WHERE plan_id = (SELECT id FROM public.plans WHERE slug = 'free')
  AND entitlement_key = 'monthly_messages';

UPDATE public.plan_entitlements
SET value = '0'::jsonb
WHERE plan_id = (SELECT id FROM public.plans WHERE slug = 'free')
  AND entitlement_key = 'monthly_ai_actions';

UPDATE public.plan_entitlements
SET value = '1'::jsonb
WHERE plan_id = (SELECT id FROM public.plans WHERE slug = 'free')
  AND entitlement_key = 'max_team_members';

-- max_automations already exists from 20260318000002, set to 0 for free
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'max_automations', '0'::jsonb FROM public.plans WHERE slug = 'free'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;

-- followup limit for free: 0
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'monthly_followup_email_limit', '0'::jsonb FROM public.plans WHERE slug = 'free'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;

-- ─── STARTER ─────────────────────────────────────────────────────────────────
-- 1500 AI replies/mo, 100 AI actions, 2 agents, 2 widgets, 1 team member, 5 knowledge sources
-- Branding removal, follow-up drafts, AI lead scoring, AI suggestions

UPDATE public.plan_entitlements
SET value = '1500'::jsonb
WHERE plan_id = (SELECT id FROM public.plans WHERE slug = 'starter')
  AND entitlement_key = 'monthly_messages';

UPDATE public.plan_entitlements
SET value = '100'::jsonb
WHERE plan_id = (SELECT id FROM public.plans WHERE slug = 'starter')
  AND entitlement_key = 'monthly_ai_actions';

UPDATE public.plan_entitlements
SET value = '5'::jsonb
WHERE plan_id = (SELECT id FROM public.plans WHERE slug = 'starter')
  AND entitlement_key = 'max_knowledge_sources';

UPDATE public.plan_entitlements
SET value = '1'::jsonb
WHERE plan_id = (SELECT id FROM public.plans WHERE slug = 'starter')
  AND entitlement_key = 'max_team_members';

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'max_automations', '5'::jsonb FROM public.plans WHERE slug = 'starter'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'monthly_followup_email_limit', '50'::jsonb FROM public.plans WHERE slug = 'starter'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;

-- ─── PRO ─────────────────────────────────────────────────────────────────────
-- 7500 AI replies/mo, 500 AI actions, 5 agents, 3 widgets, 5 team members, 15 knowledge sources
-- Automations, tools, voice, advanced analytics, advanced branding, webhooks

UPDATE public.plan_entitlements
SET value = '7500'::jsonb
WHERE plan_id = (SELECT id FROM public.plans WHERE slug = 'pro')
  AND entitlement_key = 'monthly_messages';

UPDATE public.plan_entitlements
SET value = '500'::jsonb
WHERE plan_id = (SELECT id FROM public.plans WHERE slug = 'pro')
  AND entitlement_key = 'monthly_ai_actions';

UPDATE public.plan_entitlements
SET value = '5'::jsonb
WHERE plan_id = (SELECT id FROM public.plans WHERE slug = 'pro')
  AND entitlement_key = 'max_team_members';

UPDATE public.plan_entitlements
SET value = '15'::jsonb
WHERE plan_id = (SELECT id FROM public.plans WHERE slug = 'pro')
  AND entitlement_key = 'max_knowledge_sources';

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'max_automations', '20'::jsonb FROM public.plans WHERE slug = 'pro'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'monthly_followup_email_limit', '500'::jsonb FROM public.plans WHERE slug = 'pro'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;

-- ─── BUSINESS ────────────────────────────────────────────────────────────────
-- 25000 AI replies/mo, 2000 AI actions, 10 agents, 10 widgets, 10 team members, 50 knowledge sources
-- White label, API access, advanced permissions, full webhooks, advanced analytics

UPDATE public.plan_entitlements
SET value = '25000'::jsonb
WHERE plan_id = (SELECT id FROM public.plans WHERE slug = 'business')
  AND entitlement_key = 'monthly_messages';

UPDATE public.plan_entitlements
SET value = '2000'::jsonb
WHERE plan_id = (SELECT id FROM public.plans WHERE slug = 'business')
  AND entitlement_key = 'monthly_ai_actions';

UPDATE public.plan_entitlements
SET value = '10'::jsonb
WHERE plan_id = (SELECT id FROM public.plans WHERE slug = 'business')
  AND entitlement_key = 'max_agents';

UPDATE public.plan_entitlements
SET value = '10'::jsonb
WHERE plan_id = (SELECT id FROM public.plans WHERE slug = 'business')
  AND entitlement_key = 'max_team_members';

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'max_automations', '100'::jsonb FROM public.plans WHERE slug = 'business'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'monthly_followup_email_limit', '2000'::jsonb FROM public.plans WHERE slug = 'business'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;

-- ─── ENTERPRISE ───────────────────────────────────────────────────────────────
-- 500000 AI replies/mo, 100000 AI actions, 100 agents, 50 widgets, 50 team members, 200 knowledge sources

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'max_automations', '1000'::jsonb FROM public.plans WHERE slug = 'enterprise'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'monthly_followup_email_limit', '100000'::jsonb FROM public.plans WHERE slug = 'enterprise'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;

-- ─── LEGACY ASSISTANT PRO (maps to pro tier) ─────────────────────────────────
-- Keep compatible with existing subscribers (same as pro)

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'max_automations', '20'::jsonb FROM public.plans WHERE slug = 'legacy_assistant_pro'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'monthly_followup_email_limit', '500'::jsonb FROM public.plans WHERE slug = 'legacy_assistant_pro'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;

-- ─── Comments ─────────────────────────────────────────────────────────────────
COMMENT ON COLUMN public.plan_entitlements.entitlement_key IS 
  'Known keys: max_agents, max_automations, max_widgets, max_team_members, max_knowledge_sources, '
  'max_document_uploads, max_ai_pages, monthly_messages, monthly_ai_actions, monthly_voice_minutes, '
  'monthly_followup_email_limit, widget_branding_removal, custom_branding, advanced_branding_enabled, '
  'automations_enabled, tool_calling_enabled, webhook_access, api_access, white_label, voice_enabled, '
  'ai_actions_enabled, inbox_enabled, bookings_enabled, ai_pages_enabled, followup_emails_enabled, '
  'ai_followup_enabled, followup_drafts_enabled, ai_lead_scoring_enabled, analytics_advanced_enabled, '
  'ai_suggestions_enabled, conversation_learning_enabled, analytics_level, priority_support';
