-- Multi-step workflows: automation_steps and automation_run_steps.
-- When an automation has steps, runner executes them in order; otherwise legacy single action.

CREATE TABLE public.automation_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  step_type TEXT NOT NULL CHECK (step_type IN ('action', 'branch_if', 'delay', 'human_approval')),
  step_name TEXT,
  config_json JSONB DEFAULT '{}',
  condition_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_automation_steps_automation ON public.automation_steps(automation_id);

ALTER TABLE public.automation_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view automation steps" ON public.automation_steps
  FOR SELECT USING (
    automation_id IN (
      SELECT id FROM public.automations
      WHERE organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
    )
  );
CREATE POLICY "Org owners/admins can manage automation steps" ON public.automation_steps
  FOR ALL USING (
    automation_id IN (
      SELECT id FROM public.automations
      WHERE organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid()))
    )
  );

CREATE TRIGGER automation_steps_updated_at BEFORE UPDATE ON public.automation_steps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Run-level step execution log
CREATE TABLE public.automation_run_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES public.automation_runs(id) ON DELETE CASCADE,
  step_id UUID REFERENCES public.automation_steps(id) ON DELETE SET NULL,
  step_order INT NOT NULL,
  step_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed', 'skipped')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  input_payload JSONB,
  output_payload JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_automation_run_steps_run ON public.automation_run_steps(run_id);

ALTER TABLE public.automation_run_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view run steps" ON public.automation_run_steps
  FOR SELECT USING (
    run_id IN (
      SELECT ar.id FROM public.automation_runs ar
      JOIN public.automations a ON a.id = ar.automation_id
      WHERE a.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
    )
  );

COMMENT ON TABLE public.automation_steps IS 'Multi-step workflow definition; step_type: action, branch_if, delay, human_approval.';
COMMENT ON TABLE public.automation_run_steps IS 'Per-step execution log for a run.';
