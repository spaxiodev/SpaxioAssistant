/**
 * Server-side AI document generation. Produces business-ready draft content
 * (quote, proposal, lead summary, conversation summary, follow-up summary).
 */

import OpenAI from 'openai';
import type { GenerateDocumentInput, GeneratedDocument, GenerationType } from './types';

const QUOTE_DRAFT_PROMPT = `You generate a professional quote draft for a business. Use the provided context. Output a single document with these sections (use clear headings):
1. Customer/Project Info - name, contact, project summary
2. Scope Overview - what is included
3. Assumptions - any conditions or assumptions
4. Estimated Pricing - use "[To be quoted]" or placeholders if exact pricing unavailable; otherwise brief line items
5. Next Steps - what happens next

Write in professional tone. Output only the document body, no meta-commentary.`;

const PROPOSAL_DRAFT_PROMPT = `You generate a professional proposal draft. Use the provided context. Include:
1. Client Overview - who they are and what they need
2. Identified Needs - summary of requirements
3. Recommended Solution - what you propose
4. Deliverables - what they will get
5. Implementation Overview - how/when
6. Next Steps

Write in professional tone. Output only the document body.`;

const LEAD_SUMMARY_PROMPT = `You write a concise lead summary for internal use. Include:
1. Customer intent - what they want
2. Key facts - contact, service, timeline, location, budget if known
3. Urgency - how time-sensitive
4. Budget - if mentioned
5. Recommended sales approach - one short paragraph

Be concise. Output only the document body.`;

const CONVERSATION_SUMMARY_PROMPT = `You summarize a customer conversation for internal use. Include:
1. What the customer asked
2. What was answered or agreed
3. Unresolved questions
4. Recommended follow-up

Be concise. Output only the document body.`;

const FOLLOW_UP_SUMMARY_PROMPT = `You write a short follow-up summary document for a customer interaction. Include what happened, what was promised or suggested, and clear next steps. Be concise. Output only the document body.`;

function getSystemPrompt(type: GenerationType): string {
  switch (type) {
    case 'quote_draft':
      return QUOTE_DRAFT_PROMPT;
    case 'proposal_draft':
      return PROPOSAL_DRAFT_PROMPT;
    case 'lead_summary':
      return LEAD_SUMMARY_PROMPT;
    case 'conversation_summary':
      return CONVERSATION_SUMMARY_PROMPT;
    case 'follow_up_summary':
      return FOLLOW_UP_SUMMARY_PROMPT;
    default:
      return LEAD_SUMMARY_PROMPT;
  }
}

function getDefaultName(type: GenerationType, context: GenerateDocumentInput['context']): string {
  const leadName = context.lead?.name ?? context.quoteRequest?.customer_name ?? 'Customer';
  const date = new Date().toISOString().slice(0, 10);
  switch (type) {
    case 'quote_draft':
      return `Quote draft – ${leadName} – ${date}`;
    case 'proposal_draft':
      return `Proposal – ${leadName} – ${date}`;
    case 'lead_summary':
      return `Lead summary – ${leadName} – ${date}`;
    case 'conversation_summary':
      return `Conversation summary – ${date}`;
    case 'follow_up_summary':
      return `Follow-up summary – ${leadName} – ${date}`;
    default:
      return `Document – ${date}`;
  }
}

function buildContextBlock(input: GenerateDocumentInput): string {
  const parts: string[] = [];
  const { context } = input;
  if (context.businessName) parts.push(`Business: ${context.businessName}`);
  if (context.industry) parts.push(`Industry: ${context.industry}`);
  if (context.servicesOffered?.length) parts.push(`Services: ${context.servicesOffered.join(', ')}`);
  if (context.lead) {
    const l = context.lead;
    parts.push(
      'Lead:',
      `Name: ${l.name}, Email: ${l.email}`,
      l.phone ? `Phone: ${l.phone}` : '',
      l.requested_service ? `Service: ${l.requested_service}` : '',
      l.requested_timeline ? `Timeline: ${l.requested_timeline}` : '',
      l.project_details ? `Project: ${l.project_details}` : '',
      l.location ? `Location: ${l.location}` : '',
      l.message ? `Message: ${l.message}` : '',
      l.qualification_summary ? `Qualification: ${l.qualification_summary}` : ''
    );
  }
  if (context.quoteRequest) {
    const q = context.quoteRequest;
    parts.push(
      'Quote request:',
      `Customer: ${q.customer_name}`,
      q.service_type ? `Service: ${q.service_type}` : '',
      q.project_details ? `Details: ${q.project_details}` : '',
      q.dimensions_size ? `Dimensions: ${q.dimensions_size}` : '',
      q.location ? `Location: ${q.location}` : '',
      q.budget_text ? `Budget: ${q.budget_text}` : '',
      q.budget_amount != null ? `Budget amount: ${q.budget_amount}` : '',
      q.notes ? `Notes: ${q.notes}` : ''
    );
  }
  if (context.deal) {
    parts.push(`Deal: ${context.deal.title}, Stage: ${context.deal.stage}`);
  }
  if (context.conversationSummary) {
    parts.push('Conversation summary:', context.conversationSummary);
  }
  return parts.filter(Boolean).join('\n').slice(0, 8000);
}

export async function generateDocumentContent(input: GenerateDocumentInput): Promise<GeneratedDocument> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) throw new Error('OPENAI_API_KEY not configured');

  const openai = new OpenAI({ apiKey });
  const systemPrompt = getSystemPrompt(input.generationType);
  const userContent = buildContextBlock(input);

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent || 'No context provided.' },
    ],
    max_tokens: 2000,
  });

  const content = completion.choices[0]?.message?.content?.trim() ?? '';
  const name = getDefaultName(input.generationType, input.context);

  return {
    name: name.slice(0, 500),
    content: content.slice(0, 100_000),
    generationType: input.generationType,
  };
}
