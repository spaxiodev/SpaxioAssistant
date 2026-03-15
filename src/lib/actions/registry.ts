/**
 * AI Actions registry: action_key, description, input validation, and execution.
 * Used by the safe executor for audit and entitlement checks.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActionExecutionContext } from './context';
import type { AiActionKey } from '@/types/platform';

export type ActionInput = Record<string, unknown>;

export type ActionResult = { success: boolean; message?: string; [key: string]: unknown };

export type ActionHandler = (
  input: ActionInput,
  context: ActionExecutionContext & { supabase: SupabaseClient }
) => Promise<ActionResult>;

export type ActionDef = {
  key: AiActionKey | string;
  name: string;
  description: string;
  /** Sensitive actions may require confirmation (future: require_confirmation, human_review). */
  policy?: 'auto_execute' | 'require_confirmation' | 'human_review';
  /** Validate and normalize input; throw or return error message if invalid. */
  validate: (input: ActionInput) => { ok: true; input: ActionInput } | { ok: false; error: string };
  execute: ActionHandler;
};

const ACTIONS: ActionDef[] = [];

function register(action: ActionDef) {
  ACTIONS.push(action);
}

// --- Helpers for input validation (no zod dependency) ---
function str(input: unknown, maxLen: number): string {
  if (input == null) return '';
  return String(input).trim().slice(0, maxLen);
}
function strOpt(input: unknown, maxLen: number): string | null {
  const s = str(input, maxLen);
  return s || null;
}
function uuidOpt(input: unknown): string | null {
  if (input == null || input === '') return null;
  const s = String(input).trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s) ? s : null;
}

// --- create_lead ---
register({
  key: 'create_lead',
  name: 'Create lead',
  description: 'Create a new lead (name, email, phone, message).',
  policy: 'auto_execute',
  validate(input) {
    const name = str(input.name, 500);
    const email = str(input.email, 500);
    if (!name || !email) return { ok: false, error: 'Name and email required' };
    return {
      ok: true,
      input: {
        name,
        email: email,
        phone: strOpt(input.phone, 100),
        message: strOpt(input.message, 2000),
      },
    };
  },
  async execute(input, context) {
    const { data: lead, error } = await context.supabase
      .from('leads')
      .insert({
        organization_id: context.organizationId,
        conversation_id: context.conversationId ?? null,
        name: input.name as string,
        email: input.email as string,
        phone: (input.phone as string | null) ?? null,
        message: (input.message as string | null) ?? null,
      })
      .select('id')
      .single();
    if (error) return { success: false, error: error.message };
    return { success: true, lead_id: lead?.id, message: 'Lead created' };
  },
});

// --- update_lead ---
register({
  key: 'update_lead',
  name: 'Update lead',
  description: 'Update lead status or stage (lead_id required).',
  policy: 'auto_execute',
  validate(input) {
    const leadId = uuidOpt(input.lead_id);
    if (!leadId) return { ok: false, error: 'lead_id required' };
    return {
      ok: true,
      input: {
        lead_id: leadId,
        status: strOpt(input.status, 64) || undefined,
        stage: strOpt(input.stage, 64) || undefined,
      },
    };
  },
  async execute(input, context) {
    const leadId = input.lead_id as string;
    const updates: Record<string, unknown> = {};
    if (input.status != null) updates.status = input.status;
    if (input.stage != null) updates.stage = input.stage;
    if (Object.keys(updates).length === 0) return { success: true, message: 'No updates' };
    const { error } = await context.supabase.from('leads').update(updates).eq('id', leadId).eq('organization_id', context.organizationId);
    if (error) return { success: false, error: error.message };
    return { success: true, message: 'Lead updated' };
  },
});

// --- create_contact ---
register({
  key: 'create_contact',
  name: 'Create contact',
  description: 'Create a new contact (name, email, phone, optional company).',
  policy: 'auto_execute',
  validate(input) {
    const name = str(input.name, 500);
    if (!name) return { ok: false, error: 'Name required' };
    return {
      ok: true,
      input: {
        name,
        email: strOpt(input.email, 500),
        phone: strOpt(input.phone, 100),
        company_id: uuidOpt(input.company_id),
        lead_id: uuidOpt(input.lead_id),
      },
    };
  },
  async execute(input, context) {
    const { data: contact, error } = await context.supabase
      .from('contacts')
      .insert({
        organization_id: context.organizationId,
        name: input.name as string,
        email: (input.email as string | null) ?? null,
        phone: (input.phone as string | null) ?? null,
        company_id: (input.company_id as string | null) ?? null,
        lead_id: (input.lead_id as string | null) ?? null,
      })
      .select('id')
      .single();
    if (error) return { success: false, error: error.message };
    return { success: true, contact_id: contact?.id, message: 'Contact created' };
  },
});

// --- create_company ---
register({
  key: 'create_company',
  name: 'Create company',
  description: 'Create a new company record.',
  policy: 'auto_execute',
  validate(input) {
    const name = str(input.name, 500);
    if (!name) return { ok: false, error: 'Name required' };
    return { ok: true, input: { name, domain: strOpt(input.domain, 256) } };
  },
  async execute(input, context) {
    const { data: company, error } = await context.supabase
      .from('companies')
      .insert({
        organization_id: context.organizationId,
        name: input.name as string,
        domain: (input.domain as string | null) ?? null,
      })
      .select('id')
      .single();
    if (error) return { success: false, error: error.message };
    return { success: true, company_id: company?.id, message: 'Company created' };
  },
});

// --- create_deal ---
register({
  key: 'create_deal',
  name: 'Create deal',
  description: 'Create a new deal (title, optional contact/company, value, stage).',
  policy: 'auto_execute',
  validate(input) {
    const title = str(input.title, 500);
    if (!title) return { ok: false, error: 'Title required' };
    return {
      ok: true,
      input: {
        title,
        contact_id: uuidOpt(input.contact_id),
        company_id: uuidOpt(input.company_id),
        value_cents: typeof input.value_cents === 'number' ? input.value_cents : 0,
        stage: strOpt(input.stage, 64) || 'qualification',
      },
    };
  },
  async execute(input, context) {
    const stage = ['qualification', 'proposal', 'negotiation', 'won', 'lost'].includes(String(input.stage)) ? input.stage : 'qualification';
    const { data: deal, error } = await context.supabase
      .from('deals')
      .insert({
        organization_id: context.organizationId,
        title: input.title as string,
        contact_id: (input.contact_id as string | null) ?? null,
        company_id: (input.company_id as string | null) ?? null,
        value_cents: Number(input.value_cents) || 0,
        stage,
      })
      .select('id')
      .single();
    if (error) return { success: false, error: error.message };
    return { success: true, deal_id: deal?.id, message: 'Deal created' };
  },
});

// --- update_deal_stage ---
register({
  key: 'update_deal_stage',
  name: 'Update deal stage',
  description: 'Move a deal to a new stage (deal_id, stage).',
  policy: 'auto_execute',
  validate(input) {
    const dealId = uuidOpt(input.deal_id);
    const stage = str(input.stage, 64);
    if (!dealId || !stage) return { ok: false, error: 'deal_id and stage required' };
    if (!['qualification', 'proposal', 'negotiation', 'won', 'lost'].includes(stage)) return { ok: false, error: 'Invalid stage' };
    return { ok: true, input: { deal_id: dealId, stage } };
  },
  async execute(input, context) {
    const { error } = await context.supabase
      .from('deals')
      .update({ stage: input.stage as string })
      .eq('id', input.deal_id)
      .eq('organization_id', context.organizationId);
    if (error) return { success: false, error: error.message };
    return { success: true, message: 'Deal stage updated' };
  },
});

// --- create_ticket ---
register({
  key: 'create_ticket',
  name: 'Create support ticket',
  description: 'Create a support ticket (title, optional description, priority).',
  policy: 'auto_execute',
  validate(input) {
    const title = str(input.title, 500);
    if (!title) return { ok: false, error: 'Title required' };
    const priority = ['low', 'medium', 'high'].includes(String(input.priority)) ? input.priority : 'medium';
    return { ok: true, input: { title, description: strOpt(input.description, 5000), priority } };
  },
  async execute(input, context) {
    const { data: ticket, error } = await context.supabase
      .from('support_tickets')
      .insert({
        organization_id: context.organizationId,
        conversation_id: context.conversationId ?? null,
        title: input.title as string,
        description: (input.description as string | null) ?? null,
        priority: (input.priority as string) || 'medium',
      })
      .select('id')
      .single();
    if (error) return { success: false, error: error.message };
    return { success: true, ticket_id: ticket?.id, message: 'Ticket created' };
  },
});

// --- create_task ---
register({
  key: 'create_task',
  name: 'Create task',
  description: 'Create a task (title, optional due_at, assignee, link to lead/contact/deal/ticket).',
  policy: 'auto_execute',
  validate(input) {
    const title = str(input.title, 500);
    if (!title) return { ok: false, error: 'Title required' };
    return {
      ok: true,
      input: {
        title,
        due_at: typeof input.due_at === 'string' ? input.due_at : null,
        assignee_id: uuidOpt(input.assignee_id),
        lead_id: uuidOpt(input.lead_id),
        contact_id: uuidOpt(input.contact_id),
        deal_id: uuidOpt(input.deal_id),
        ticket_id: uuidOpt(input.ticket_id),
      },
    };
  },
  async execute(input, context) {
    const { data: task, error } = await context.supabase
      .from('tasks')
      .insert({
        organization_id: context.organizationId,
        title: input.title as string,
        due_at: (input.due_at as string | null) ?? null,
        assignee_id: (input.assignee_id as string | null) ?? null,
        lead_id: (input.lead_id as string | null) ?? null,
        contact_id: (input.contact_id as string | null) ?? null,
        deal_id: (input.deal_id as string | null) ?? null,
        ticket_id: (input.ticket_id as string | null) ?? null,
      })
      .select('id')
      .single();
    if (error) return { success: false, error: error.message };
    return { success: true, task_id: task?.id, message: 'Task created' };
  },
});

// --- add_note ---
register({
  key: 'add_note',
  name: 'Add note',
  description: 'Add a note to a lead, contact, deal, or ticket.',
  policy: 'auto_execute',
  validate(input) {
    const content = str(input.content, 10000);
    if (!content) return { ok: false, error: 'Content required' };
    const leadId = uuidOpt(input.lead_id);
    const contactId = uuidOpt(input.contact_id);
    const dealId = uuidOpt(input.deal_id);
    const ticketId = uuidOpt(input.ticket_id);
    if (!leadId && !contactId && !dealId && !ticketId) return { ok: false, error: 'At least one of lead_id, contact_id, deal_id, ticket_id required' };
    return { ok: true, input: { content, lead_id: leadId, contact_id: contactId, deal_id: dealId, ticket_id: ticketId } };
  },
  async execute(input, context) {
    const { data: note, error } = await context.supabase
      .from('notes')
      .insert({
        organization_id: context.organizationId,
        content: input.content as string,
        author_id: context.initiatedByUserId ?? null,
        lead_id: (input.lead_id as string | null) ?? null,
        contact_id: (input.contact_id as string | null) ?? null,
        deal_id: (input.deal_id as string | null) ?? null,
        ticket_id: (input.ticket_id as string | null) ?? null,
      })
      .select('id')
      .single();
    if (error) return { success: false, error: error.message };
    return { success: true, note_id: note?.id, message: 'Note added' };
  },
});

// --- send_email ---
register({
  key: 'send_email',
  name: 'Send email',
  description: 'Send an email (to, subject, body).',
  policy: 'require_confirmation',
  validate(input) {
    const to = str(input.to, 320);
    const subject = str(input.subject, 500);
    if (!to || !subject) return { ok: false, error: 'To and subject required' };
    return { ok: true, input: { to, subject, body: str(input.body ?? '', 50000) } };
  },
  async execute(input) {
    const Resend = (await import('resend')).Resend;
    const key = process.env.RESEND_API_KEY;
    if (!key) return { success: false, error: 'Email not configured' };
    const resend = new Resend(key);
    const from = process.env.RESEND_FROM_EMAIL || 'Spaxio Assistant <onboarding@resend.dev>';
    const { error } = await resend.emails.send({
      from,
      to: input.to as string,
      subject: input.subject as string,
      html: (input.body as string) || '',
      text: (input.body as string) || '',
    });
    if (error) return { success: false, error: error.message };
    return { success: true, message: 'Email sent' };
  },
});

// --- escalate_to_human ---
register({
  key: 'escalate_to_human',
  name: 'Escalate to human',
  description: 'Mark conversation for human handoff.',
  policy: 'auto_execute',
  validate(input) {
    return { ok: true, input: { reason: strOpt(input.reason, 500) || 'Requested by user' } };
  },
  async execute(input, context) {
    const reason = (input.reason as string) || 'Requested by user';
    if (context.conversationId) {
      const { data: conv } = await context.supabase.from('conversations').select('metadata').eq('id', context.conversationId).single();
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
      await context.supabase.from('escalation_events').insert({
        organization_id: context.organizationId,
        conversation_id: context.conversationId,
        reason,
        escalated_by_type: context.initiatedByType === 'ai' ? 'ai' : 'user',
        escalated_by_user_id: context.initiatedByUserId,
        status: 'pending',
      });
    }
    return { success: true, message: 'Conversation escalated to human', reason };
  },
});

// --- schedule_booking --- (delegates to bookings service)
register({
  key: 'schedule_booking',
  name: 'Schedule booking',
  description: 'Create an appointment (title, start_at, end_at, optional contact/lead, timezone).',
  policy: 'require_confirmation',
  validate(input) {
    const title = str(input.title, 500) || 'Appointment';
    const startAt = typeof input.start_at === 'string' ? input.start_at : null;
    const endAt = typeof input.end_at === 'string' ? input.end_at : null;
    if (!startAt || !endAt) return { ok: false, error: 'start_at and end_at required (ISO strings)' };
    return {
      ok: true,
      input: {
        title,
        start_at: startAt,
        end_at: endAt,
        timezone: strOpt(input.timezone, 64) || 'UTC',
        contact_id: uuidOpt(input.contact_id),
        lead_id: uuidOpt(input.lead_id),
        description: strOpt(input.description, 2000),
      },
    };
  },
  async execute(input, context) {
    const { createBooking } = await import('@/lib/bookings/service');
    const result = await createBooking(context.supabase, {
      organizationId: context.organizationId,
      conversationId: context.conversationId ?? undefined,
      agentId: context.agentId ?? undefined,
      title: input.title as string,
      startAt: input.start_at as string,
      endAt: input.end_at as string,
      timezone: (input.timezone as string) || 'UTC',
      contactId: (input.contact_id as string | null) ?? undefined,
      leadId: (input.lead_id as string | null) ?? undefined,
      description: (input.description as string | null) ?? undefined,
      source: 'ai',
    });
    if (!result.success) return { success: false, error: result.error };
    return { success: true, booking_id: result.bookingId, message: result.message ?? 'Booking created' };
  },
});

// --- call_webhook ---
register({
  key: 'call_webhook',
  name: 'Call webhook',
  description: 'POST to an external URL with JSON payload.',
  policy: 'require_confirmation',
  validate(input) {
    const url = str(input.url, 2000);
    if (!url) return { ok: false, error: 'URL required' };
    return { ok: true, input: { url, payload: input.payload != null && typeof input.payload === 'object' ? input.payload : {} } };
  },
  async execute(input) {
    try {
      const u = new URL(input.url as string);
      if (process.env.NODE_ENV === 'production' && u.protocol !== 'https:') {
        return { success: false, error: 'Only HTTPS in production' };
      }
    } catch {
      return { success: false, error: 'Invalid URL' };
    }
    const res = await fetch(input.url as string, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input.payload ?? {}),
      signal: AbortSignal.timeout(10000),
    });
    const text = await res.text();
    return { success: res.ok, status: res.status, body: text.slice(0, 2000) };
  },
});

// --- tag_conversation ---
register({
  key: 'tag_conversation',
  name: 'Tag conversation',
  description: 'Add a tag to the current conversation.',
  policy: 'auto_execute',
  validate(input) {
    const tag = str(input.tag, 100);
    if (!tag) return { ok: false, error: 'Tag required' };
    return { ok: true, input: { tag } };
  },
  async execute(input, context) {
    if (!context.conversationId) return { success: false, error: 'No conversation' };
    const { error } = await context.supabase.from('conversation_tags').insert({
      conversation_id: context.conversationId,
      tag: input.tag as string,
    });
    if (error) {
      if (error.code === '23505') return { success: true, message: 'Tag already present' };
      return { success: false, error: error.message };
    }
    return { success: true, message: 'Tag added' };
  },
});

// --- assign_conversation ---
register({
  key: 'assign_conversation',
  name: 'Assign conversation',
  description: 'Assign the conversation to a team member (assignee_id).',
  policy: 'auto_execute',
  validate(input) {
    const assigneeId = uuidOpt(input.assignee_id);
    if (!assigneeId) return { ok: false, error: 'assignee_id required' };
    return { ok: true, input: { assignee_id: assigneeId } };
  },
  async execute(input, context) {
    if (!context.conversationId) return { success: false, error: 'No conversation' };
    const { error } = await context.supabase.from('conversation_assignments').insert({
      conversation_id: context.conversationId,
      assignee_id: input.assignee_id as string,
      assigned_by_id: context.initiatedByUserId,
    });
    if (error) return { success: false, error: error.message };
    return { success: true, message: 'Conversation assigned' };
  },
});

// --- generate_quote_request --- (creates quote_requests row; full flow may exist in widget)
register({
  key: 'generate_quote_request',
  name: 'Generate quote request',
  description: 'Create a quote request from conversation (customer_name, service_type, details).',
  policy: 'auto_execute',
  validate(input) {
    const customerName = str(input.customer_name, 500);
    if (!customerName) return { ok: false, error: 'customer_name required' };
    return {
      ok: true,
      input: {
        customer_name: customerName,
        service_type: strOpt(input.service_type, 500),
        project_details: strOpt(input.project_details, 2000),
        dimensions_size: strOpt(input.dimensions_size, 500),
        location: strOpt(input.location, 500),
        notes: strOpt(input.notes, 2000),
      },
    };
  },
  async execute(input, context) {
    const { data: qr, error } = await context.supabase
      .from('quote_requests')
      .insert({
        organization_id: context.organizationId,
        conversation_id: context.conversationId ?? null,
        customer_name: input.customer_name as string,
        service_type: (input.service_type as string | null) ?? null,
        project_details: (input.project_details as string | null) ?? null,
        dimensions_size: (input.dimensions_size as string | null) ?? null,
        location: (input.location as string | null) ?? null,
        notes: (input.notes as string | null) ?? null,
      })
      .select('id')
      .single();
    if (error) return { success: false, error: error.message };
    return { success: true, quote_request_id: qr?.id, message: 'Quote request created' };
  },
});

// --- trigger_automation --- (emit event for automation engine)
register({
  key: 'trigger_automation',
  name: 'Trigger automation',
  description: 'Emit an event to trigger automations (event_type, optional payload).',
  policy: 'auto_execute',
  validate(input) {
    const eventType = str(input.event_type, 128);
    if (!eventType) return { ok: false, error: 'event_type required' };
    return { ok: true, input: { event_type: eventType, payload: input.payload ?? {} } };
  },
  async execute(input, context) {
    const { emitAutomationEvent } = await import('@/lib/automations/engine');
    const eventType = input.event_type as string;
    await emitAutomationEvent(context.supabase, {
      organization_id: context.organizationId,
      event_type: eventType,
      payload: {
        trigger_type: eventType,
        conversation_id: context.conversationId ?? undefined,
        ...((input.payload as Record<string, unknown>) ?? {}),
      },
    });
    return { success: true, message: 'Event emitted' };
  },
});

// --- generate_document --- (placeholder: link to document_templates)
register({
  key: 'generate_document',
  name: 'Generate document',
  description: 'Generate a document from a template (template_id, variables, link to lead/contact/deal).',
  policy: 'auto_execute',
  validate(input) {
    const templateId = uuidOpt(input.template_id);
    if (!templateId) return { ok: false, error: 'template_id required' };
    return {
      ok: true,
      input: {
        template_id: templateId,
        name: str(input.name, 500) || 'Generated Document',
        variables: input.variables != null && typeof input.variables === 'object' ? input.variables : {},
        lead_id: uuidOpt(input.lead_id),
        contact_id: uuidOpt(input.contact_id),
        deal_id: uuidOpt(input.deal_id),
      },
    };
  },
  async execute(input, context) {
    const { data: tpl } = await context.supabase
      .from('document_templates')
      .select('id, content')
      .eq('id', input.template_id)
      .eq('organization_id', context.organizationId)
      .single();
    if (!tpl) return { success: false, error: 'Template not found' };
    let content = (tpl.content as string) || '';
    const vars = (input.variables as Record<string, string>) ?? {};
    for (const [k, v] of Object.entries(vars)) {
      content = content.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g'), String(v));
    }
    const { data: doc, error } = await context.supabase
      .from('documents')
      .insert({
        organization_id: context.organizationId,
        template_id: input.template_id as string,
        name: (input.name as string) || 'Generated Document',
        content,
        lead_id: (input.lead_id as string | null) ?? null,
        contact_id: (input.contact_id as string | null) ?? null,
        deal_id: (input.deal_id as string | null) ?? null,
      })
      .select('id')
      .single();
    if (error) return { success: false, error: error.message };
    return { success: true, document_id: doc?.id, message: 'Document generated' };
  },
});

// --- create_follow_up_reminder --- (create a task with due_at)
register({
  key: 'create_follow_up_reminder',
  name: 'Create follow-up reminder',
  description: 'Create a task as a follow-up reminder (title, due_at or in_days).',
  policy: 'auto_execute',
  validate(input) {
    const title = str(input.title, 500);
    if (!title) return { ok: false, error: 'Title required' };
    let dueAt: string | null = typeof input.due_at === 'string' ? input.due_at : null;
    if (!dueAt && typeof input.in_days === 'number') {
      const d = new Date();
      d.setDate(d.getDate() + input.in_days);
      dueAt = d.toISOString();
    }
    return { ok: true, input: { title, due_at: dueAt, lead_id: uuidOpt(input.lead_id), contact_id: uuidOpt(input.contact_id) } };
  },
  async execute(input, context) {
    const { data: task, error } = await context.supabase
      .from('tasks')
      .insert({
        organization_id: context.organizationId,
        title: input.title as string,
        due_at: (input.due_at as string | null) ?? null,
        lead_id: (input.lead_id as string | null) ?? null,
        contact_id: (input.contact_id as string | null) ?? null,
      })
      .select('id')
      .single();
    if (error) return { success: false, error: error.message };
    return { success: true, task_id: task?.id, message: 'Follow-up reminder created' };
  },
});

// --- Export ---
export function getAction(key: string): ActionDef | undefined {
  return ACTIONS.find((a) => a.key === key);
}

export function getActions(keys?: string[]): ActionDef[] {
  if (!keys || keys.length === 0) return [...ACTIONS];
  return ACTIONS.filter((a) => keys.includes(a.key));
}

export function getAllActions(): ActionDef[] {
  return [...ACTIONS];
}

export function getActionKeys(): string[] {
  return ACTIONS.map((a) => a.key);
}
