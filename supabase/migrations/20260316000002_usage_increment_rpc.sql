-- RPCs for atomic usage increment (called from API with service role).
-- Billing period = calendar month.

CREATE OR REPLACE FUNCTION public.increment_org_usage_messages(org_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  period_start DATE := date_trunc('month', current_date)::date;
  period_end DATE := (date_trunc('month', current_date) + interval '1 month' - interval '1 day')::date;
BEGIN
  INSERT INTO public.org_usage (organization_id, period_start, period_end, message_count, ai_action_count)
  VALUES (org_id, period_start, period_end, 1, 0)
  ON CONFLICT (organization_id, period_start)
  DO UPDATE SET
    message_count = public.org_usage.message_count + 1,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_org_usage_ai_actions(org_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  period_start DATE := date_trunc('month', current_date)::date;
  period_end DATE := (date_trunc('month', current_date) + interval '1 month' - interval '1 day')::date;
BEGIN
  INSERT INTO public.org_usage (organization_id, period_start, period_end, message_count, ai_action_count)
  VALUES (org_id, period_start, period_end, 0, 1)
  ON CONFLICT (organization_id, period_start)
  DO UPDATE SET
    ai_action_count = public.org_usage.ai_action_count + 1,
    updated_at = now();
END;
$$;

COMMENT ON FUNCTION public.increment_org_usage_messages(UUID) IS 'Increment monthly message count for org (billing usage)';
COMMENT ON FUNCTION public.increment_org_usage_ai_actions(UUID) IS 'Increment monthly AI/tool action count for org (billing usage)';
