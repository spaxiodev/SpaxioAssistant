-- Optional URL to the business's FAQ page (on their website). The chatbot uses this to direct users.
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS faq_page_url TEXT;

COMMENT ON COLUMN public.business_settings.faq_page_url IS 'Full URL to the business FAQ page on their website. The chatbot suggests this when users have questions.';
