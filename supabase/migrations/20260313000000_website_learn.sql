-- Website URL and learned content for auto-learning the business site
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS website_learned_content TEXT,
  ADD COLUMN IF NOT EXISTS website_learned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_learn_attempt_at TIMESTAMPTZ;

COMMENT ON COLUMN public.business_settings.website_url IS 'Customer website URL to crawl for learning';
COMMENT ON COLUMN public.business_settings.website_learned_content IS 'Extracted text from last successful website learn';
COMMENT ON COLUMN public.business_settings.website_learned_at IS 'When website was last successfully learned';
COMMENT ON COLUMN public.business_settings.last_learn_attempt_at IS 'Last time learn-website was attempted (rate limit cooldown)';
