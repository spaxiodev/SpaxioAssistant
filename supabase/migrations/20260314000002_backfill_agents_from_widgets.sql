-- Backfill: create one agent per existing widget (type = website_chatbot) and set widget.agent_id
-- Safe to run multiple times: only creates agents for widgets that don't yet have agent_id.
-- Rollback: set widgets.agent_id = null; optionally delete agents where role_type = 'website_chatbot'.

DO $$
DECLARE
  r RECORD;
  new_agent_id UUID;
  agent_name TEXT;
BEGIN
  FOR r IN
    SELECT w.id AS widget_id, w.organization_id, w.name AS widget_name, bs.chatbot_name
    FROM public.widgets w
    LEFT JOIN public.business_settings bs ON bs.organization_id = w.organization_id
    WHERE w.agent_id IS NULL
  LOOP
    agent_name := COALESCE(NULLIF(TRIM(r.chatbot_name), ''), r.widget_name, 'Website Chat');
    INSERT INTO public.agents (
      organization_id,
      name,
      role_type,
      model_provider,
      model_id,
      widget_enabled,
      webhook_enabled
    ) VALUES (
      r.organization_id,
      agent_name,
      'website_chatbot',
      'openai',
      'gpt-4o-mini',
      true,
      false
    )
    RETURNING id INTO new_agent_id;

    UPDATE public.widgets SET agent_id = new_agent_id WHERE id = r.widget_id;
  END LOOP;
END $$;
