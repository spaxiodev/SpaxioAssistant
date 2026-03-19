-- Add assistant display mode: choose between full page or widget during setup
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS assistant_display_mode TEXT NOT NULL DEFAULT 'widget'
  CHECK (assistant_display_mode IN ('widget', 'full_page', 'both'));

COMMENT ON COLUMN public.business_settings.assistant_display_mode IS 'Preferred deployment: widget (embed on site), full_page (shareable link), or both.';
