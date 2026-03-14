-- Multi-tier billing: plans, plan_entitlements, subscription.plan_id, usage tracking.
-- Additive only; preserves existing subscriptions and RLS.

-- Plans (reference data; stripe_price_id per plan for mapping)
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  stripe_price_id TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_plans_slug ON public.plans(slug);
CREATE INDEX idx_plans_stripe_price ON public.plans(stripe_price_id) WHERE stripe_price_id IS NOT NULL;

-- Plan entitlements: key-value per plan (limits and feature flags)
CREATE TABLE public.plan_entitlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  entitlement_key TEXT NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_id, entitlement_key)
);

CREATE INDEX idx_plan_entitlements_plan ON public.plan_entitlements(plan_id);

-- Link subscriptions to plan (nullable for backward compat; NULL = Free)
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL;

CREATE INDEX idx_subscriptions_plan ON public.subscriptions(plan_id) WHERE plan_id IS NOT NULL;

-- Usage per org per billing period (for enforcement)
CREATE TABLE public.org_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  message_count INT NOT NULL DEFAULT 0,
  ai_action_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, period_start)
);

CREATE INDEX idx_org_usage_org_period ON public.org_usage(organization_id, period_start);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_usage ENABLE ROW LEVEL SECURITY;

-- Plans and entitlements: read-only for org members (for display)
CREATE POLICY "Anyone can read plans" ON public.plans FOR SELECT USING (true);
CREATE POLICY "Anyone can read plan_entitlements" ON public.plan_entitlements FOR SELECT USING (true);

-- Org usage: org members can read their org's usage
CREATE POLICY "Org members can view org_usage" ON public.org_usage
  FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
-- Inserts/updates only via service role (API)

CREATE TRIGGER plans_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER org_usage_updated_at BEFORE UPDATE ON public.org_usage
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.plans IS 'Billing plans (Free, Starter, Pro, Business, Enterprise, legacy)';
COMMENT ON TABLE public.plan_entitlements IS 'Per-plan limits and feature flags';
COMMENT ON TABLE public.org_usage IS 'Usage counts per org per billing period for enforcement';

-- Seed plans (stripe_price_id filled later via env or Stripe product setup)
INSERT INTO public.plans (slug, name, stripe_price_id, sort_order) VALUES
  ('free', 'Free', NULL, 0),
  ('starter', 'Starter', NULL, 10),
  ('pro', 'Pro / Growth', NULL, 20),
  ('business', 'Business', NULL, 30),
  ('enterprise', 'Enterprise', NULL, 40),
  ('legacy_assistant_pro', 'Legacy Assistant Pro', NULL, 5);

-- Entitlement helper: value can be number (limit), boolean (feature flag), or string (e.g. analytics_level)
-- Free
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, k, v::jsonb FROM public.plans CROSS JOIN LATERAL (VALUES
  ('max_agents', '1'),
  ('monthly_messages', '100'),
  ('monthly_ai_actions', '100'),
  ('max_knowledge_sources', '1'),
  ('max_document_uploads', '0'),
  ('max_team_members', '0'),
  ('widget_branding_removal', 'false'),
  ('custom_branding', 'false'),
  ('automations_enabled', 'false'),
  ('tool_calling_enabled', 'false'),
  ('webhook_access', 'false'),
  ('api_access', 'false'),
  ('analytics_level', '"basic"'),
  ('priority_support', 'false'),
  ('white_label', 'false'),
  ('integrations_enabled', 'false')
) AS t(k, v) WHERE slug = 'free';

-- Starter ($29)
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, k, v::jsonb FROM public.plans CROSS JOIN LATERAL (VALUES
  ('max_agents', '2'),
  ('monthly_messages', '2000'),
  ('monthly_ai_actions', '500'),
  ('max_knowledge_sources', '3'),
  ('max_document_uploads', '10'),
  ('max_team_members', '0'),
  ('widget_branding_removal', 'true'),
  ('custom_branding', 'false'),
  ('automations_enabled', 'false'),
  ('tool_calling_enabled', 'false'),
  ('webhook_access', 'false'),
  ('api_access', 'false'),
  ('analytics_level', '"basic"'),
  ('priority_support', 'false'),
  ('white_label', 'false'),
  ('integrations_enabled', 'false')
) AS t(k, v) WHERE slug = 'starter';

-- Pro / Growth ($79)
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, k, v::jsonb FROM public.plans CROSS JOIN LATERAL (VALUES
  ('max_agents', '5'),
  ('monthly_messages', '10000'),
  ('monthly_ai_actions', '3000'),
  ('max_knowledge_sources', '15'),
  ('max_document_uploads', '50'),
  ('max_team_members', '3'),
  ('widget_branding_removal', 'true'),
  ('custom_branding', 'true'),
  ('automations_enabled', 'true'),
  ('tool_calling_enabled', 'true'),
  ('webhook_access', 'true'),
  ('api_access', 'false'),
  ('analytics_level', '"advanced"'),
  ('priority_support', 'true'),
  ('white_label', 'false'),
  ('integrations_enabled', 'true')
) AS t(k, v) WHERE slug = 'pro';

-- Business ($199)
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, k, v::jsonb FROM public.plans CROSS JOIN LATERAL (VALUES
  ('max_agents', '25'),
  ('monthly_messages', '50000'),
  ('monthly_ai_actions', '15000'),
  ('max_knowledge_sources', '50'),
  ('max_document_uploads', '200'),
  ('max_team_members', '10'),
  ('widget_branding_removal', 'true'),
  ('custom_branding', 'true'),
  ('automations_enabled', 'true'),
  ('tool_calling_enabled', 'true'),
  ('webhook_access', 'true'),
  ('api_access', 'true'),
  ('analytics_level', '"advanced"'),
  ('priority_support', 'true'),
  ('white_label', 'true'),
  ('integrations_enabled', 'true')
) AS t(k, v) WHERE slug = 'business';

-- Enterprise (custom limits; use high defaults)
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, k, v::jsonb FROM public.plans CROSS JOIN LATERAL (VALUES
  ('max_agents', '100'),
  ('monthly_messages', '500000'),
  ('monthly_ai_actions', '100000'),
  ('max_knowledge_sources', '200'),
  ('max_document_uploads', '1000'),
  ('max_team_members', '50'),
  ('widget_branding_removal', 'true'),
  ('custom_branding', 'true'),
  ('automations_enabled', 'true'),
  ('tool_calling_enabled', 'true'),
  ('webhook_access', 'true'),
  ('api_access', 'true'),
  ('analytics_level', '"advanced"'),
  ('priority_support', 'true'),
  ('white_label', 'true'),
  ('integrations_enabled', 'true')
) AS t(k, v) WHERE slug = 'enterprise';

-- Legacy Assistant Pro: same entitlements as Pro (no one loses features)
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT (SELECT id FROM public.plans WHERE slug = 'legacy_assistant_pro'), pe.entitlement_key, pe.value
FROM public.plan_entitlements pe
JOIN public.plans p ON p.id = pe.plan_id WHERE p.slug = 'pro';
