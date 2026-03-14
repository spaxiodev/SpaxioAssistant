/**
 * Record usage for billing enforcement (messages, AI/tool actions).
 * Uses Supabase RPC for atomic increment per billing period.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export async function recordMessageUsage(
  supabase: SupabaseClient,
  organizationId: string
): Promise<void> {
  await supabase.rpc('increment_org_usage_messages', { org_id: organizationId });
}

export async function recordAiActionUsage(
  supabase: SupabaseClient,
  organizationId: string
): Promise<void> {
  await supabase.rpc('increment_org_usage_ai_actions', { org_id: organizationId });
}
