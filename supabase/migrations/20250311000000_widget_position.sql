-- Widget position (pixels from bottom/right) for business_settings
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS widget_position_bottom INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS widget_position_right INTEGER NOT NULL DEFAULT 20;

COMMENT ON COLUMN public.business_settings.widget_position_bottom IS 'Widget bubble position: pixels from bottom of viewport';
COMMENT ON COLUMN public.business_settings.widget_position_right IS 'Widget bubble position: pixels from right of viewport';
