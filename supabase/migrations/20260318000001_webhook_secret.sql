-- Optional webhook secret per organization for inbound automation triggers.
-- Used by POST /api/automations/events to authenticate external systems.

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS webhook_secret TEXT;

COMMENT ON COLUMN public.business_settings.webhook_secret IS 'Optional secret for inbound webhook authentication (X-Webhook-Secret or Bearer token).';
