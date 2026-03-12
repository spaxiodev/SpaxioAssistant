-- Richer leads: timeline, project details, location (what the chatbot asks for)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS requested_timeline TEXT,
  ADD COLUMN IF NOT EXISTS project_details TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT;

-- Quote requests: budget (text + numeric for comparison) so owner can see "worth it" vs below base
ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS budget_text TEXT,
  ADD COLUMN IF NOT EXISTS budget_amount NUMERIC;

-- Business settings: minimum/base price per service type for "worth pursuing" logic
-- e.g. {"Landscaping": 500, "Design": 1000} - if customer budget_amount < base, mark as not worth it
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS service_base_prices JSONB DEFAULT '{}';

COMMENT ON COLUMN public.business_settings.service_base_prices IS 'Map of service_type (string) to minimum price (number). Quote requests with budget_amount below this are shown as "Not worth it".';
