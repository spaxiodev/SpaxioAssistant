-- =============================================================================
-- Tighten voice_agent_settings.provider CHECK; map any non-allowed value to browser.
-- =============================================================================

UPDATE public.voice_agent_settings
SET provider = 'browser'
WHERE provider IS NOT NULL
  AND provider NOT IN ('browser', 'vapi', 'deepgram', 'openai_realtime');

ALTER TABLE public.voice_agent_settings
  DROP CONSTRAINT IF EXISTS voice_agent_settings_provider_check;

ALTER TABLE public.voice_agent_settings
  ADD CONSTRAINT voice_agent_settings_provider_check
  CHECK (provider IN ('browser', 'vapi', 'deepgram', 'openai_realtime'));

COMMENT ON COLUMN public.voice_agent_settings.provider IS 'Voice provider: browser (Web Speech API), vapi, deepgram, openai_realtime for phone/streaming';
