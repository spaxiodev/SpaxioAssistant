-- Harden public access for multi-tenant data
-- - Remove overly broad public SELECT policies on widgets and business_settings
-- - Keep public access limited to explicit API routes using the service role

-- Drop old anon policies if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'widgets'
      AND policyname = 'Public can read widget by id'
  ) THEN
    EXECUTE 'DROP POLICY "Public can read widget by id" ON public.widgets';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'business_settings'
      AND policyname = 'Public can read business_settings by org'
  ) THEN
    EXECUTE 'DROP POLICY "Public can read business_settings by org" ON public.business_settings';
  END IF;
END
$$;

