-- API keys for programmatic automation management (api_access entitlement).
-- Keys are hashed; only the prefix is stored for display. Lookup by hash.

CREATE TABLE public.organization_api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'API key',
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_organization_api_keys_key_hash ON public.organization_api_keys(key_hash);
CREATE INDEX idx_organization_api_keys_organization ON public.organization_api_keys(organization_id);

ALTER TABLE public.organization_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org owners/admins can manage api keys" ON public.organization_api_keys
  FOR ALL USING (
    organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid()))
  );

COMMENT ON TABLE public.organization_api_keys IS 'API keys for programmatic access; key_hash is SHA-256 of the secret key.';
