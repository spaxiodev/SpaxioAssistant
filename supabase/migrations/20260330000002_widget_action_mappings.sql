-- Widget website actions: allowlisted action types mapped to selectors/URLs per org.
-- Stored in business_settings so one place for widget config.

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS widget_action_mappings JSONB DEFAULT '{}';

COMMENT ON COLUMN public.business_settings.widget_action_mappings IS 'Map action type to selector/url: e.g. open_quote_form -> { selector: "#quote", behavior: "scroll" }';
