/**
 * Trigger AI follow-up run and persist to ai_follow_up_runs.
 * Call from widget/lead, widget/quote, or after lead qualification (fire-and-forget).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { generateFollowUpOutput } from './generate-follow-up';
import { recordAiActionUsage } from '@/lib/billing/usage';
import { hasExceededMonthlyAiActions } from '@/lib/entitlements';
import type { FollowUpGenerationInput, FollowUpSourceType } from './types';

export interface TriggerFollowUpOptions {
  organizationId: string;
  sourceType: FollowUpSourceType;
  sourceId: string;
  leadId?: string | null;
  contactId?: string | null;
  dealId?: string | null;
  context: FollowUpGenerationInput['context'];
}

export async function triggerFollowUpRun(
  supabase: SupabaseClient,
  options: TriggerFollowUpOptions
): Promise<string | null> {
  const { organizationId, sourceType, sourceId, leadId, contactId, dealId, context } = options;

  const exceeded = await hasExceededMonthlyAiActions(supabase, organizationId, false);
  if (exceeded) {
    console.warn('[follow-up] Skipping run: monthly AI action limit exceeded', { organizationId });
    return null;
  }

  const { data: run, error: insertErr } = await supabase
    .from('ai_follow_up_runs')
    .insert({
      organization_id: organizationId,
      source_type: sourceType,
      source_id: sourceId,
      lead_id: leadId ?? null,
      contact_id: contactId ?? null,
      deal_id: dealId ?? null,
      status: 'running',
    })
    .select('id')
    .single();

  if (insertErr || !run?.id) {
    console.warn('[follow-up] Failed to create run', { error: insertErr?.message });
    return null;
  }

  try {
    const output = await generateFollowUpOutput({
      organizationId,
      sourceType,
      sourceId,
      context,
    });

    await recordAiActionUsage(supabase, organizationId);

    await supabase
      .from('ai_follow_up_runs')
      .update({
        status: 'completed',
        generated_summary: output.summary,
        recommended_action: output.recommended_action,
        recommended_priority: output.recommended_priority,
        recommended_channel: output.recommended_channel,
        recommended_timing: output.recommended_timing,
        draft_email_subject: output.draft_email_subject ?? null,
        draft_email_body: output.draft_email_body ?? null,
        draft_note: output.draft_note ?? null,
        draft_task_title: output.draft_task_title ?? null,
        draft_task_description: output.draft_task_description ?? null,
        raw_model_output: {
          ...output,
          suggested_crm_stage: output.suggested_crm_stage,
        } as Record<string, unknown>,
      })
      .eq('id', run.id);

    return run.id;
  } catch (err) {
    console.warn('[follow-up] Generation failed', { runId: run.id, error: (err as Error).message });
    await supabase
      .from('ai_follow_up_runs')
      .update({
        status: 'failed',
        raw_model_output: { error: (err as Error).message },
      })
      .eq('id', run.id);
    return run.id;
  }
}
