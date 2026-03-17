-- Quote form presentation config: controls how the quote form appears in the widget.
-- Stored in business_settings for org-wide control.
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS quote_form_config JSONB DEFAULT '{}';

COMMENT ON COLUMN public.business_settings.quote_form_config IS 'Quote form presentation: intro_text, submit_button_label, name_required, email_required, phone_required, show_estimate_instantly, show_exact_estimate';
