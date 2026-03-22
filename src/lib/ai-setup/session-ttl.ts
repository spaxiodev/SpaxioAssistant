import type { SupabaseClient } from '@supabase/supabase-js';
import { expiredAiSetupSessionCutoffIso } from '@/lib/ai-setup/session-ttl-constants';

/**
 * Removes draft setup sessions with no activity for longer than the TTL.
 * Published sessions are kept (audit / embed flow).
 */
export async function deleteExpiredDraftAiSetupSessions(
  supabase: SupabaseClient,
  orgId: string
): Promise<void> {
  const cutoff = expiredAiSetupSessionCutoffIso();
  const { error } = await supabase
    .from('ai_setup_sessions')
    .delete()
    .eq('organization_id', orgId)
    .eq('status', 'draft')
    .lt('updated_at', cutoff);

  if (error) {
    console.error('[ai-setup] deleteExpiredDraftAiSetupSessions', error);
  }
}
