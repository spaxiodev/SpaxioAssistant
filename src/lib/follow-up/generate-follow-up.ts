/**
 * Server-side AI follow-up generation. Analyzes lead/quote/conversation context
 * and produces structured follow-up recommendations (summary, action, drafts).
 */

import OpenAI from 'openai';
import type { FollowUpGenerationInput, FollowUpModelOutput } from './types';

const SYSTEM_PROMPT_BASE = `You are a sales and customer success assistant. Given context about a new lead, quote request, or conversation milestone, produce a concise follow-up plan.

Return a JSON object with exactly these keys (all strings unless noted):
- summary: 1-3 sentence plain-language summary of what happened and why it matters.
- recommended_action: One clear next step for the business (e.g. "Reply with a personalized quote within 24h").
- recommended_priority: "low" | "medium" | "high"
- recommended_channel: How to reach them (e.g. "email", "phone", "in-app message").
- recommended_timing: When to act (e.g. "within 24 hours", "this week").
- draft_email_subject: Optional subject line for a follow-up email.
- draft_email_body: Optional short draft body (2-4 sentences). Do not auto-send; this is for review.
- draft_note: Optional internal note to add to CRM (what happened, what to do).
- draft_task_title: Optional task title (e.g. "Follow up with [Name] about roofing quote").
- draft_task_description: Optional task description.
- suggested_crm_stage: Optional stage name if moving deal/lead (e.g. "qualified", "proposal").

Safety requirements:
- Use only the provided context. Do not invent contact details, pricing, policies, guarantees, or legal/compliance claims.
- Do not promise bookings, timelines, or outcomes unless explicitly supported by the provided business context.
- If critical details are missing, ask for those details in the draft instead of guessing.
- Keep tone professional, concise, and non-robotic.
- Do not include empty greetings or placeholders.

Use only the provided context. Be concise and business-relevant.
Reply with only the JSON, no markdown or explanation.`;

function buildUserContent(input: FollowUpGenerationInput): string {
  const parts: string[] = [];
  if (input.context.lead) {
    const l = input.context.lead;
    parts.push(
      'Lead:',
      `Name: ${l.name}`,
      `Email: ${l.email}`,
      l.phone ? `Phone: ${l.phone}` : '',
      l.message ? `Message: ${l.message}` : '',
      l.requested_service ? `Service: ${l.requested_service}` : '',
      l.requested_timeline ? `Timeline: ${l.requested_timeline}` : '',
      l.project_details ? `Project: ${l.project_details}` : '',
      l.location ? `Location: ${l.location}` : '',
      l.transcript_snippet ? `Transcript snippet:\n${l.transcript_snippet}` : '',
      l.qualification_summary ? `AI qualification summary: ${l.qualification_summary}` : '',
      l.qualification_priority ? `Priority: ${l.qualification_priority}` : '',
      l.next_recommended_action ? `Next action (from qual): ${l.next_recommended_action}` : ''
    );
  }
  if (input.context.quoteRequest) {
    const q = input.context.quoteRequest;
    parts.push(
      'Quote request:',
      `Customer: ${q.customer_name}`,
      q.service_type ? `Service: ${q.service_type}` : '',
      q.project_details ? `Details: ${q.project_details}` : '',
      q.budget_text ? `Budget (text): ${q.budget_text}` : '',
      q.budget_amount != null ? `Budget (amount): ${q.budget_amount}` : '',
      q.location ? `Location: ${q.location}` : '',
      q.notes ? `Notes: ${q.notes}` : ''
    );
  }
  if (input.context.conversationSnippet) {
    parts.push('Conversation snippet:', input.context.conversationSnippet);
  }
  if (input.context.businessName) {
    parts.push(`Business: ${input.context.businessName}`);
  }
  if (input.context.industry) {
    parts.push(`Industry: ${input.context.industry}`);
  }
  if (input.context.businessDescription) {
    parts.push(`Business description: ${input.context.businessDescription}`);
  }
  if (input.context.toneOfVoice) {
    parts.push(`Preferred tone: ${input.context.toneOfVoice}`);
  }
  if (Array.isArray(input.context.services) && input.context.services.length > 0) {
    parts.push(`Services: ${input.context.services.join(', ')}`);
  }
  if (input.context.pricingNotes) {
    parts.push(`Pricing notes (do not invent beyond this): ${input.context.pricingNotes}`);
  }
  if (input.context.faq && typeof input.context.faq === 'object') {
    parts.push(`FAQ context: ${JSON.stringify(input.context.faq).slice(0, 1500)}`);
  }
  parts.push(`Source: ${input.sourceType}`, `Source ID: ${input.sourceId}`);
  return parts.filter(Boolean).join('\n').slice(0, 6000);
}

function parseAndValidate(raw: string): FollowUpModelOutput {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const priority = String(parsed.recommended_priority ?? 'medium').toLowerCase();
  const validPriority = priority === 'high' || priority === 'low' ? priority : 'medium';
  return {
    summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 2000) : 'No summary.',
    recommended_action: typeof parsed.recommended_action === 'string' ? parsed.recommended_action.slice(0, 500) : 'Follow up with the customer.',
    recommended_priority: validPriority,
    recommended_channel: typeof parsed.recommended_channel === 'string' ? parsed.recommended_channel.slice(0, 100) : 'email',
    recommended_timing: typeof parsed.recommended_timing === 'string' ? parsed.recommended_timing.slice(0, 200) : 'soon',
    draft_email_subject: typeof parsed.draft_email_subject === 'string' ? parsed.draft_email_subject.slice(0, 300) : undefined,
    draft_email_body: typeof parsed.draft_email_body === 'string' ? parsed.draft_email_body.slice(0, 2000) : undefined,
    draft_note: typeof parsed.draft_note === 'string' ? parsed.draft_note.slice(0, 2000) : undefined,
    draft_task_title: typeof parsed.draft_task_title === 'string' ? parsed.draft_task_title.slice(0, 500) : undefined,
    draft_task_description: typeof parsed.draft_task_description === 'string' ? parsed.draft_task_description.slice(0, 1000) : undefined,
    suggested_crm_stage: typeof parsed.suggested_crm_stage === 'string' ? parsed.suggested_crm_stage.slice(0, 100) : undefined,
  };
}

export async function generateFollowUpOutput(input: FollowUpGenerationInput): Promise<FollowUpModelOutput> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) throw new Error('OPENAI_API_KEY not configured');

  const openai = new OpenAI({ apiKey });
  const userContent = buildUserContent(input);

  const customerLang = (input.context.customerLanguage ?? input.context.businessDefaultLanguage ?? 'en')
    .toString()
    .toLowerCase()
    .slice(0, 2);
  const businessLang = (input.context.businessDefaultLanguage ?? customerLang).toString().toLowerCase().slice(0, 2);

  const languageBlock = `Language output requirements:
- Write internal fields (summary, recommended_action, draft_note, draft_task_title, draft_task_description, suggested_crm_stage) in business language: "${businessLang}".
- Write customer-facing email fields (draft_email_subject, draft_email_body) in customer language: "${customerLang}".
- Do not mix languages inside a single field.
- If "${customerLang}" and "${businessLang}" are different, keep them separate as specified above.`;

  const systemPrompt = `${SYSTEM_PROMPT_BASE}

${languageBlock}`;

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent || 'No context provided.' },
    ],
    max_tokens: 800,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error('Empty follow-up response');
  return parseAndValidate(raw);
}
