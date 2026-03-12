-- Add preset string for widget position (e.g. bottom-right, top-left)
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS widget_position_preset TEXT NOT NULL DEFAULT 'bottom-right';

COMMENT ON COLUMN public.business_settings.widget_position_preset IS 'Preset anchor for chat widget position (e.g. bottom-right, bottom-center).';

