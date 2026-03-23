-- AI Search Agent: product catalog, per-org settings, analytics events

CREATE TABLE public.catalog_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  external_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  category TEXT,
  attributes JSONB DEFAULT '{}',
  variants JSONB DEFAULT '[]',
  price NUMERIC(12,2),
  compare_at_price NUMERIC(12,2),
  cost NUMERIC(12,2),
  margin NUMERIC(8,6),
  inventory_count INTEGER NOT NULL DEFAULT 0,
  promoted BOOLEAN NOT NULL DEFAULT false,
  popularity_score NUMERIC(12,4) NOT NULL DEFAULT 0,
  custom_boost_score NUMERIC(12,4) NOT NULL DEFAULT 0,
  searchable_metadata JSONB DEFAULT '{}',
  image_url TEXT,
  product_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_catalog_products_org ON public.catalog_products(organization_id);
CREATE INDEX idx_catalog_products_org_active ON public.catalog_products(organization_id, active) WHERE active = true;

ALTER TABLE public.catalog_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view catalog_products" ON public.catalog_products
  FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage catalog_products" ON public.catalog_products
  FOR ALL USING (organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid())));

CREATE TRIGGER catalog_products_updated_at BEFORE UPDATE ON public.catalog_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.ai_search_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  display_mode TEXT NOT NULL DEFAULT 'modal' CHECK (display_mode IN (
    'replace_search', 'beside_search', 'modal', 'widget_only'
  )),
  search_mode TEXT NOT NULL DEFAULT 'balanced' CHECK (search_mode IN ('strict', 'balanced', 'broad')),
  relevance_weight NUMERIC(8,4) NOT NULL DEFAULT 1,
  profit_weight NUMERIC(8,4) NOT NULL DEFAULT 0.25,
  promotion_weight NUMERIC(8,4) NOT NULL DEFAULT 0.35,
  inventory_weight NUMERIC(8,4) NOT NULL DEFAULT 0.2,
  popularity_weight NUMERIC(8,4) NOT NULL DEFAULT 0.25,
  use_custom_boost BOOLEAN NOT NULL DEFAULT true,
  hide_out_of_stock BOOLEAN NOT NULL DEFAULT true,
  priority_order JSONB NOT NULL DEFAULT '["promoted","high_margin","overstock","newest","popular"]'::jsonb,
  include_site_content BOOLEAN NOT NULL DEFAULT false,
  quick_prompts JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_search_settings_org ON public.ai_search_settings(organization_id);

ALTER TABLE public.ai_search_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view ai_search_settings" ON public.ai_search_settings
  FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage ai_search_settings" ON public.ai_search_settings
  FOR ALL USING (organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid())));

CREATE TRIGGER ai_search_settings_updated_at BEFORE UPDATE ON public.ai_search_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.ai_search_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  widget_id UUID REFERENCES public.widgets(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'query', 'click', 'no_results', 'conversion', 'session_intent'
  )),
  query_text TEXT,
  normalized_intent TEXT,
  locale TEXT,
  product_id UUID REFERENCES public.catalog_products(id) ON DELETE SET NULL,
  session_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_search_events_org_created ON public.ai_search_events(organization_id, created_at DESC);
CREATE INDEX idx_ai_search_events_org_type ON public.ai_search_events(organization_id, event_type);
CREATE INDEX idx_ai_search_events_session ON public.ai_search_events(organization_id, session_id);

ALTER TABLE public.ai_search_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view ai_search_events" ON public.ai_search_events
  FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));

COMMENT ON TABLE public.catalog_products IS 'Searchable product catalog for AI Search Agent';
COMMENT ON TABLE public.ai_search_settings IS 'Per-organization AI Search Agent configuration';
COMMENT ON TABLE public.ai_search_events IS 'AI Search analytics (queries, clicks, no-results)';
