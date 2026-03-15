-- =============================================================================
-- Phase 4: AI Voice Agents – provider abstraction, no schema break
-- Adds provider column to voice_agent_settings for future Twilio/Vapi/Deepgram/OpenAI Realtime.
-- =============================================================================

ALTER TABLE public.voice_agent_settings
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'browser'
    CHECK (provider IN ('browser', 'twilio', 'vapi', 'deepgram', 'openai_realtime'));

COMMENT ON COLUMN public.voice_agent_settings.provider IS 'Voice provider: browser (Web Speech API), twilio, vapi, deepgram, openai_realtime for future phone/streaming';
