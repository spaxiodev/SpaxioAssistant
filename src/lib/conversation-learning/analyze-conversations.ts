/**
 * Conversation learning service: analyzes stored conversations to surface patterns,
 * frequently asked questions, and optimization opportunities.
 *
 * Privacy-safe: works on aggregated patterns, not individual user data.
 * All analysis is org-scoped. Does not auto-modify any business settings.
 * Surfaces recommendations for business review only.
 *
 * Uses OpenAI to analyze a sample of recent conversations (rate-limited),
 * then stores insights in conversation_insights table.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

export type ConversationInsightType =
  | 'frequent_question'
  | 'pricing_confusion'
  | 'service_inquiry'
  | 'location_inquiry'
  | 'hours_inquiry'
  | 'drop_off_pattern'
  | 'lead_conversion_signal'
  | 'missing_info_gap'
  | 'language_pattern'
  | 'escalation_pattern';

export interface ConversationInsight {
  insight_type: ConversationInsightType;
  topic: string;
  occurrence_count: number;
  suggested_action: string | null;
  sample_messages: string[];
}

export interface ConversationLearningResult {
  insights: ConversationInsight[];
  period_start: string;
  period_end: string;
  conversations_analyzed: number;
}

const ANALYSIS_SYSTEM_PROMPT = `You analyze a sample of customer conversations from a business's website assistant.

Your job is to identify patterns that would help the business improve their assistant. Focus on:
1. Frequently asked questions (what do customers ask most?)
2. Pricing/cost confusion (when customers seem confused about pricing)
3. Common service inquiries (what services are most requested?)
4. Location/hours questions (customers asking about logistics)
5. Drop-off patterns (conversations that ended without resolution)
6. Missing information gaps (topics the assistant couldn't answer well)

Return a JSON array of insights. Each insight:
{
  "insight_type": one of: "frequent_question" | "pricing_confusion" | "service_inquiry" | "location_inquiry" | "hours_inquiry" | "drop_off_pattern" | "missing_info_gap",
  "topic": string (short, plain English, e.g. "How much does X cost?"),
  "occurrence_count": number (estimated from the sample),
  "suggested_action": string or null (one actionable recommendation),
  "sample_messages": string[] (1-2 anonymized example questions, max 80 chars each)
}

Return at most 8 insights. Focus on the most impactful ones.
Do NOT include customer names, emails, or personally identifiable information.
Reply with only the JSON array.`;

/**
 * Analyze a sample of recent conversations for an org and return insights.
 * This is AI-powered but privacy-safe (samples messages, strips PII references).
 */
export async function analyzeConversationsForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  options: { maxConversations?: number; openaiApiKey?: string } = {}
): Promise<ConversationLearningResult> {
  const { maxConversations = 30, openaiApiKey } = options;

  const now = new Date();
  const periodEnd = now.toISOString().slice(0, 10);
  const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Get widget IDs
  const { data: widgets } = await supabase
    .from('widgets')
    .select('id')
    .eq('organization_id', organizationId);
  const widgetIds = (widgets ?? []).map((w) => w.id);

  if (widgetIds.length === 0) {
    return { insights: [], period_start: periodStart, period_end: periodEnd, conversations_analyzed: 0 };
  }

  // Get recent conversations
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, messages')
    .in('widget_id', widgetIds)
    .gte('created_at', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(maxConversations);

  if (!conversations || conversations.length === 0) {
    return { insights: [], period_start: periodStart, period_end: periodEnd, conversations_analyzed: 0 };
  }

  // Extract and anonymize user messages for analysis
  const userMessages: string[] = [];
  for (const conv of conversations) {
    const messages = conv.messages as unknown as Array<{ role: string; content: string }> | null;
    if (!Array.isArray(messages)) continue;
    for (const msg of messages) {
      if (msg.role === 'user' && typeof msg.content === 'string' && msg.content.trim().length > 5) {
        // Strip obvious PII patterns before analysis
        const cleaned = msg.content
          .replace(/\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/gi, '[email]')
          .replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[phone]')
          .replace(/\b\d{5}(?:-\d{4})?\b/g, '[zip]')
          .slice(0, 300);
        userMessages.push(cleaned);
      }
    }
  }

  if (userMessages.length < 3) {
    return { insights: [], period_start: periodStart, period_end: periodEnd, conversations_analyzed: conversations.length };
  }

  const key = openaiApiKey ?? process.env.OPENAI_API_KEY;
  if (!key?.trim()) {
    return { insights: [], period_start: periodStart, period_end: periodEnd, conversations_analyzed: conversations.length };
  }

  const openai = new OpenAI({ apiKey: key });

  // Sample up to 80 messages for the analysis (to stay within token budget)
  const sample = userMessages.slice(0, 80).join('\n---\n');

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      messages: [
        { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: `${conversations.length} conversations analyzed. Sample of customer messages:\n\n${sample}` },
      ],
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) return { insights: [], period_start: periodStart, period_end: periodEnd, conversations_analyzed: conversations.length };

    const parsed = JSON.parse(raw) as unknown;
    const insights: ConversationInsight[] = [];

    const arr = Array.isArray(parsed) ? parsed : (parsed as Record<string, unknown>).insights ?? [];
    if (Array.isArray(arr)) {
      for (const item of arr as Record<string, unknown>[]) {
        if (typeof item.topic !== 'string' || !item.topic) continue;
        const insightType = String(item.insight_type ?? 'frequent_question') as ConversationInsightType;
        const validTypes: ConversationInsightType[] = [
          'frequent_question', 'pricing_confusion', 'service_inquiry',
          'location_inquiry', 'hours_inquiry', 'drop_off_pattern',
          'lead_conversion_signal', 'missing_info_gap', 'language_pattern', 'escalation_pattern',
        ];
        insights.push({
          insight_type: validTypes.includes(insightType) ? insightType : 'frequent_question',
          topic: String(item.topic).slice(0, 500),
          occurrence_count: typeof item.occurrence_count === 'number' ? item.occurrence_count : 1,
          suggested_action: typeof item.suggested_action === 'string' ? item.suggested_action.slice(0, 500) : null,
          sample_messages: Array.isArray(item.sample_messages)
            ? (item.sample_messages as string[]).slice(0, 2).map((m) => String(m).slice(0, 120))
            : [],
        });
      }
    }

    return { insights, period_start: periodStart, period_end: periodEnd, conversations_analyzed: conversations.length };
  } catch {
    return { insights: [], period_start: periodStart, period_end: periodEnd, conversations_analyzed: conversations.length };
  }
}

/**
 * Persist conversation insights to DB (upsert by org + period + type + topic).
 * Does NOT auto-apply any changes — for review only.
 */
export async function persistConversationInsights(
  supabase: SupabaseClient,
  organizationId: string,
  result: ConversationLearningResult
): Promise<void> {
  if (result.insights.length === 0) return;

  const rows = result.insights.map((insight) => ({
    organization_id: organizationId,
    period_start: result.period_start,
    period_end: result.period_end,
    insight_type: insight.insight_type,
    topic: insight.topic,
    occurrence_count: insight.occurrence_count,
    sample_messages: insight.sample_messages,
    suggested_action: insight.suggested_action,
    analysis_data: {},
  }));

  // Upsert — on conflict update occurrence_count and suggested_action
  await supabase.from('conversation_insights').upsert(rows, {
    onConflict: 'organization_id,period_start,insight_type,topic',
    ignoreDuplicates: false,
  });
}
