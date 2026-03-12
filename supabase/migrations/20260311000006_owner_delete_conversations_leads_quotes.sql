-- Allow org owners and admins to delete conversation history, leads, and quote requests.
-- Deleting a conversation CASCADE deletes its messages.

CREATE POLICY "Org owners/admins can delete conversations" ON public.conversations
  FOR DELETE USING (
    widget_id IN (
      SELECT w.id FROM public.widgets w
      WHERE w.organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY "Org owners/admins can delete leads" ON public.leads
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Org owners/admins can delete quote_requests" ON public.quote_requests
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
