/**
 * Agent-native workflow execution: run an agent for classification, summarization,
 * lead scoring, or data extraction with optional knowledge context.
 * Used by automation runner for qualify_lead_with_agent and future agent steps.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getChatCompletion } from '@/lib/ai/provider';
import { buildSystemPromptForAgent, type BusinessSettingsContext } from '@/lib/assistant/prompt';
import { searchKnowledge } from '@/lib/knowledge/search';
import type { AutomationRunInput } from './types';

export type AgentWorkflowTask =
  | 'qualify_lead'
  | 'summarize'
  | 'extract_data'
  | 'classify_urgency'
  | 'score_lead';

export type RunAgentForWorkflowParams = {
  organizationId: string;
  agentId: string | null;
  task: AgentWorkflowTask;
  context: AutomationRunInput;
  supabase: SupabaseClient;
  /** If true, inject relevant knowledge chunks into context (query from lead/message). */
  useKnowledge?: boolean;
  /** Max knowledge chunks to inject (default 5). */
  knowledgeCount?: number;
};

export type RunAgentForWorkflowResult = {
  success: boolean;
  content: string;
  /** Parsed JSON when task expects structured output (e.g. score_lead). */
  structured?: Record<string, unknown>;
  error?: string;
};

function buildTaskPrompt(task: AgentWorkflowTask, context: AutomationRunInput): string {
  const lead = context.lead;
  const parts: string[] = [];
  if (lead?.name) parts.push(`Name: ${lead.name}`);
  if (lead?.email) parts.push(`Email: ${lead.email}`);
  if (lead?.phone) parts.push(`Phone: ${lead.phone}`);
  if (lead?.message) parts.push(`Message: ${lead.message}`);
  const leadText = parts.length ? parts.join('\n') : 'No lead details provided.';
  const payloadSnippet =
    typeof context.conversation_id === 'string'
      ? `Conversation ID: ${context.conversation_id}`
      : '';

  switch (task) {
    case 'qualify_lead':
      return `You are qualifying a lead for the business. Based on the following lead information, provide a short assessment (2-4 sentences): interest level (hot/warm/cold), suggested next step, and any red flags or opportunities.

${leadText}
${payloadSnippet}

Reply with the assessment only, no preamble.`;
    case 'summarize':
      return `Summarize the following lead or conversation for internal use. Be concise (3-5 sentences). Focus on: who they are, what they want, and recommended next action.

${leadText}
${payloadSnippet}

Reply with the summary only.`;
    case 'score_lead':
      return `Score this lead for sales priority. Reply with ONLY a JSON object (no other text) with keys: score (number 1-10), label (string: "hot", "warm", or "cold"), reason (string, one sentence).

${leadText}

Example: {"score":8,"label":"hot","reason":"Asked for quote and provided contact details."}`;
    case 'classify_urgency':
      return `Classify the urgency of this inquiry for support routing. Reply with ONLY a JSON object: urgency ("low"|"medium"|"high"|"critical"), reason (one sentence).

${leadText}

Example: {"urgency":"high","reason":"Customer reported broken product."}`;
    case 'extract_data':
      return `Extract structured data from this lead or message. Reply with a JSON object containing any of: name, email, phone, company, service_requested, budget_mention, timeline_mention. Use null for missing fields.

${leadText}
${payloadSnippet}

Reply with only the JSON object.`;
    default:
      return `Review the following and provide a brief, actionable response:\n\n${leadText}`;
  }
}

/**
 * Run an agent for a workflow step. Loads agent + business settings, optionally
 * enriches with knowledge search, and returns completion (and parsed structured output when applicable).
 */
export async function runAgentForWorkflow({
  organizationId,
  agentId,
  task,
  context,
  supabase,
  useKnowledge = true,
  knowledgeCount = 5,
}: RunAgentForWorkflowParams): Promise<RunAgentForWorkflowResult> {
  try {
    let agent: { id: string; system_prompt: string | null; model_provider: string; model_id: string; temperature: number } | null = null;
    if (agentId) {
      const { data } = await supabase
        .from('agents')
        .select('id, system_prompt, model_provider, model_id, temperature')
        .eq('id', agentId)
        .eq('organization_id', organizationId)
        .single();
      agent = data ?? null;
    }

    const { data: settings } = await supabase
      .from('business_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    const businessContext = settings as BusinessSettingsContext | null;
    const systemPrompt = agent
      ? buildSystemPromptForAgent(agent, businessContext)
      : `${buildSystemPromptForAgent({ system_prompt: null, role_type: '' }, businessContext)}\n\nYou are helping with an internal workflow task.`;

    let knowledgeBlock = '';
    if (useKnowledge && organizationId) {
      const query =
        context.lead?.message?.trim() ||
        context.lead?.name?.trim() ||
        [context.lead?.email, context.lead?.phone].filter(Boolean).join(' ') ||
        'services and pricing';
      const chunks = await searchKnowledge(supabase, {
        organizationId,
        query: query.slice(0, 500),
        matchCount: knowledgeCount,
      });
      if (chunks.length > 0) {
        knowledgeBlock =
          '\n\nRelevant knowledge (use to inform your response):\n' +
          chunks.map((c) => c.content).join('\n---\n');
      }
    }

    const userContent = buildTaskPrompt(task, context) + knowledgeBlock;
    const provider = agent?.model_provider ?? 'openai';
    const modelId = agent?.model_id ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
    const temperature = agent?.temperature ?? 0.5;

    const result = await getChatCompletion(provider, modelId, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ], { max_tokens: 600, temperature });

    const content = result.content?.trim() ?? '';
    let structured: Record<string, unknown> | undefined;
    if (task === 'score_lead' || task === 'classify_urgency' || task === 'extract_data') {
      try {
        const parsed = JSON.parse(content) as Record<string, unknown>;
        if (parsed && typeof parsed === 'object') structured = parsed;
      } catch {
        // keep content as-is, no structured
      }
    }

    return { success: true, content, structured };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Agent execution failed';
    return { success: false, content: '', error };
  }
}
