-- Website auto-setup: track runs and progress for "Do It For Me" URL-based setup.
-- All org-scoped; RLS via get_user_owner_admin_organization_ids.

CREATE TABLE public.website_auto_setup_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scanning', 'building_knowledge', 'creating_agents', 'creating_automations', 'configuring_widget', 'done', 'failed')),
  current_step TEXT,
  website_url TEXT NOT NULL,
  business_type TEXT,
  business_description TEXT,
  result_summary JSONB DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_website_auto_setup_runs_org ON public.website_auto_setup_runs(organization_id);
CREATE INDEX idx_website_auto_setup_runs_status ON public.website_auto_setup_runs(status);
CREATE INDEX idx_website_auto_setup_runs_started ON public.website_auto_setup_runs(started_at DESC);

ALTER TABLE public.website_auto_setup_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org owners/admins website_auto_setup_runs" ON public.website_auto_setup_runs
  FOR ALL USING (
    organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid()))
  );

COMMENT ON TABLE public.website_auto_setup_runs IS 'AI website scanner auto-setup runs; progress and result summary per org';
