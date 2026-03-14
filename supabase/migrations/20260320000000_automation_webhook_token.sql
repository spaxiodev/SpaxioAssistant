-- Per-automation webhook URL: token used in path /api/webhooks/:token
-- When trigger_type = 'webhook_received', automation gets a unique token and optional secret.

ALTER TABLE public.automations
  ADD COLUMN IF NOT EXISTS webhook_token TEXT,
  ADD COLUMN IF NOT EXISTS webhook_secret TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_automations_webhook_token
  ON public.automations(webhook_token)
  WHERE webhook_token IS NOT NULL;

COMMENT ON COLUMN public.automations.webhook_token IS 'Unique token for inbound webhook URL (POST /api/webhooks/:token). Set when trigger_type = webhook_received.';
COMMENT ON COLUMN public.automations.webhook_secret IS 'Optional secret for validating inbound webhook (e.g. X-Webhook-Signature).';
