-- Allow hiding the chatbot on the client website from the dashboard (default on)
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS widget_enabled BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.business_settings.widget_enabled IS 'When false, the embed script will not show the chatbot on the client website.';
