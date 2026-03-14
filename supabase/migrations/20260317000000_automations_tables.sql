-- Automations: workflow definitions and run history
-- Tenancy: organization_id. Optional agent_id for agent-based actions.
-- n8n-ready: trigger_config/action_config are JSONB for future webhook URLs and payloads.

CREATE TABLE public.automations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused')),
  trigger_type TEXT NOT NULL,
  trigger_config JSONB DEFAULT '{}',
  action_type TEXT NOT NULL,
  action_config JSONB DEFAULT '{}',
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  template_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_automations_organization ON public.automations(organization_id);
CREATE INDEX idx_automations_status ON public.automations(status);
CREATE INDEX idx_automations_agent ON public.automations(agent_id);

ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view automations" ON public.automations
  FOR SELECT USING (
    organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  );
CREATE POLICY "Org owners/admins can insert automations" ON public.automations
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid()))
  );
CREATE POLICY "Org owners/admins can update automations" ON public.automations
  FOR UPDATE USING (
    organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid()))
  );
CREATE POLICY "Org owners/admins can delete automations" ON public.automations
  FOR DELETE USING (
    organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid()))
  );

CREATE TRIGGER automations_updated_at BEFORE UPDATE ON public.automations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.automations IS 'Workflow automations per organization; triggers and actions with optional agent link';

-- Automation runs: one row per execution (manual test or event-driven)
CREATE TABLE public.automation_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'success', 'failed')),
  input_payload JSONB DEFAULT '{}',
  output_payload JSONB DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_automation_runs_automation ON public.automation_runs(automation_id);
CREATE INDEX idx_automation_runs_started ON public.automation_runs(started_at DESC);

ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;

-- Runs are visible/managed only via automation ownership
CREATE POLICY "Org members can view automation runs" ON public.automation_runs
  FOR SELECT USING (
    automation_id IN (
      SELECT id FROM public.automations
      WHERE organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
    )
  );
CREATE POLICY "Org owners/admins can insert automation runs" ON public.automation_runs
  FOR INSERT WITH CHECK (
    automation_id IN (
      SELECT id FROM public.automations
      WHERE organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid()))
    )
  );
CREATE POLICY "Org owners/admins can update automation runs" ON public.automation_runs
  FOR UPDATE USING (
    automation_id IN (
      SELECT id FROM public.automations
      WHERE organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid()))
    )
  );

COMMENT ON TABLE public.automation_runs IS 'Execution log for automations; used for manual test and future event-driven runs';
