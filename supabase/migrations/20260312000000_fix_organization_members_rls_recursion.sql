-- Fix infinite recursion in RLS policies for organization_members.
-- Run only when public.organization_members exists (after initial_schema).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'organization_members'
  ) THEN
    RAISE NOTICE 'Skipping RLS recursion fix: public.organization_members not found. Run 20240311000000_initial_schema.sql first.';
    RETURN;
  END IF;

  -- Recreate so it runs with same definer as other helpers (avoids RLS when used in policies)
  CREATE OR REPLACE FUNCTION public.get_user_organization_ids(user_uuid UUID)
  RETURNS SETOF UUID
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
  AS $fn$
    SELECT organization_id FROM public.organization_members WHERE user_id = user_uuid;
  $fn$;

  CREATE OR REPLACE FUNCTION public.get_user_owner_admin_organization_ids(user_uuid UUID)
  RETURNS SETOF UUID
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
  AS $fn$
    SELECT organization_id FROM public.organization_members
    WHERE user_id = user_uuid AND role IN ('owner', 'admin');
  $fn$;

  CREATE OR REPLACE FUNCTION public.get_user_owner_organization_ids(user_uuid UUID)
  RETURNS SETOF UUID
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
  AS $fn$
    SELECT organization_id FROM public.organization_members
    WHERE user_id = user_uuid AND role = 'owner';
  $fn$;

  -- organization_members
  DROP POLICY IF EXISTS "Org owners/admins can manage members" ON public.organization_members;
  CREATE POLICY "Org owners/admins can manage members" ON public.organization_members
    FOR ALL USING (
      organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid()))
    );

  -- organizations
  DROP POLICY IF EXISTS "Org owners/admins can update org" ON public.organizations;
  CREATE POLICY "Org owners/admins can update org" ON public.organizations
    FOR UPDATE USING (
      id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid()))
    );

  -- business_settings
  DROP POLICY IF EXISTS "Org owners/admins can manage business_settings" ON public.business_settings;
  CREATE POLICY "Org owners/admins can manage business_settings" ON public.business_settings
    FOR ALL USING (
      organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid()))
    );

  -- widgets
  DROP POLICY IF EXISTS "Org owners/admins can manage widgets" ON public.widgets;
  CREATE POLICY "Org owners/admins can manage widgets" ON public.widgets
    FOR ALL USING (
      organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid()))
    );

  -- subscriptions
  DROP POLICY IF EXISTS "Org owners can manage subscriptions" ON public.subscriptions;
  CREATE POLICY "Org owners can manage subscriptions" ON public.subscriptions
    FOR ALL USING (
      organization_id IN (SELECT public.get_user_owner_organization_ids(auth.uid()))
    );

  -- conversations delete
  DROP POLICY IF EXISTS "Org owners/admins can delete conversations" ON public.conversations;
  CREATE POLICY "Org owners/admins can delete conversations" ON public.conversations
    FOR DELETE USING (
      widget_id IN (
        SELECT w.id FROM public.widgets w
        WHERE w.organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid()))
      )
    );

  -- leads delete
  DROP POLICY IF EXISTS "Org owners/admins can delete leads" ON public.leads;
  CREATE POLICY "Org owners/admins can delete leads" ON public.leads
    FOR DELETE USING (
      organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid()))
    );

  -- quote_requests delete
  DROP POLICY IF EXISTS "Org owners/admins can delete quote_requests" ON public.quote_requests;
  CREATE POLICY "Org owners/admins can delete quote_requests" ON public.quote_requests
    FOR DELETE USING (
      organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid()))
    );

  RAISE NOTICE 'RLS recursion fix applied for organization_members.';
END $$;
