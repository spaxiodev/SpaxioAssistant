/**
 * AI Actions execution context and safety layer.
 * Used when executing an action from chat or voice: validates org, permissions, entitlements,
 * and provides a consistent context for action handlers.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getOrganizationIdForConversation } from '@/lib/conversation-org';
import { canUseAiActions } from '@/lib/entitlements';
import type { InitiatedByType } from '@/types/platform';

export type ActionExecutionContext = {
  organizationId: string;
  agentId: string | null;
  conversationId: string | null;
  messageId: string | null;
  initiatedByType: InitiatedByType;
  initiatedByUserId: string | null;
  /** Admin bypass for plan limits (from isOrgAllowedByAdmin). */
  adminAllowed: boolean;
};

export type ActionValidationResult =
  | { allowed: true; organizationId: string }
  | { allowed: false; reason: string };

/**
 * Validates that an action can be run in the given context:
 * - conversation (if present) belongs to org
 * - org has ai_actions_enabled (or admin bypass)
 */
export async function validateActionContext(
  supabase: SupabaseClient,
  context: {
    organizationId: string;
    conversationId?: string | null;
    adminAllowed?: boolean;
  }
): Promise<ActionValidationResult> {
  const { organizationId, conversationId, adminAllowed = false } = context;

  if (conversationId) {
    const convOrgId = await getOrganizationIdForConversation(supabase, conversationId);
    if (convOrgId !== organizationId) {
      return { allowed: false, reason: 'conversation_org_mismatch' };
    }
  }

  const allowed = await canUseAiActions(supabase, organizationId, adminAllowed);
  if (!allowed) {
    return { allowed: false, reason: 'ai_actions_not_enabled' };
  }

  return { allowed: true, organizationId };
}

/**
 * Build execution context for logging (action_invocations).
 */
export function buildActionInvocationContext(
  organizationId: string,
  options: {
    agentId?: string | null;
    conversationId?: string | null;
    messageId?: string | null;
    initiatedByType?: InitiatedByType;
    initiatedByUserId?: string | null;
  }
): ActionExecutionContext {
  return {
    organizationId,
    agentId: options.agentId ?? null,
    conversationId: options.conversationId ?? null,
    messageId: options.messageId ?? null,
    initiatedByType: options.initiatedByType ?? 'ai',
    initiatedByUserId: options.initiatedByUserId ?? null,
    adminAllowed: false,
  };
}
