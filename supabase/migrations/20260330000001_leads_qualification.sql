-- Lead qualification: AI-derived score, priority, summary, and audit.
-- Backwards compatible: new columns nullable.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS qualification_score INT CHECK (qualification_score IS NULL OR (qualification_score >= 0 AND qualification_score <= 100)),
  ADD COLUMN IF NOT EXISTS qualification_priority TEXT CHECK (qualification_priority IS NULL OR qualification_priority IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS qualification_summary TEXT,
  ADD COLUMN IF NOT EXISTS qualification_raw JSONB,
  ADD COLUMN IF NOT EXISTS qualified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recommended_deal_stage TEXT,
  ADD COLUMN IF NOT EXISTS estimated_deal_value NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS next_recommended_action TEXT;

COMMENT ON COLUMN public.leads.qualification_score IS 'AI lead score 0-100';
COMMENT ON COLUMN public.leads.qualification_priority IS 'low, medium, high';
COMMENT ON COLUMN public.leads.qualification_summary IS 'Plain-language AI summary';
COMMENT ON COLUMN public.leads.qualification_raw IS 'Raw AI analysis for audit';
COMMENT ON COLUMN public.leads.qualified_at IS 'When qualification was last run';
COMMENT ON COLUMN public.leads.recommended_deal_stage IS 'Suggested deal stage';
COMMENT ON COLUMN public.leads.estimated_deal_value IS 'Estimated value if inferred';
COMMENT ON COLUMN public.leads.next_recommended_action IS 'Suggested next action';
