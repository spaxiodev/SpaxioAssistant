-- Allow embedded quote forms to mirror the AI widget quote form (business_settings + default pricing profile).
ALTER TABLE public.embedded_forms
  ADD COLUMN IF NOT EXISTS quote_form_field_source TEXT NOT NULL DEFAULT 'custom'
  CHECK (quote_form_field_source IN ('custom', 'widget_ai'));

COMMENT ON COLUMN public.embedded_forms.quote_form_field_source IS
  'For quote_form only: custom = form_fields rows; widget_ai = same fields as AI widget (quote_form_config + default pricing profile variables).';
