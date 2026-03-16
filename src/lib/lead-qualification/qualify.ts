/**
 * Lead qualification: public API used by widget/lead and widget/chat.
 * Calls qualifyLeadWithAI and updates the lead row.
 * Optionally creates a deal for high-priority leads.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { qualifyLeadWithAI } from './qualify-lead';
import type { LeadQualificationResult } from './types';

export { qualifyLeadWithAI as qualifyLeadWithAi };

const DEAL_STAGES = ['qualification', 'proposal', 'negotiation', 'won', 'lost'] as const;

/** If lead is high priority, optionally create/find contact and create a deal. */
export async function maybeCreateDealForHighPriorityLead(
  supabase: SupabaseClient,
  organizationId: string,
  lead: { name: string; email: string; phone?: string | null },
  result: LeadQualificationResult
): Promise<void> {
  if (result.priority !== 'high') return;
  const email = lead.email?.trim();
  const name = (lead.name?.trim()) || 'Unknown';
  if (!email) return;

  let contactId: string | null = null;
  const { data: existing } = await supabase
    .from('contacts')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('email', email)
    .limit(1)
    .maybeSingle();
  if (existing?.id) {
    contactId = existing.id;
  } else {
    const { data: newContact } = await supabase
      .from('contacts')
      .insert({
        organization_id: organizationId,
        name,
        email,
        phone: lead.phone ?? null,
      })
      .select('id')
      .single();
    contactId = newContact?.id ?? null;
  }
  if (!contactId) return;

  const stage = result.recommended_deal_stage?.trim();
  const validStage = stage && DEAL_STAGES.includes(stage as (typeof DEAL_STAGES)[number]) ? stage : 'qualification';
  const valueCents =
    typeof result.estimated_deal_value === 'number' && Number.isFinite(result.estimated_deal_value)
      ? Math.round(result.estimated_deal_value * 100)
      : 0;
  const title = `Deal: ${name}`.slice(0, 500);

  await supabase.from('deals').insert({
    organization_id: organizationId,
    contact_id: contactId,
    title,
    value_cents: valueCents,
    stage: validStage,
  });
}

export async function updateLeadWithQualification(
  supabase: SupabaseClient,
  leadId: string,
  _organizationId: string,
  result: LeadQualificationResult
): Promise<unknown> {
  return supabase
    .from('leads')
    .update({
      qualification_score: result.score,
      qualification_priority: result.priority,
      qualification_summary: result.summary,
      qualification_raw: result.raw as Record<string, unknown>,
      qualified_at: new Date().toISOString(),
      recommended_deal_stage: result.recommended_deal_stage ?? null,
      estimated_deal_value: result.estimated_deal_value ?? null,
      next_recommended_action: result.next_recommended_action ?? null,
    })
    .eq('id', leadId);
}
