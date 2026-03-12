-- Show chat bubble label only when user opts in (default off)
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS show_widget_label BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.business_settings.show_widget_label IS 'When true, show the optional text label above the chat bubble (e.g. "[Business name] chatbot").';
