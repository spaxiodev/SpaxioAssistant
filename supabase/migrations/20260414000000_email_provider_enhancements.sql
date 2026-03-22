-- Email Provider Enhancements
-- Adds OAuth / IMAP credential support columns to email_providers,
-- plus a unique index on inbound_webhook_token to prevent rare collisions.

-- ── New columns on email_providers ───────────────────────────────────────────

ALTER TABLE public.email_providers
  ADD COLUMN IF NOT EXISTS connected_email   text,          -- e.g. user@gmail.com  (safe to display, NOT encrypted)
  ADD COLUMN IF NOT EXISTS connected_name    text,          -- OAuth display name
  ADD COLUMN IF NOT EXISTS last_verified_at  timestamptz,   -- last successful connection test
  ADD COLUMN IF NOT EXISTS is_default        boolean NOT NULL DEFAULT false;  -- default sending provider

-- ── Index: inbound_webhook_token uniqueness ───────────────────────────────────
-- The original migration has no uniqueness constraint; add it as a partial
-- index (NULL tokens on OAuth-only providers are allowed and not unique).

CREATE UNIQUE INDEX IF NOT EXISTS uq_email_providers_webhook_token
  ON public.email_providers(inbound_webhook_token)
  WHERE inbound_webhook_token IS NOT NULL;

-- ── Index: fast lookup of OAuth state during callback ─────────────────────────
-- The OAuth callback queries config_json->>'state'; a GIN index helps.
CREATE INDEX IF NOT EXISTS idx_email_providers_config_gin
  ON public.email_providers USING GIN (config_json)
  WHERE config_json IS NOT NULL;

-- ── Extend status values comment (informational; column is free-form text) ────
-- Supported status values after this migration:
--   'connected'        – provider is working
--   'disconnected'     – added but not yet connected / credentials cleared
--   'connecting'       – OAuth flow in progress (transient)
--   'needs_reconnect'  – token expired or revoked, user must re-authorise
--   'error'            – last connection attempt failed
--   'disabled'         – user manually disabled the provider

COMMENT ON COLUMN public.email_providers.status IS
  'connected | disconnected | connecting | needs_reconnect | error | disabled';

COMMENT ON COLUMN public.email_providers.config_json IS
  'Encrypted provider credentials. Never store raw secrets; use encryptSecret() from src/lib/security/secrets.ts. '
  'For OAuth providers: {access_token_enc, refresh_token_enc, token_expires_at, scope, email, state, state_expires_at}. '
  'For IMAP: {email, from_name, imap_host, imap_port, imap_secure, smtp_host, smtp_port, smtp_secure, password_enc}.';
