-- Add logo URL for widget bubble and allow label text
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS widget_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS widget_label_override TEXT;

COMMENT ON COLUMN public.business_settings.widget_logo_url IS 'Public URL for the chat widget bubble logo.';
COMMENT ON COLUMN public.business_settings.widget_label_override IS 'Optional override for the small label above the chat bubble.';

