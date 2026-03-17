-- AI Page embed, quote request contact fields, document linking
-- 1. Quote requests: add email and phone for full-page AI intake
ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT;

COMMENT ON COLUMN public.quote_requests.customer_email IS 'Email from quote form or AI page intake';
COMMENT ON COLUMN public.quote_requests.customer_phone IS 'Phone from quote form or AI page intake';

-- 2. Documents: link to conversation for visibility from conversation detail
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_conversation ON public.documents(conversation_id) WHERE conversation_id IS NOT NULL;

-- 3. AI Pages: extend deployment_mode for hosted_page, embedded_page, both (keep existing for backward compat)
ALTER TABLE public.ai_pages
  DROP CONSTRAINT IF EXISTS ai_pages_deployment_mode_check;

ALTER TABLE public.ai_pages
  ADD CONSTRAINT ai_pages_deployment_mode_check CHECK (deployment_mode IN (
    'widget_only',
    'page_only',
    'widget_and_page',
    'widget_handoff_to_page',
    'hosted_page',
    'embedded_page',
    'both'
  ));

COMMENT ON COLUMN public.ai_pages.deployment_mode IS 'hosted_page = Spaxio URL only; embedded_page = embeddable iframe; widget_handoff_to_page = widget hands off to page; both = hosted + embeddable';
