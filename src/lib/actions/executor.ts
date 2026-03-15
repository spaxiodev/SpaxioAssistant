/**
 * Safe executor for AI actions: validate org/entitlements, log to action_invocations, run handler.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { validateActionContext, buildActionInvocationContext } from './context';
import { getAction } from './registry';
import type { ActionExecutionContext } from './context';
import type { InitiatedByType } from '@/types/platform';

export type ExecuteActionInput = {
  actionKey: string;
  input: Record<string, unknown>;
  organizationId: string;
  conversationId?: string | null;
  agentId?: string | null;
  messageId?: string | null;
  initiatedByType?: InitiatedByType;
  initiatedByUserId?: string | null;
  adminAllowed?: boolean;
};

export type ExecuteActionResult =
  | { success: true; invocationId: string; output: Record<string, unknown> }
  | { success: false; error: string; invocationId?: string };

/**
 * Execute an action: validate context, insert action_invocation (pending), run handler, update row.
 */
export async function executeAction(
  supabase: SupabaseClient,
  params: ExecuteActionInput
): Promise<ExecuteActionResult> {
  const {
    actionKey,
    input,
    organizationId,
    conversationId,
    agentId,
    messageId,
    initiatedByType = 'ai',
    initiatedByUserId,
    adminAllowed = false,
  } = params;

  const validation = await validateActionContext(supabase, {
    organizationId,
    conversationId,
    adminAllowed,
  });
  if (!validation.allowed) {
    return { success: false, error: validation.reason };
  }

  const action = getAction(actionKey);
  if (!action) {
    return { success: false, error: 'Unknown action: ' + actionKey };
  }

  const validationResult = action.validate(input);
  if (!validationResult.ok) {
    return { success: false, error: validationResult.error };
  }
  const normalizedInput = validationResult.input;

  const startedAt = new Date().toISOString();
  const { data: invocation, error: insertError } = await supabase
    .from('action_invocations')
    .insert({
      organization_id: organizationId,
      agent_id: agentId ?? null,
      conversation_id: conversationId ?? null,
      message_id: messageId ?? null,
      action_key: actionKey,
      input_json: normalizedInput,
      status: 'pending',
      initiated_by_type: initiatedByType,
      initiated_by_user_id: initiatedByUserId ?? null,
      started_at: startedAt,
    })
    .select('id')
    .single();

  if (insertError || !invocation?.id) {
    console.error('[actions/executor] insert invocation', insertError);
    return { success: false, error: insertError?.message ?? 'Failed to log action' };
  }
  const invocationId = invocation.id;

  const context: ActionExecutionContext & { supabase: SupabaseClient } = {
    ...buildActionInvocationContext(organizationId, {
      agentId,
      conversationId,
      messageId,
      initiatedByType,
      initiatedByUserId,
    }),
    supabase,
  };

  try {
    const result = await action.execute(normalizedInput, context);
    const completedAt = new Date().toISOString();
    const success = result.success === true;
    await supabase
      .from('action_invocations')
      .update({
        status: success ? 'success' : 'failed',
        output_json: result,
        error_text: success ? null : (result.error ?? result.message ?? 'Unknown error'),
        completed_at: completedAt,
      })
      .eq('id', invocationId);

    if (success) {
      return { success: true, invocationId, output: result as Record<string, unknown> };
    }
    return { success: false, error: (result as { error?: string }).error ?? 'Action failed', invocationId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const completedAt = new Date().toISOString();
    await supabase
      .from('action_invocations')
      .update({
        status: 'failed',
        error_text: message,
        output_json: { success: false, error: message },
        completed_at: completedAt,
      })
      .eq('id', invocationId);
    return { success: false, error: message, invocationId };
  }
}
