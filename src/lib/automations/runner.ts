/**
 * Automation execution foundation.
 * Creates runs, executes actions, updates status. All execution is native to Spaxio.
 */

import { Resend } from 'resend';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AutomationRunInput, AutomationRunOutput } from './types';
import type { AutomationEventEnvelope } from './types';
import type { Automation } from '@/lib/supabase/database.types';
import { runAgentForWorkflow } from './agent-workflow';
import { getAutomationNotificationEmail } from '@/lib/email';
import { executeFollowUpAction } from '@/lib/follow-up/email';
import { canUseAiFollowUp, canUseFollowUpDrafts, canUseFollowUpEmails } from '@/lib/entitlements';

export interface RunAutomationParams {
  automation: Pick<
    Automation,
    'id' | 'organization_id' | 'name' | 'trigger_type' | 'trigger_config' | 'action_type' | 'action_config' | 'agent_id'
  >;
  input: AutomationRunInput;
  supabase: SupabaseClient;
  /** Optional event context for run observability (trace_id, trigger_event_type, etc.). */
  eventEnvelope?: AutomationEventEnvelope;
}

function getResend() {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

/** Resolve "from" address: Resend does not allow Gmail etc.; use fallback if needed. */
function getFromEmail(): string {
  const rawFrom = process.env.RESEND_FROM_EMAIL || '';
  const freeEmailDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'icloud.com'];
  const fromDomain = rawFrom.includes('@') ? rawFrom.split('@')[1]?.toLowerCase() : '';
  const isFreeEmail = fromDomain ? freeEmailDomains.some((d) => fromDomain === d || fromDomain.endsWith('.' + d)) : false;
  return rawFrom && !isFreeEmail ? rawFrom : 'Spaxio Assistant <onboarding@resend.dev>';
}

async function resolveNotificationEmail(
  supabase: SupabaseClient,
  organizationId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('business_settings')
    .select('lead_notification_email, contact_email')
    .eq('organization_id', organizationId)
    .single();
  const email = data?.lead_notification_email || data?.contact_email;
  return typeof email === 'string' && email.trim() ? email.trim() : null;
}


/** Replace {{key}} in template with input[key] or input.lead[key]. */
function interpolateBody(template: string, input: AutomationRunInput): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) => {
    const parts = path.split('.');
    let v: unknown = parts[0] === 'lead' ? input.lead : (input as Record<string, unknown>)[parts[0]];
    for (let i = 1; i < parts.length && v != null; i++) v = (v as Record<string, unknown>)[parts[i]];
    return v != null ? String(v) : '';
  });
}

const MAX_ERROR_MESSAGE_LENGTH = 500;
const WEBHOOK_URL_MAX_LENGTH = 2048;

/** Sanitize error message for storage: cap length, avoid leaking internals. */
function sanitizeErrorMessage(message: string): string {
  const trimmed = String(message).trim().slice(0, MAX_ERROR_MESSAGE_LENGTH);
  return trimmed || 'Action execution failed';
}

/** Validate webhook URL: must be http(s), reasonable length. Reject file:, localhost in production. */
function isValidWebhookUrl(url: string): boolean {
  if (url.length === 0 || url.length > WEBHOOK_URL_MAX_LENGTH) return false;
  const lower = url.toLowerCase();
  if (!lower.startsWith('https://') && !lower.startsWith('http://')) return false;
  if (process.env.NODE_ENV === 'production' && (lower.includes('localhost') || lower.startsWith('http://127.'))) {
    return false;
  }
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Start an automation run: insert run as 'running', execute action, then set 'success' or 'failed'.
 * When eventEnvelope is provided, run row is filled with organization_id, trigger_event_type, trace_id, etc.
 */
export async function runAutomation({
  automation,
  input,
  supabase,
  eventEnvelope,
}: RunAutomationParams): Promise<{ runId: string; status: 'success' | 'failed'; output: AutomationRunOutput }> {
  const startedAt = new Date().toISOString();
  const insertRow: Record<string, unknown> = {
    automation_id: automation.id,
    status: 'running',
    input_payload: input as unknown as Record<string, unknown>,
  };
  if (eventEnvelope) {
    insertRow.organization_id = eventEnvelope.workspace_id;
    insertRow.event_id = eventEnvelope.id ?? null;
    insertRow.trigger_event_type = eventEnvelope.event_type;
    insertRow.trace_id = eventEnvelope.trace_id ?? null;
    insertRow.correlation_id = eventEnvelope.correlation_id ?? null;
  }

  const { data: run, error: insertError } = await supabase
    .from('automation_runs')
    .insert(insertRow as Record<string, never>)
    .select('id')
    .single();

  if (insertError || !run) {
    throw new Error(insertError?.message ?? 'Failed to create automation run');
  }

  let output: AutomationRunOutput = {};
  let status: 'success' | 'failed' = 'success';
  let errorMessage: string | null = null;

  try {
    const { data: steps } = await supabase
      .from('automation_steps')
      .select('id, step_order, step_type, step_name, config_json, condition_json')
      .eq('automation_id', automation.id)
      .order('step_order', { ascending: true });

    if (steps && steps.length > 0) {
      const stepResult = await executeSteps(run.id, automation, steps, input, supabase);
      output = stepResult.output;
      status = stepResult.status;
      errorMessage = stepResult.errorMessage;
    } else {
      output = await executeAction(automation, input, supabase);
    }
  } catch (err) {
    status = 'failed';
    const raw = err instanceof Error ? err.message : 'Action execution failed';
    errorMessage = sanitizeErrorMessage(raw);
    output = { success: false, message: errorMessage };
  }

  const completedAt = new Date().toISOString();
  const durationMs = eventEnvelope
    ? Math.round((new Date(completedAt).getTime() - new Date(startedAt).getTime()))
    : null;
  const summary =
    status === 'success' && output.action_executed
      ? `${output.action_executed}${output.message ? `: ${String(output.message).slice(0, 200)}` : ''}`
      : errorMessage ?? null;

  const updateRow: Record<string, unknown> = {
    status,
    output_payload: output as unknown as Record<string, unknown>,
    error_message: errorMessage,
    completed_at: completedAt,
  };
  if (eventEnvelope) {
    updateRow.duration_ms = durationMs;
    updateRow.summary = summary;
  }

  await supabase
    .from('automation_runs')
    .update(updateRow as Record<string, never>)
    .eq('id', run.id);

  return { runId: run.id, status, output };
}

type StepRow = {
  id: string;
  step_order: number;
  step_type: string;
  step_name: string | null;
  config_json: unknown;
  condition_json: unknown;
};

/** Execute multi-step workflow; write run_steps and return final output. */
async function executeSteps(
  runId: string,
  automation: Pick<
    Automation,
    'id' | 'organization_id' | 'name' | 'action_type' | 'action_config' | 'agent_id'
  >,
  steps: StepRow[],
  input: AutomationRunInput,
  supabase: SupabaseClient
): Promise<{ output: AutomationRunOutput; status: 'success' | 'failed'; errorMessage: string | null }> {
  let lastOutput: AutomationRunOutput = {};
  let status: 'success' | 'failed' = 'success';
  let errorMessage: string | null = null;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const { data: stepRun } = await supabase
      .from('automation_run_steps')
      .insert({
        run_id: runId,
        step_id: step.id,
        step_order: step.step_order,
        step_type: step.step_type,
        status: 'running',
        started_at: new Date().toISOString(),
        input_payload: input as unknown as Record<string, unknown>,
      })
      .select('id')
      .single();

    if (!stepRun?.id) continue;

    let stepStatus: 'success' | 'failed' | 'skipped' = 'success';
    let stepOutput: AutomationRunOutput = {};
    let stepError: string | null = null;

    try {
      if (step.step_type === 'action') {
        const cfg = (step.config_json as Record<string, unknown>) ?? {};
        const actionType = typeof cfg.action_type === 'string' ? cfg.action_type : automation.action_type;
        const actionConfig = (cfg.action_config as Record<string, unknown>) ?? (automation.action_config as Record<string, unknown>) ?? {};
        const virtual = {
          organization_id: automation.organization_id,
          name: automation.name,
          action_type: actionType,
          action_config: actionConfig,
          agent_id: automation.agent_id,
        };
        stepOutput = await executeAction(
          virtual as Pick<Automation, 'organization_id' | 'name' | 'action_type' | 'action_config' | 'agent_id'>,
          input,
          supabase
        );
      } else if (step.step_type === 'delay') {
        const cfg = (step.config_json as Record<string, unknown>) ?? {};
        const seconds = typeof cfg.delay_seconds === 'number' && cfg.delay_seconds > 0
          ? Math.min(cfg.delay_seconds, 300)
          : typeof cfg.delay_minutes === 'number' && cfg.delay_minutes > 0
            ? Math.min(cfg.delay_minutes * 60, 300)
            : 0;
        if (seconds > 0) {
          await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
        }
        stepOutput = { action_executed: 'delay', delay_seconds: seconds };
      } else if (step.step_type === 'branch_if') {
        const cond = (step.condition_json as Record<string, unknown>) ?? {};
        const path = String(cond.path ?? '').trim();
        const expected = cond.value;
        let actual: unknown = input;
        if (path) {
          const parts = path.split('.');
          for (const p of parts) {
            actual = (actual as Record<string, unknown>)?.[p];
          }
        }
        const pass = actual === expected || (typeof expected === 'string' && String(actual) === expected);
        if (!pass) {
          stepStatus = 'skipped';
          stepOutput = { branch_taken: false, skipped: true };
        } else {
          stepOutput = { branch_taken: true };
        }
      } else if (step.step_type === 'human_approval') {
        await supabase.from('support_tickets').insert({
          organization_id: automation.organization_id,
          title: `Approval: ${automation.name}`,
          description: `Automation run requires human approval. Input: ${JSON.stringify(input).slice(0, 500)}`,
          priority: 'medium',
          status: 'open',
        });
        stepOutput = { action_executed: 'human_approval', ticket_created: true };
      }
      lastOutput = stepOutput;
    } catch (err) {
      stepStatus = 'failed';
      stepError = err instanceof Error ? err.message : 'Step failed';
      errorMessage = sanitizeErrorMessage(stepError);
      status = 'failed';
      lastOutput = { success: false, message: errorMessage };
    }

    await supabase
      .from('automation_run_steps')
      .update({
        status: stepStatus,
        completed_at: new Date().toISOString(),
        output_payload: stepOutput as unknown as Record<string, unknown>,
        error_message: stepError,
      })
      .eq('id', stepRun.id);

    if (step.step_type === 'human_approval') break;
    if (stepStatus === 'failed') break;
  }

  // After all steps succeed, run the automation's main action (e.g. send email, webhook).
  if (status === 'success') {
    try {
      const actionOutput = await executeAction(automation, input, supabase);
      lastOutput = { ...lastOutput, ...actionOutput };
    } catch (err) {
      status = 'failed';
      errorMessage = err instanceof Error ? err.message : 'Final action failed';
      lastOutput = { ...lastOutput, success: false, message: errorMessage };
    }
  }

  return { output: lastOutput, status, errorMessage };
}

/**
 * Execute the configured action. Placeholder implementations; extend for real integrations.
 */
async function executeAction(
  automation: Pick<
    Automation,
    'organization_id' | 'name' | 'action_type' | 'action_config' | 'agent_id'
  >,
  input: AutomationRunInput,
  supabase: SupabaseClient
): Promise<AutomationRunOutput> {
  const config = (automation.action_config as Record<string, unknown>) ?? {};

  switch (automation.action_type) {
    case 'qualify_lead_with_agent': {
      const agentResult = await runAgentForWorkflow({
        organizationId: automation.organization_id,
        agentId: automation.agent_id,
        task: 'qualify_lead',
        context: input,
        supabase,
        useKnowledge: true,
        knowledgeCount: 5,
      });
      if (!agentResult.success) {
        return {
          action_executed: 'qualify_lead_with_agent',
          success: false,
          message: agentResult.error ?? 'Agent qualification failed',
        };
      }
      return {
        action_executed: 'qualify_lead_with_agent',
        success: true,
        message: 'Lead qualified',
        agent_summary: agentResult.content.slice(0, 500),
        structured: agentResult.structured,
      };
    }

    case 'send_email_notification': {
      const toEmail =
        typeof config.to_email === 'string' && config.to_email.trim()
          ? config.to_email.trim()
          : await resolveNotificationEmail(supabase, automation.organization_id);
      if (!toEmail) {
        return {
          action_executed: 'send_email_notification',
          success: false,
          message: 'No recipient: set "Notification email" in automation action or in Business settings (Contact / Lead notification email).',
        };
      }
      const resend = getResend();
      if (!resend) {
        return {
          action_executed: 'send_email_notification',
          success: false,
          message: 'Email not configured (RESEND_API_KEY missing).',
        };
      }
      const subject =
        typeof config.subject === 'string' && config.subject.trim()
          ? config.subject.trim()
          : `Automation: ${automation.name || 'notification'}`;
      const bodyTemplate =
        typeof config.body === 'string' && config.body.trim()
          ? config.body.trim()
          : null;

      let html: string | undefined;
      let text: string;

      if (bodyTemplate) {
        text = interpolateBody(bodyTemplate, input);
      } else {
        const { data: settings } = await supabase
          .from('business_settings')
          .select('business_name')
          .eq('organization_id', automation.organization_id)
          .single();
        const { html: emailHtml, text: emailText } = getAutomationNotificationEmail({
          input,
          automationName: automation.name ?? undefined,
          businessName: settings?.business_name ?? undefined,
        });
        html = emailHtml;
        text = emailText;
      }

      const from = getFromEmail();
      const { data, error } = await resend.emails.send({
        from,
        to: [toEmail],
        subject,
        html: html ?? text,
        text,
      });
      if (error) {
        console.error('[automations] Resend error:', error);
        return {
          action_executed: 'send_email_notification',
          success: false,
          message: error.message || 'Failed to send email',
        };
      }
      return {
        action_executed: 'send_email_notification',
        success: true,
        message: 'Email sent',
        external_id: data?.id,
      };
    }

    case 'call_webhook':
    case 'call_external_url': {
      const url = typeof config.url === 'string' ? config.url.trim() : null;
      if (!url) {
        return {
          action_executed: automation.action_type,
          success: false,
          message: 'No webhook URL configured',
        };
      }
      if (!isValidWebhookUrl(url)) {
        return {
          action_executed: automation.action_type,
          success: false,
          message: 'Invalid webhook URL: use https (or http in development) and a valid URL',
        };
      }
      const timeoutMs = typeof config.timeout_seconds === 'number' && config.timeout_seconds > 0
        ? Math.min(config.timeout_seconds * 1000, 60_000)
        : 15_000;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Spaxio-Source': 'automation',
        ...(config.headers && typeof config.headers === 'object'
          ? Object.fromEntries(
              Object.entries(config.headers).filter(
                (e): e is [string, string] => typeof e[0] === 'string' && typeof e[1] === 'string'
              )
            )
          : {}),
      };
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(url, {
          method: (config.method as string) || 'POST',
          headers,
          body: JSON.stringify(input),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const statusText = res.statusText || String(res.status);
        return {
          action_executed: automation.action_type,
          success: res.ok,
          message: res.ok ? `Webhook returned ${res.status}` : `Webhook failed: ${res.status} ${statusText}`,
          response_status: res.status,
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Webhook request failed';
        const isTimeout = e instanceof Error && e.name === 'AbortError';
        return {
          action_executed: automation.action_type,
          success: false,
          message: isTimeout ? `Webhook timeout after ${timeoutMs / 1000}s` : msg,
        };
      }
    }

    case 'crm_create_contact':
    case 'crm_add_note': {
      const crmUrl = typeof config.crm_webhook_url === 'string' ? config.crm_webhook_url.trim() : null;
      if (!crmUrl || !isValidWebhookUrl(crmUrl)) {
        return {
          action_executed: automation.action_type,
          success: false,
          message: 'Configure CRM webhook URL in action config (e.g. HubSpot, Pipedrive webhook).',
        };
      }
      const body =
        automation.action_type === 'crm_create_contact'
          ? { event: 'contact.create', lead: input.lead, ...input }
          : { event: 'contact.note', lead: input.lead, note: config.note ?? input.lead?.message, ...input };
      try {
        const res = await fetch(crmUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        return {
          action_executed: automation.action_type,
          success: res.ok,
          message: res.ok ? `CRM webhook ${res.status}` : `CRM webhook failed: ${res.status}`,
        };
      } catch (e) {
        return {
          action_executed: automation.action_type,
          success: false,
          message: e instanceof Error ? sanitizeErrorMessage(e.message) : 'CRM webhook request failed',
        };
      }
    }

    case 'handoff_to_human':
      // TODO: Create support_ticket or notify team
      return {
        action_executed: 'handoff_to_human',
        success: true,
        message: 'Handoff placeholder (create ticket or notify team)',
      };

    case 'save_lead_record':
      // TODO: Insert into leads or external CRM
      return {
        action_executed: 'save_lead_record',
        success: true,
        message: 'Lead record placeholder (save to CRM)',
      };

    case 'send_follow_up_message':
    case 'generate_followup_draft':
    case 'send_internal_summary':
    case 'schedule_followup': {
      const mappedConfig: Record<string, unknown> = { ...config };
      if (automation.action_type === 'generate_followup_draft') mappedConfig.mode = 'ai_draft_for_approval';
      if (automation.action_type === 'send_internal_summary') mappedConfig.mode = 'internal_only_notification';
      if (automation.action_type === 'schedule_followup' && !mappedConfig.mode) {
        mappedConfig.mode = 'template_auto_send';
      }
      const effectiveMode = String(
        (automation.action_type === 'send_follow_up_message' ? config.mode : mappedConfig.mode) ?? 'ai_draft_for_approval'
      );
      const followUpEnabled = await canUseFollowUpEmails(supabase, automation.organization_id, false);
      if (!followUpEnabled) {
        return {
          action_executed: automation.action_type,
          success: false,
          message: 'Follow-up emails are not available on this plan.',
        };
      }
      if ((effectiveMode === 'ai_generated_auto_send' || effectiveMode === 'ai_draft_for_approval' || automation.action_type === 'generate_followup_draft')) {
        const aiEnabled = await canUseAiFollowUp(supabase, automation.organization_id, false);
        if (!aiEnabled) {
          return {
            action_executed: automation.action_type,
            success: false,
            message: 'AI follow-up is not available on this plan.',
          };
        }
      }
      if (effectiveMode === 'ai_draft_for_approval' || automation.action_type === 'generate_followup_draft') {
        const draftsEnabled = await canUseFollowUpDrafts(supabase, automation.organization_id, false);
        if (!draftsEnabled) {
          return {
            action_executed: automation.action_type,
            success: false,
            message: 'Follow-up draft approvals are not available on this plan.',
          };
        }
      }
      const result = await executeFollowUpAction({
        supabase,
        organizationId: automation.organization_id,
        automationId: null,
        automationName: automation.name ?? null,
        input,
        actionConfig:
          automation.action_type === 'send_follow_up_message' ? config : mappedConfig,
      });
      if (result.status === 'sent') {
        return {
          action_executed: automation.action_type,
          success: true,
          message: 'Follow-up sent',
          external_id: result.externalId ?? undefined,
          draft_id: result.draftId ?? undefined,
          follow_up_log_id: result.logId,
        };
      }
      if (result.status === 'skipped') {
        return {
          action_executed: automation.action_type,
          success: true,
          message: result.reason,
          draft_id: result.draftId ?? undefined,
          follow_up_log_id: result.logId,
        };
      }
      return {
        action_executed: automation.action_type,
        success: false,
        message: result.reason,
        draft_id: result.draftId ?? undefined,
        follow_up_log_id: result.logId,
      };
    }

    case 'create_support_ticket': {
      const title =
        (typeof config.title === 'string' && config.title.trim()) ||
        `Support: ${input.lead?.name ?? 'Unknown'} – ${automation.name}`;
      const description =
        typeof config.description === 'string'
          ? config.description
          : [input.lead?.message, input.lead?.email].filter(Boolean).join('\n');
      const { data: ticket, error: ticketError } = await supabase.from('support_tickets').insert({
        organization_id: automation.organization_id,
        conversation_id: input.conversation_id ?? null,
        title: title.slice(0, 500),
        description: (description || '').slice(0, 2000),
        priority: (config.priority as string) || 'medium',
        status: 'open',
      }).select('id').single();
      if (ticketError) {
        return {
          action_executed: 'create_support_ticket',
          success: false,
          message: ticketError.message,
        };
      }
      return {
        action_executed: 'create_support_ticket',
        success: true,
        message: 'Support ticket created',
        external_id: ticket?.id,
      };
    }

    case 'crm_create_deal': {
      const lead = input.lead ?? {};
      let contactId: string | null = (config.contact_id as string) ?? null;
      if (!contactId && (lead.name || lead.email)) {
        const email = lead.email?.trim();
        const name = (lead.name as string)?.trim() || 'Unknown';
        if (email) {
          const { data: existingByEmail } = await supabase
            .from('contacts')
            .select('id')
            .eq('organization_id', automation.organization_id)
            .eq('email', email)
            .limit(1)
            .maybeSingle();
          if (existingByEmail) contactId = existingByEmail.id;
        }
        if (!contactId) {
          const { data: newContact } = await supabase
            .from('contacts')
            .insert({
              organization_id: automation.organization_id,
              name,
              email: lead.email ?? null,
              phone: lead.phone ?? null,
            })
            .select('id')
            .single();
          contactId = newContact?.id ?? null;
        }
      }
      const dealTitle = (typeof config.title === 'string' && config.title.trim()) || `Deal: ${lead.name ?? 'Lead'}`;
      const valueCents = typeof config.value_cents === 'number' ? config.value_cents : (input.estimated_value as number) ? Math.round(Number(input.estimated_value) * 100) : 0;
      const stage = (typeof config.stage === 'string' && config.stage.trim()) || 'qualification';
      const { data: deal, error: dealError } = await supabase.from('deals').insert({
        organization_id: automation.organization_id,
        contact_id: contactId,
        title: dealTitle.slice(0, 500),
        value_cents: valueCents,
        stage: ['qualification', 'proposal', 'negotiation', 'won', 'lost'].includes(stage) ? stage : 'qualification',
      }).select('id').single();
      if (dealError) {
        return {
          action_executed: 'crm_create_deal',
          success: false,
          message: dealError.message,
        };
      }
      return {
        action_executed: 'crm_create_deal',
        success: true,
        message: 'Deal created',
        external_id: deal?.id,
      };
    }

    case 'crm_create_task': {
      const taskTitle = (typeof config.title === 'string' && config.title.trim()) || `Follow up: ${input.lead?.name ?? 'Lead'}`;
      const { data: task, error: taskError } = await supabase.from('tasks').insert({
        organization_id: automation.organization_id,
        title: taskTitle.slice(0, 500),
        lead_id: input.lead_id ?? null,
        contact_id: config.contact_id ?? null,
        deal_id: config.deal_id ?? null,
      }).select('id').single();
      if (taskError) {
        return {
          action_executed: 'crm_create_task',
          success: false,
          message: taskError.message,
        };
      }
      return {
        action_executed: 'crm_create_task',
        success: true,
        message: 'Task created',
        external_id: task?.id,
      };
    }

    default:
      return {
        action_executed: automation.action_type,
        success: true,
        message: 'Action executed (no handler)',
      };
  }
}
