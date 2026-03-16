-- AI Website Scanner runs (progress, status, result)
CREATE TABLE IF NOT EXISTS public.ai_setup_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  step TEXT,
  website_url TEXT,
  business_type TEXT,
  description TEXT,
  result_json JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_setup_runs_org ON public.ai_setup_runs(organization_id);
CREATE INDEX idx_ai_setup_runs_created ON public.ai_setup_runs(created_at DESC);

ALTER TABLE public.ai_setup_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view ai_setup_runs" ON public.ai_setup_runs
  FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage ai_setup_runs" ON public.ai_setup_runs
  FOR ALL USING (organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid())));

CREATE TRIGGER ai_setup_runs_updated_at BEFORE UPDATE ON public.ai_setup_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Lead qualification fields (backwards compatible)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS lead_score INT CHECK (lead_score >= 0 AND lead_score <= 100),
  ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS qualification_summary TEXT,
  ADD COLUMN IF NOT EXISTS qualification_raw JSONB,
  ADD COLUMN IF NOT EXISTS recommended_stage TEXT,
  ADD COLUMN IF NOT EXISTS estimated_value NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS next_action TEXT,
  ADD COLUMN IF NOT EXISTS qualified_at TIMESTAMPTZ;

COMMENT ON COLUMN public.leads.lead_score IS 'AI-computed lead score 0-100';
COMMENT ON COLUMN public.leads.qualification_raw IS 'Raw AI analysis result for audit';

-- Widget website actions: allowlisted action mappings (selector, url, section_id per action type)
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS widget_action_mappings JSONB DEFAULT '{}';

COMMENT ON COLUMN public.business_settings.widget_action_mappings IS 'Maps action types (e.g. open_quote_form) to { selector?, url?, section_id? } for widget website actions';
