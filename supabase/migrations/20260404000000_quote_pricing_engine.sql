-- Quote Pricing Engine: configurable pricing profiles, services, variables, rules, estimation runs.
-- Org-scoped, RLS-safe. Backwards compatible.

-- 1. Pricing profiles (per org: industry template or custom)
CREATE TABLE public.quote_pricing_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  industry_type TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  pricing_mode TEXT NOT NULL DEFAULT 'exact_estimate' CHECK (pricing_mode IN (
    'exact_estimate', 'estimate_range', 'quote_draft_only', 'manual_review_required_above_threshold', 'always_require_review'
  )),
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quote_pricing_profiles_org ON public.quote_pricing_profiles(organization_id);
CREATE UNIQUE INDEX idx_quote_pricing_profiles_org_default ON public.quote_pricing_profiles(organization_id) WHERE is_default = true;

ALTER TABLE public.quote_pricing_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view quote_pricing_profiles" ON public.quote_pricing_profiles
  FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage quote_pricing_profiles" ON public.quote_pricing_profiles
  FOR ALL USING (organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid())));

CREATE TRIGGER quote_pricing_profiles_updated_at BEFORE UPDATE ON public.quote_pricing_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Services (per profile or org)
CREATE TABLE public.quote_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pricing_profile_id UUID NOT NULL REFERENCES public.quote_pricing_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  base_price NUMERIC,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pricing_profile_id, slug)
);

CREATE INDEX idx_quote_services_org ON public.quote_services(organization_id);
CREATE INDEX idx_quote_services_profile ON public.quote_services(pricing_profile_id);

ALTER TABLE public.quote_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view quote_services" ON public.quote_services
  FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage quote_services" ON public.quote_services
  FOR ALL USING (organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid())));

CREATE TRIGGER quote_services_updated_at BEFORE UPDATE ON public.quote_services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Pricing variables (inputs for rules)
CREATE TABLE public.quote_pricing_variables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pricing_profile_id UUID NOT NULL REFERENCES public.quote_pricing_profiles(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.quote_services(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  variable_type TEXT NOT NULL DEFAULT 'number' CHECK (variable_type IN (
    'number', 'boolean', 'select', 'multi_select', 'text', 'area', 'quantity', 'currency', 'range'
  )),
  unit_label TEXT,
  required BOOLEAN NOT NULL DEFAULT false,
  default_value TEXT,
  options JSONB,
  help_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quote_pricing_variables_org ON public.quote_pricing_variables(organization_id);
CREATE INDEX idx_quote_pricing_variables_profile ON public.quote_pricing_variables(pricing_profile_id);
CREATE INDEX idx_quote_pricing_variables_service ON public.quote_pricing_variables(service_id) WHERE service_id IS NOT NULL;

ALTER TABLE public.quote_pricing_variables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view quote_pricing_variables" ON public.quote_pricing_variables
  FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage quote_pricing_variables" ON public.quote_pricing_variables
  FOR ALL USING (organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid())));

CREATE TRIGGER quote_pricing_variables_updated_at BEFORE UPDATE ON public.quote_pricing_variables
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Pricing rules (applied in sort_order)
CREATE TABLE public.quote_pricing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pricing_profile_id UUID NOT NULL REFERENCES public.quote_pricing_profiles(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.quote_services(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN (
    'fixed_price', 'per_unit', 'tiered', 'addon', 'multiplier', 'minimum_charge', 'range_adjustment', 'formula'
  )),
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quote_pricing_rules_org ON public.quote_pricing_rules(organization_id);
CREATE INDEX idx_quote_pricing_rules_profile ON public.quote_pricing_rules(pricing_profile_id);
CREATE INDEX idx_quote_pricing_rules_service ON public.quote_pricing_rules(service_id) WHERE service_id IS NOT NULL;

ALTER TABLE public.quote_pricing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view quote_pricing_rules" ON public.quote_pricing_rules
  FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage quote_pricing_rules" ON public.quote_pricing_rules
  FOR ALL USING (organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid())));

CREATE TRIGGER quote_pricing_rules_updated_at BEFORE UPDATE ON public.quote_pricing_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Estimation runs (audit + link to quote_request / conversation)
CREATE TABLE public.quote_estimation_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pricing_profile_id UUID REFERENCES public.quote_pricing_profiles(id) ON DELETE SET NULL,
  ai_page_id UUID REFERENCES public.ai_pages(id) ON DELETE SET NULL,
  quote_request_id UUID REFERENCES public.quote_requests(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.quote_services(id) ON DELETE SET NULL,
  extracted_inputs JSONB DEFAULT '{}',
  applied_rules JSONB DEFAULT '[]',
  estimate_subtotal NUMERIC,
  estimate_total NUMERIC,
  estimate_low NUMERIC,
  estimate_high NUMERIC,
  confidence NUMERIC CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  assumptions JSONB DEFAULT '[]',
  output_mode TEXT,
  human_review_recommended BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quote_estimation_runs_org ON public.quote_estimation_runs(organization_id);
CREATE INDEX idx_quote_estimation_runs_quote_request ON public.quote_estimation_runs(quote_request_id) WHERE quote_request_id IS NOT NULL;
CREATE INDEX idx_quote_estimation_runs_conversation ON public.quote_estimation_runs(conversation_id) WHERE conversation_id IS NOT NULL;

ALTER TABLE public.quote_estimation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view quote_estimation_runs" ON public.quote_estimation_runs
  FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage quote_estimation_runs" ON public.quote_estimation_runs
  FOR ALL USING (organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid())));
CREATE POLICY "Service can insert quote_estimation_runs" ON public.quote_estimation_runs FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can update quote_estimation_runs" ON public.quote_estimation_runs FOR UPDATE USING (true);

-- 6. Link quote_requests to estimation run and store estimate totals for display
ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS estimation_run_id UUID REFERENCES public.quote_estimation_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS estimate_total NUMERIC,
  ADD COLUMN IF NOT EXISTS estimate_low NUMERIC,
  ADD COLUMN IF NOT EXISTS estimate_high NUMERIC,
  ADD COLUMN IF NOT EXISTS estimate_line_items JSONB;

CREATE INDEX IF NOT EXISTS idx_quote_requests_estimation_run ON public.quote_requests(estimation_run_id) WHERE estimation_run_id IS NOT NULL;

-- 7. Optional: link ai_pages to a pricing profile for quote pages
ALTER TABLE public.ai_pages
  ADD COLUMN IF NOT EXISTS pricing_profile_id UUID REFERENCES public.quote_pricing_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ai_pages_pricing_profile ON public.ai_pages(pricing_profile_id) WHERE pricing_profile_id IS NOT NULL;

COMMENT ON TABLE public.quote_pricing_profiles IS 'Per-org pricing configuration (industry template or custom)';
COMMENT ON TABLE public.quote_services IS 'Services under a pricing profile (e.g. Website Design, Landscaping Visit)';
COMMENT ON TABLE public.quote_pricing_variables IS 'Input variables for pricing (e.g. number_of_pages, lot_size)';
COMMENT ON TABLE public.quote_pricing_rules IS 'Pricing rules applied in order (fixed, per_unit, addon, etc.)';
COMMENT ON TABLE public.quote_estimation_runs IS 'Each quote estimation calculation (inputs, rules applied, result)';
