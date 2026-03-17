-- Widget quote form: link leads to quote requests, store form answers, track source.
-- Enables lead capture before quote submission and dashboard integration.

-- 1. leads.source: where the lead came from (e.g. widget_quote, widget_lead, ai_page)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS source TEXT;

COMMENT ON COLUMN public.leads.source IS 'Lead origin: widget_quote, widget_lead, ai_page, etc.';

-- 2. quote_requests.lead_id: link to the lead for quote submissions
ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS form_answers JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_quote_requests_lead ON public.quote_requests(lead_id) WHERE lead_id IS NOT NULL;

COMMENT ON COLUMN public.quote_requests.lead_id IS 'Linked lead when quote was submitted with contact info';
COMMENT ON COLUMN public.quote_requests.form_answers IS 'Raw form inputs (pricing variables) from widget quote form';
