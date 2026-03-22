-- =============================================================================
-- Phase 4: AI Voice Agents – provider abstraction, no schema break
-- Adds provider column to voice_agent_settings for Vapi/Deepgram/OpenAI Realtime (and browser).
-- =============================================================================

ALTER TABLE public.voice_agent_settings
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'browser'
    CHECK (provider IN ('browser', 'vapi', 'deepgram', 'openai_realtime'));

COMMENT ON COLUMN public.voice_agent_settings.provider IS 'Voice provider: browser (Web Speech API), vapi, deepgram, openai_realtime for phone/streaming';
