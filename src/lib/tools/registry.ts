/**
 * Registry of available tools. Agents enable tools by id via enabled_tools array.
 */

import type { ToolDefinition } from './types';
import { searchKnowledge } from '@/lib/knowledge/search';

const TOOLS: ToolDefinition[] = [];

function register(tool: ToolDefinition) {
  TOOLS.push(tool);
}

// --- search_knowledge_base ---
register({
  id: 'search_knowledge_base',
  name: 'Search knowledge base',
  description: 'Search the organization knowledge base for relevant content. Use when the user asks about company info, products, docs, or anything that might be in uploaded knowledge.',
  parameters: [
    { name: 'query', type: 'string', description: 'Search query (natural language)', required: true },
    { name: 'max_results', type: 'number', description: 'Max number of chunks to return (default 5)', required: false },
  ],
  async execute(params, context) {
    const query = typeof params.query === 'string' ? params.query.trim() : '';
    if (!query) return { results: [], message: 'Empty query' };
    const maxResults = typeof params.max_results === 'number' && params.max_results > 0
      ? Math.min(params.max_results, 20)
      : 5;
    const matches = await searchKnowledge(context.supabase, {
      organizationId: context.organizationId,
      query,
      matchCount: maxResults,
    });
    return {
      results: matches.map((m) => ({
        content: m.content,
        source: m.source_name,
        document: m.document_title,
        similarity: m.similarity,
      })),
      count: matches.length,
    };
  },
});

// --- send_email ---
register({
  id: 'send_email',
  name: 'Send email',
  description: 'Send an email to a recipient. Use for follow-ups, notifications, or when the user asks to email someone.',
  parameters: [
    { name: 'to', type: 'string', description: 'Recipient email address', required: true },
    { name: 'subject', type: 'string', description: 'Email subject', required: true },
    { name: 'body', type: 'string', description: 'Plain text or HTML body', required: true },
  ],
  async execute(params) {
    const to = typeof params.to === 'string' ? params.to.trim().slice(0, 320) : '';
    const subject = typeof params.subject === 'string' ? params.subject.trim().slice(0, 500) : '';
    const body = typeof params.body === 'string' ? params.body.slice(0, 50000) : '';
    if (!to || !subject) return { success: false, error: 'Missing to or subject' };
    const Resend = (await import('resend')).Resend;
    const key = process.env.RESEND_API_KEY;
    if (!key) return { success: false, error: 'Email not configured' };
    const resend = new Resend(key);
    const from = process.env.RESEND_FROM_EMAIL || 'Spaxio Assistant <onboarding@resend.dev>';
    const { error } = await resend.emails.send({ from, to, subject, html: body || '', text: body || '' });
    if (error) return { success: false, error: error.message };
    return { success: true, message: 'Email sent' };
  },
});

// --- generate_lead_summary ---
register({
  id: 'generate_lead_summary',
  name: 'Generate lead summary',
  description: 'Generate a short summary of a lead or conversation for CRM or internal use.',
  parameters: [
    { name: 'conversation_summary', type: 'string', description: 'Brief summary of the conversation or lead', required: true },
    { name: 'contact_name', type: 'string', description: 'Contact name if known', required: false },
    { name: 'contact_email', type: 'string', description: 'Contact email if known', required: false },
  ],
  async execute(params) {
    const summary = typeof params.conversation_summary === 'string' ? params.conversation_summary.slice(0, 2000) : '';
    const name = typeof params.contact_name === 'string' ? params.contact_name.slice(0, 200) : '';
    const email = typeof params.contact_email === 'string' ? params.contact_email.slice(0, 320) : '';
    return {
      lead_summary: summary,
      contact_name: name || null,
      contact_email: email || null,
      generated_at: new Date().toISOString(),
    };
  },
});

// --- call_webhook ---
register({
  id: 'call_webhook',
  name: 'Call webhook',
  description: 'Send a POST request to an external webhook URL with a JSON body. Use for CRM or custom integrations.',
  parameters: [
    { name: 'url', type: 'string', description: 'Webhook URL (must be https in production)', required: true },
    { name: 'payload', type: 'object', description: 'JSON object to send in the body', required: false },
  ],
  async execute(params) {
    const url = typeof params.url === 'string' ? params.url.trim() : '';
    if (!url) return { success: false, error: 'Missing url' };
    try {
      const u = new URL(url);
      if (process.env.NODE_ENV === 'production' && u.protocol !== 'https:') {
        return { success: false, error: 'Only HTTPS URLs allowed in production' };
      }
    } catch {
      return { success: false, error: 'Invalid URL' };
    }
    const payload = params.payload != null && typeof params.payload === 'object' ? params.payload : {};
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    const text = await res.text();
    return {
      success: res.ok,
      status: res.status,
      body: text.slice(0, 2000),
    };
  },
});

// --- create_ticket ---
register({
  id: 'create_ticket',
  name: 'Create ticket',
  description: 'Create a support or internal ticket. Stores in the database for the organization (conversation-linked).',
  parameters: [
    { name: 'title', type: 'string', description: 'Ticket title', required: true },
    { name: 'description', type: 'string', description: 'Ticket description or body', required: false },
    { name: 'priority', type: 'string', description: 'Priority: low, medium, high', required: false },
  ],
  async execute(params, context) {
    const title = typeof params.title === 'string' ? params.title.trim().slice(0, 500) : '';
    if (!title) return { success: false, error: 'Missing title' };
    const description = typeof params.description === 'string' ? params.description.slice(0, 5000) : null;
    const priority = ['low', 'medium', 'high'].includes(String(params.priority)) ? params.priority : 'medium';
    const { data: ticket, error } = await context.supabase
      .from('support_tickets')
      .insert({
        organization_id: context.organizationId,
        conversation_id: context.conversationId ?? null,
        title,
        description,
        priority,
      })
      .select('id')
      .single();
    if (error) return { success: false, error: error.message };
    return { success: true, ticket_id: ticket?.id, message: 'Ticket created' };
  },
});

// --- handoff_to_human ---
register({
  id: 'handoff_to_human',
  name: 'Handoff to human',
  description: 'Mark the conversation for human handoff. Use when the user requests a human or the agent cannot help further.',
  parameters: [
    { name: 'reason', type: 'string', description: 'Brief reason for handoff', required: false },
  ],
  async execute(params, context) {
    const reason = typeof params.reason === 'string' ? params.reason.slice(0, 500) : 'Requested by user';
    if (context.conversationId) {
      const { data: conv } = await context.supabase
        .from('conversations')
        .select('metadata')
        .eq('id', context.conversationId)
        .single();
      const meta = (conv?.metadata as Record<string, unknown>) ?? {};
      await context.supabase
        .from('conversations')
        .update({
          metadata: {
            ...meta,
            handoff: true,
            handoff_reason: reason,
            handoff_at: new Date().toISOString(),
          },
        })
        .eq('id', context.conversationId);
    }
    return { success: true, message: 'Conversation marked for human handoff', reason };
  },
});

// --- capture_contact_info ---
register({
  id: 'capture_contact_info',
  name: 'Capture contact info',
  description: 'Save contact information (name, email, phone) as a lead for the organization.',
  parameters: [
    { name: 'name', type: 'string', description: 'Contact name', required: true },
    { name: 'email', type: 'string', description: 'Email address', required: true },
    { name: 'phone', type: 'string', description: 'Phone number', required: false },
    { name: 'message', type: 'string', description: 'Optional message or notes', required: false },
  ],
  async execute(params, context) {
    const name = typeof params.name === 'string' ? params.name.trim().slice(0, 500) : '';
    const email = typeof params.email === 'string' ? params.email.trim().slice(0, 500) : '';
    const phone = typeof params.phone === 'string' ? params.phone.trim().slice(0, 100) : null;
    const message = typeof params.message === 'string' ? params.message.slice(0, 2000) : null;
    if (!name || !email) return { success: false, error: 'Name and email required' };
    const { data: lead, error } = await context.supabase
      .from('leads')
      .insert({
        organization_id: context.organizationId,
        conversation_id: context.conversationId ?? null,
        name,
        email,
        phone,
        message,
      })
      .select('id')
      .single();
    if (error) return { success: false, error: error.message };
    return { success: true, lead_id: lead?.id, message: 'Contact captured' };
  },
});

// --- schedule_booking ---
register({
  id: 'schedule_booking',
  name: 'Schedule booking',
  description: 'Create an appointment. Use when the user wants to book a meeting, consultation, or call. Requires start_at and end_at as ISO date-time strings.',
  parameters: [
    { name: 'title', type: 'string', description: 'Appointment title', required: false },
    { name: 'start_at', type: 'string', description: 'Start time (ISO 8601)', required: true },
    { name: 'end_at', type: 'string', description: 'End time (ISO 8601)', required: true },
    { name: 'timezone', type: 'string', description: 'Timezone (e.g. UTC)', required: false },
    { name: 'description', type: 'string', description: 'Optional notes', required: false },
  ],
  async execute(params, context) {
    const title = typeof params.title === 'string' ? params.title.trim().slice(0, 500) : 'Appointment';
    const startAt = typeof params.start_at === 'string' ? params.start_at.trim() : '';
    const endAt = typeof params.end_at === 'string' ? params.end_at.trim() : '';
    if (!startAt || !endAt) return { success: false, error: 'start_at and end_at required' };
    const { createBooking } = await import('@/lib/bookings/service');
    const result = await createBooking(context.supabase, {
      organizationId: context.organizationId,
      title,
      startAt,
      endAt,
      timezone: typeof params.timezone === 'string' ? params.timezone.slice(0, 64) : 'UTC',
      conversationId: context.conversationId ?? undefined,
      agentId: context.agentId ?? undefined,
      description: typeof params.description === 'string' ? params.description.slice(0, 2000) : undefined,
      source: 'ai',
    });
    if (!result.success) return { success: false, error: result.error };
    return { success: true, booking_id: result.bookingId, message: result.message ?? 'Booking created' };
  },
});

// --- Export registry API ---
export function getTool(id: string): ToolDefinition | undefined {
  return TOOLS.find((t) => t.id === id);
}

export function getTools(ids?: string[]): ToolDefinition[] {
  if (!ids || ids.length === 0) return TOOLS;
  return TOOLS.filter((t) => ids.includes(t.id));
}

export function getAllTools(): ToolDefinition[] {
  return [...TOOLS];
}

export function getToolsSchemaForAgent(enabledIds: string[]): Array<{ id: string; name: string; description: string; parameters: ToolDefinition['parameters'] }> {
  return getTools(enabledIds.length ? enabledIds : undefined).map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));
}
