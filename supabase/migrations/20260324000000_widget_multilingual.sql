-- Chatbot-level multilingual settings (per organization / widget)
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS default_language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS supported_languages TEXT[] DEFAULT ARRAY['en', 'fr', 'es', 'de', 'pt', 'it'],
  ADD COLUMN IF NOT EXISTS auto_detect_website_language BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS fallback_language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS match_ai_response_to_website_language BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_language_switcher BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_translations JSONB DEFAULT '{}';

COMMENT ON COLUMN public.business_settings.default_language IS 'Default widget and AI response language when detection is off or fails';
COMMENT ON COLUMN public.business_settings.supported_languages IS 'List of language codes the widget and AI are allowed to use';
COMMENT ON COLUMN public.business_settings.auto_detect_website_language IS 'Whether to detect site language from html lang, URL, or navigator';
COMMENT ON COLUMN public.business_settings.fallback_language IS 'Language to use when detection fails and no default is set';
COMMENT ON COLUMN public.business_settings.match_ai_response_to_website_language IS 'Whether AI should respond in the active widget/site language';
COMMENT ON COLUMN public.business_settings.show_language_switcher IS 'Show language selector in widget header/settings';
COMMENT ON COLUMN public.business_settings.custom_translations IS 'Per-language overrides: { "en": { "welcomeMessage": "..." }, "fr": { ... } }';
