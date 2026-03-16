/**
 * AI Workflow Generator: map plain-English instructions to automation draft (trigger + steps).
 * Server-side only. Validates and returns a draft that can be saved via existing automation APIs.
 */

import OpenAI from 'openai';
import { TRIGGER_TYPES, ACTION_TYPES } from './types';

export type GeneratedStep = {
  step_type: 'action';
  step_name: string;
  action_type: string;
  action_config: Record<string, unknown>;
};

export type GeneratedAutomationDraft = {
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  action_type: string;
  action_config: Record<string, unknown>;
  steps: GeneratedStep[];
  skipped: string[];
  explanation: string | null;
};

const TRIGGER_EXAMPLES = [
  'lead_form_submitted – when someone submits the lead form',
  'quote_request_submitted – when someone submits a quote request',
  'webhook_received – when an external webhook is called',
  'manual_test – run manually for testing',
];
const ACTION_EXAMPLES = [
  'send_email_notification – send an email (use to_email, subject, body in config)',
  'crm_create_contact – create a contact from lead data',
  'crm_create_deal – create a deal (optionally link to contact)',
  'create_support_ticket – create a support ticket',
  'call_webhook – call an external URL (url, method in config)',
  'qualify_lead_with_agent – run AI to qualify the lead',
];

const SYSTEM = `You convert natural language automation requests into a structured automation draft.
Allowed trigger_type values: ${TRIGGER_TYPES.join(', ')}.
Allowed action_type values (for steps or main action): ${ACTION_TYPES.join(', ')}.

Return a JSON object with:
- name: short automation name
- description: optional 1-2 sentence description
- trigger_type: one of the allowed triggers (e.g. lead_form_submitted, quote_request_submitted, webhook_received, manual_test)
- trigger_config: {} or minimal config
- action_type: the primary action (e.g. send_email_notification, crm_create_deal)
- action_config: object with keys needed for that action (e.g. to_email, subject, body for send_email_notification; title for create_support_ticket)
- steps: array of step objects for multi-step flows. Each step: { step_type: "action", step_name: string, action_type: string, action_config: {} }. Use steps when the user wants "first do X then Y". If single action is enough, steps can be [].
- skipped: array of strings describing what you could not implement (e.g. "Slack notification not supported")
- explanation: optional 1 sentence of what was created

Examples:
- "When someone submits a quote request, create a deal and send me an email" -> trigger_type: quote_request_submitted, steps: [{ action_type: crm_create_deal }, ...], action_type: send_email_notification
- "When lead form submitted, send email" -> trigger_type: lead_form_submitted, action_type: send_email_notification, action_config: { body: "Name: {{lead.name}}..." }

Reply with only the JSON, no markdown.`;

export async function generateAutomationFromInstruction(
  instruction: string
): Promise<GeneratedAutomationDraft> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: instruction.slice(0, 2000) },
    ],
    max_tokens: 1000,
    response_format: { type: 'json_object' },
  });
  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error('No generation result');
  const parsed = JSON.parse(raw) as Record<string, unknown>;

  const triggerType = typeof parsed.trigger_type === 'string' ? parsed.trigger_type.trim() : 'manual_test';
  const validTrigger = TRIGGER_TYPES.includes(triggerType as (typeof TRIGGER_TYPES)[number]) ? triggerType : 'manual_test';

  const actionType = typeof parsed.action_type === 'string' ? parsed.action_type.trim() : 'send_email_notification';
  const validAction = ACTION_TYPES.includes(actionType as (typeof ACTION_TYPES)[number]) ? actionType : 'send_email_notification';

  const stepsRaw = Array.isArray(parsed.steps) ? parsed.steps : [];
  const steps: GeneratedStep[] = stepsRaw
    .filter((s: unknown) => s && typeof s === 'object' && typeof (s as Record<string, unknown>).action_type === 'string')
    .map((s: unknown): GeneratedStep => {
      const o = s as Record<string, unknown>;
      const at = String(o.action_type).trim();
      return {
        step_type: 'action',
        step_name: typeof o.step_name === 'string' ? o.step_name.slice(0, 200) : 'Step',
        action_type: ACTION_TYPES.includes(at as (typeof ACTION_TYPES)[number]) ? at : 'send_email_notification',
        action_config: (o.action_config && typeof o.action_config === 'object') ? (o.action_config as Record<string, unknown>) : {},
      };
    })
    .slice(0, 10);

  return {
    name: typeof parsed.name === 'string' ? parsed.name.slice(0, 200) : 'Generated automation',
    description: typeof parsed.description === 'string' ? parsed.description.slice(0, 500) : null,
    trigger_type: validTrigger,
    trigger_config: (parsed.trigger_config && typeof parsed.trigger_config === 'object') ? (parsed.trigger_config as Record<string, unknown>) : {},
    action_type: validAction,
    action_config: (parsed.action_config && typeof parsed.action_config === 'object') ? (parsed.action_config as Record<string, unknown>) : {},
    steps,
    skipped: Array.isArray(parsed.skipped) ? (parsed.skipped as string[]).filter((x) => typeof x === 'string').slice(0, 5) : [],
    explanation: typeof parsed.explanation === 'string' ? parsed.explanation.slice(0, 300) : null,
  };
}
