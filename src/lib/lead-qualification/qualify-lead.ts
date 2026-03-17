/**
 * Server-side AI lead qualification: analyze lead + transcript, return score, priority, summary, recommended stage.
 */

import OpenAI from 'openai';
import type { LeadQualificationResult } from './types';

const SYSTEM_PROMPT = `You analyze leads (name, email, message, service requested, timeline, project details, location) and optionally a short transcript snippet from a website assistant.

Your main job is to give a clear PRIORITY and a SHORT SUMMARY that a small business owner can understand at a glance.

Return a JSON object with exactly these keys:
- score: number 0-100 (100 = ready to buy, 0 = cold/incomplete)
- priority: "low" | "medium" | "high"
- summary: 1-2 short sentences in plain language summarizing who this lead is and what they want
- service_or_project_type: string or null
- urgency: string or null (e.g. "immediate", "this month", "exploring")
- budget_mentioned: string or null (exact phrase if any)
- location: string or null
- sentiment_intent: string or null (e.g. "ready to buy", "comparing options", "information only")
- recommended_deal_stage: string or null (e.g. "qualified", "proposal", "negotiation", "new")
- estimated_deal_value: number or null (only if clearly stated; otherwise null)
- next_recommended_action: string or null (one short sentence for the sales team, e.g. "Call today" or "Email a quote this week")

Use only the provided data. Do not invent contact details. Reply with only the JSON, no markdown.`;

export async function qualifyLeadWithAI(
  payload: {
    name: string;
    email: string;
    phone?: string | null;
    message?: string | null;
    requested_service?: string | null;
    requested_timeline?: string | null;
    project_details?: string | null;
    location?: string | null;
    transcript_snippet?: string | null;
  },
  openaiApiKey?: string
): Promise<LeadQualificationResult> {
  const key = openaiApiKey ?? process.env.OPENAI_API_KEY;
  if (!key?.trim()) throw new Error('OPENAI_API_KEY not configured');

  const openai = new OpenAI({ apiKey: key });
  const text = [
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    payload.phone ? `Phone: ${payload.phone}` : '',
    payload.message ? `Message: ${payload.message}` : '',
    payload.requested_service ? `Service: ${payload.requested_service}` : '',
    payload.requested_timeline ? `Timeline: ${payload.requested_timeline}` : '',
    payload.project_details ? `Project: ${payload.project_details}` : '',
    payload.location ? `Location: ${payload.location}` : '',
    payload.transcript_snippet ? `Transcript snippet:\n${payload.transcript_snippet}` : '',
  ]
    .filter(Boolean)
    .join('\n')
    .slice(0, 4000);

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: text || 'No details provided.' },
    ],
    max_tokens: 600,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error('Empty qualification response');

  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const score = typeof parsed.score === 'number' ? Math.max(0, Math.min(100, Math.round(parsed.score))) : 50;
  const priorityRaw = String(parsed.priority ?? 'medium').toLowerCase();
  const priority: LeadQualificationResult['priority'] =
    priorityRaw === 'high' || priorityRaw === 'low' ? priorityRaw : 'medium';

  return {
    score,
    priority,
    summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 2000) : '',
    raw: parsed,
    service_or_project_type: typeof parsed.service_or_project_type === 'string' ? parsed.service_or_project_type.slice(0, 500) : null,
    urgency: typeof parsed.urgency === 'string' ? parsed.urgency.slice(0, 200) : null,
    budget_mentioned: typeof parsed.budget_mentioned === 'string' ? parsed.budget_mentioned.slice(0, 500) : null,
    location: typeof parsed.location === 'string' ? parsed.location.slice(0, 500) : null,
    sentiment_intent: typeof parsed.sentiment_intent === 'string' ? parsed.sentiment_intent.slice(0, 300) : null,
    recommended_deal_stage: typeof parsed.recommended_deal_stage === 'string' ? parsed.recommended_deal_stage.slice(0, 100) : null,
    estimated_deal_value:
      typeof parsed.estimated_deal_value === 'number' && Number.isFinite(parsed.estimated_deal_value)
        ? parsed.estimated_deal_value
        : null,
    next_recommended_action: typeof parsed.next_recommended_action === 'string' ? parsed.next_recommended_action.slice(0, 500) : null,
  };
}
