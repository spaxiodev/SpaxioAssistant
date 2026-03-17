-- Subscription entitlement and usage enforcement: align plan limits with pricing model,
-- add ai_pages entitlements, optional usage_events for metering, and future-ready structure.

-- 1. Add ai_pages_enabled and max_ai_pages to all plans (insert or update)
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'ai_pages_enabled', 'false'::jsonb FROM public.plans WHERE slug = 'free'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'max_ai_pages', '0'::jsonb FROM public.plans WHERE slug = 'free'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'ai_pages_enabled', 'false'::jsonb FROM public.plans WHERE slug = 'starter'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'max_ai_pages', '0'::jsonb FROM public.plans WHERE slug = 'starter'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'ai_pages_enabled', 'true'::jsonb FROM public.plans WHERE slug = 'pro'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'max_ai_pages', '1'::jsonb FROM public.plans WHERE slug = 'pro'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'ai_pages_enabled', 'true'::jsonb FROM public.plans WHERE slug = 'business'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'max_ai_pages', '10'::jsonb FROM public.plans WHERE slug = 'business'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'ai_pages_enabled', 'true'::jsonb FROM public.plans WHERE slug = 'enterprise'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'max_ai_pages', '100'::jsonb FROM public.plans WHERE slug = 'enterprise'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'ai_pages_enabled', 'true'::jsonb FROM public.plans WHERE slug = 'legacy_assistant_pro'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'max_ai_pages', '1'::jsonb FROM public.plans WHERE slug = 'legacy_assistant_pro'
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET value = EXCLUDED.value;

-- 2. Align FREE/STARTER/PRO/BUSINESS limits with pricing model (target values)
-- FREE: monthly_ai_actions 25, max_team_members 1
UPDATE public.plan_entitlements SET value = '25'::jsonb
WHERE plan_id = (SELECT id FROM public.plans WHERE slug = 'free') AND entitlement_key = 'monthly_ai_actions';
UPDATE public.plan_entitlements SET value = '1'::jsonb
WHERE plan_id = (SELECT id FROM public.plans WHERE slug = 'free') AND entitlement_key = 'max_team_members';

-- STARTER: max_team_members 2, max_knowledge_sources 3
UPDATE public.plan_entitlements SET value = '2'::jsonb
WHERE plan_id = (SELECT id FROM public.plans WHERE slug = 'starter') AND entitlement_key = 'max_team_members';
UPDATE public.plan_entitlements SET value = '3'::jsonb
WHERE plan_id = (SELECT id FROM public.plans WHERE slug = 'starter') AND entitlement_key = 'max_knowledge_sources';

-- PRO: max_team_members 5, max_knowledge_sources 10
UPDATE public.plan_entitlements SET value = '5'::jsonb
WHERE plan_id = (SELECT id FROM public.plans WHERE slug = 'pro') AND entitlement_key = 'max_team_members';
UPDATE public.plan_entitlements SET value = '10'::jsonb
WHERE plan_id = (SELECT id FROM public.plans WHERE slug = 'pro') AND entitlement_key = 'max_knowledge_sources';

-- BUSINESS: max_team_members 25
UPDATE public.plan_entitlements SET value = '25'::jsonb
WHERE plan_id = (SELECT id FROM public.plans WHERE slug = 'business') AND entitlement_key = 'max_team_members';

-- 3. usage_events: optional event log for metering (idempotency, source metadata)
CREATE TABLE IF NOT EXISTS public.usage_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  amount INT NOT NULL DEFAULT 1,
  source TEXT,
  source_id UUID,
  metadata JSONB DEFAULT '{}',
  usage_period_start DATE NOT NULL,
  usage_period_end DATE NOT NULL,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_events_org_period ON public.usage_events(organization_id, usage_period_start);
CREATE INDEX IF NOT EXISTS idx_usage_events_idempotency ON public.usage_events(organization_id, metric, idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages usage_events" ON public.usage_events FOR ALL USING (true);

COMMENT ON TABLE public.usage_events IS 'Optional usage event log for metering; org_usage remains source of truth for enforcement.';
