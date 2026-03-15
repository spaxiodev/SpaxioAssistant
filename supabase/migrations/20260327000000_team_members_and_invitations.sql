-- Team Members & Invitations
-- Integrates with existing organizations / organization_members.
-- Only owners can manage team; members get granular permissions.

-- Extend organization_members for team member permissions and audit
ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS role_label TEXT,
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS invited_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_organization_members_invited_by ON public.organization_members(invited_by_user_id) WHERE invited_by_user_id IS NOT NULL;

COMMENT ON COLUMN public.organization_members.role_label IS 'Display role name (e.g. Admin, Manager, Support)';
COMMENT ON COLUMN public.organization_members.permissions IS 'Granular permission flags; owner ignores this and has full access';
COMMENT ON COLUMN public.organization_members.invited_by_user_id IS 'User who invited this member (null for owner/legacy)';

-- Organization invitations (pending invites)
CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  role_label TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ
);

-- Only one pending invite per (org, email): allow one row per pair; status distinguishes
-- We use UNIQUE(organization_id, email) so duplicate pending invites are prevented by updating or failing
DROP INDEX IF EXISTS idx_organization_invitations_org_email;
CREATE UNIQUE INDEX idx_organization_invitations_org_email_pending
  ON public.organization_invitations(organization_id, email)
  WHERE status = 'pending';

CREATE INDEX idx_organization_invitations_org ON public.organization_invitations(organization_id);
CREATE INDEX idx_organization_invitations_token ON public.organization_invitations(token);
CREATE INDEX idx_organization_invitations_expires ON public.organization_invitations(expires_at) WHERE status = 'pending';

ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- Invitations: org owners can manage (create, read, update for revoke); invited user can read by token via API
CREATE POLICY "Org owners can manage invitations" ON public.organization_invitations
  FOR ALL USING (
    organization_id IN (SELECT public.get_user_owner_organization_ids(auth.uid()))
  );

-- Service role / API will validate token server-side for accept flow; no anon read

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'organization_invitations_updated_at') THEN
    CREATE TRIGGER organization_invitations_updated_at
      BEFORE UPDATE ON public.organization_invitations
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- Allow Starter plan to invite 1 team member (paid tier = can invite)
UPDATE public.plan_entitlements pe
SET value = '1'::jsonb
FROM public.plans p
WHERE pe.plan_id = p.id AND p.slug = 'starter' AND pe.entitlement_key = 'max_team_members';
