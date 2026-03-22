-- Track where a quote request originated (widget vs full-page AI assistant).

ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS submission_source TEXT,
  ADD COLUMN IF NOT EXISTS submission_metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.quote_requests.submission_source IS 'Origin channel: ai_widget, ai_page_assistant';
COMMENT ON COLUMN public.quote_requests.submission_metadata IS 'Extra context: ai_page_run_id, conversation_id, etc.';

CREATE INDEX IF NOT EXISTS idx_quote_requests_submission_source
  ON public.quote_requests(submission_source)
  WHERE submission_source IS NOT NULL;
