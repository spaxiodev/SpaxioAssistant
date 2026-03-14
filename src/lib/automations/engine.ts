/**
 * Event-driven automation engine: receive events, match active automations, execute runs.
 * Does not depend only on chatbot; supports form, webhook, manual, and future schedule triggers.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AutomationEventEnvelope, AutomationRunInput } from './types';
import { isValidTriggerType } from './types';
import { runAutomation } from './runner';
import type { Automation } from '@/lib/supabase/database.types';

export type EmitEventInput = {
  organization_id: string;
  /** Event type that automations subscribe to (trigger_type). Use TRIGGER_TYPES values. */
  event_type: string;
  payload: AutomationRunInput;
  trace_id?: string;
  correlation_id?: string;
  source?: string;
  actor?: { type: string; id?: string; email?: string };
  metadata?: Record<string, unknown>;
};

/**
 * Emit an event and run all active automations that match the event type.
 * Safe to call from widget/lead, widget/chat, form ingestion, webhook route, etc.
 * Runs are executed sequentially; failures do not block other automations.
 */
export async function emitAutomationEvent(
  supabase: SupabaseClient,
  input: EmitEventInput
): Promise<{ runIds: string[]; errors: { automationId: string; message: string }[] }> {
  const {
    organization_id,
    event_type,
    payload,
    trace_id,
    correlation_id,
    source = 'internal',
    actor,
    metadata,
  } = input;

  const runIds: string[] = [];
  const errors: { automationId: string; message: string }[] = [];

  if (!isValidTriggerType(event_type)) {
    console.warn('[automations/engine] invalid event_type', { event_type });
    return { runIds, errors: [{ automationId: '', message: 'Invalid event_type' }] };
  }

  const { data: automations, error: fetchError } = await supabase
    .from('automations')
    .select('id, organization_id, name, trigger_type, trigger_config, action_type, action_config, agent_id')
    .eq('organization_id', organization_id)
    .eq('status', 'active')
    .eq('trigger_type', event_type)
    .order('created_at', { ascending: true });

  if (fetchError) {
    console.error('[automations/engine] fetch automations', fetchError);
    return { runIds, errors: [{ automationId: '', message: fetchError.message }] };
  }

  const list = (automations ?? []) as Pick<
    Automation,
    'id' | 'organization_id' | 'name' | 'trigger_type' | 'trigger_config' | 'action_type' | 'action_config' | 'agent_id'
  >[];

  const runInput: AutomationRunInput = {
    ...payload,
    trigger_type: event_type,
  };

  const envelope: AutomationEventEnvelope = {
    workspace_id: organization_id,
    source,
    event_type,
    timestamp: new Date().toISOString(),
    actor,
    metadata,
    payload: runInput,
    trace_id,
    correlation_id,
  };

  for (const automation of list) {
    try {
      const result = await runAutomation({
        automation,
        input: runInput,
        supabase,
        eventEnvelope: envelope,
      });
      runIds.push(result.runId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[automations/engine] run failed', { automationId: automation.id, message });
      errors.push({ automationId: automation.id, message });
    }
  }

  return { runIds, errors };
}
