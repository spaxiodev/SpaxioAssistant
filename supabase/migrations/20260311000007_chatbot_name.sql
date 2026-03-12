ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS chatbot_name TEXT;

COMMENT ON COLUMN public.business_settings.chatbot_name IS 'Optional name shown in the chat window header.';
