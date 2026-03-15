/**
 * Resolve organization_id for a conversation (via widget).
 * Used by inbox, actions, and voice to enforce org scoping.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Returns organization_id for the given conversation, or null if not found.
 * Conversations are linked to org through widget_id -> widgets.organization_id.
 */
export async function getOrganizationIdForConversation(
  supabase: SupabaseClient,
  conversationId: string
): Promise<string | null> {
  const { data: conv } = await supabase
    .from('conversations')
    .select('widget_id')
    .eq('id', conversationId)
    .maybeSingle();

  if (!conv?.widget_id) return null;

  const { data: widget } = await supabase
    .from('widgets')
    .select('organization_id')
    .eq('id', conv.widget_id)
    .maybeSingle();

  return widget?.organization_id ?? null;
}

/**
 * Asserts that the conversation belongs to the given organization.
 * Returns true if it does, false otherwise.
 */
export async function conversationBelongsToOrg(
  supabase: SupabaseClient,
  conversationId: string,
  organizationId: string
): Promise<boolean> {
  const orgId = await getOrganizationIdForConversation(supabase, conversationId);
  return orgId === organizationId;
}
