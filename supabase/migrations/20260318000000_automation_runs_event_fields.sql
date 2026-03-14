-- Add event and observability fields to automation_runs.
-- Backward compatible: new columns nullable; existing runs unchanged.

ALTER TABLE public.automation_runs
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS event_id TEXT,
  ADD COLUMN IF NOT EXISTS trigger_event_type TEXT,
  ADD COLUMN IF NOT EXISTS trace_id TEXT,
  ADD COLUMN IF NOT EXISTS correlation_id TEXT,
  ADD COLUMN IF NOT EXISTS duration_ms INT,
  ADD COLUMN IF NOT EXISTS summary TEXT;

CREATE INDEX IF NOT EXISTS idx_automation_runs_organization ON public.automation_runs(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_automation_runs_trigger_event ON public.automation_runs(trigger_event_type) WHERE trigger_event_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_automation_runs_trace ON public.automation_runs(trace_id) WHERE trace_id IS NOT NULL;

COMMENT ON COLUMN public.automation_runs.organization_id IS 'Denormalized for scoping and analytics';
COMMENT ON COLUMN public.automation_runs.trigger_event_type IS 'Event type that triggered this run (e.g. lead_form_submitted)';
COMMENT ON COLUMN public.automation_runs.trace_id IS 'Id for correlating with logs and other runs';
