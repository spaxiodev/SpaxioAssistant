/**
 * Centralized usage metering for billing enforcement.
 * Uses Supabase RPC for atomic increment per billing period; optional usage_events log for audit.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type UsageMetric = 'message_count' | 'ai_action_count';

export type IncrementUsageParams = {
  organizationId: string;
  metric: UsageMetric;
  amount?: number;
  source?: string;
  sourceId?: string | null;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string | null;
};

/** Current billing period (calendar month). */
export function getCurrentUsagePeriod(): { period_start: string; period_end: string } {
  const now = new Date();
  const period_start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const period_end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { period_start, period_end };
}

/** Increment usage: calls RPC and optionally logs to usage_events (when source/idempotencyKey provided). */
export async function incrementUsage(
  supabase: SupabaseClient,
  params: IncrementUsageParams
): Promise<void> {
  const { organizationId, metric, amount = 1, source, sourceId, metadata, idempotencyKey } = params;
  if (metric === 'message_count') {
    for (let i = 0; i < amount; i++) {
      await supabase.rpc('increment_org_usage_messages', { org_id: organizationId });
    }
  } else {
    for (let i = 0; i < amount; i++) {
      await supabase.rpc('increment_org_usage_ai_actions', { org_id: organizationId });
    }
  }
  if (source != null || idempotencyKey != null) {
    const { period_start, period_end } = getCurrentUsagePeriod();
    await supabase.from('usage_events').insert({
      organization_id: organizationId,
      metric,
      amount,
      source: source ?? null,
      source_id: sourceId ?? null,
      metadata: metadata ?? {},
      usage_period_start: period_start,
      usage_period_end: period_end,
      idempotency_key: idempotencyKey ?? null,
    }).select('id').maybeSingle();
  }
}

/** Record one message (widget/AI page chat). Uses RPC only for performance. */
export async function recordMessageUsage(
  supabase: SupabaseClient,
  organizationId: string
): Promise<void> {
  await supabase.rpc('increment_org_usage_messages', { org_id: organizationId });
}

/** Record one AI action (tool call, doc gen, follow-up, etc.). Uses RPC only for performance. */
export async function recordAiActionUsage(
  supabase: SupabaseClient,
  organizationId: string
): Promise<void> {
  await supabase.rpc('increment_org_usage_ai_actions', { org_id: organizationId });
}
