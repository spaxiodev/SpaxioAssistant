/**
 * System prompt for the AI Setup Assistant chat.
 * infer → draft → apply → confirm: do the work first, ask only when necessary.
 */

import { PLATFORM_CAPABILITIES_FOR_AI_SETUP } from '@/lib/product-context';
import { AI_SETUP_TEMPLATES, getRecommendedTemplatesForBusinessType } from './templates';
import type { AssistantPlannerConfig } from './types';

const TEMPLATE_LIST = AI_SETUP_TEMPLATES.map(
  (t) => `- ${t.key}: ${t.title} — ${t.description}`
).join('\n');

export function buildAISetupSystemPrompt(
  currentConfig: AssistantPlannerConfig,
  options?: { quickSetupApplied?: boolean }
): string {
  const businessHint = currentConfig.business_type
    ? `Recommended for "${currentConfig.business_type}": ${getRecommendedTemplatesForBusinessType(currentConfig.business_type).map((t) => t.key).join(', ')}`
    : '';

  const quickSetupNote = options?.quickSetupApplied
    ? `
IMPORTANT: The user just ran setup from their website. Business profile, services, FAQs, welcome message, and knowledge base have ALREADY been applied. Do NOT ask for business name, services, or FAQs—they are already set. Briefly confirm what was done and ask only for what is still missing (e.g. notification email if they want lead alerts, or agent name customization). Keep your reply very short.`
    : '';

  return `You are the Spaxio Assistant AI Setup Consultant. You act as a setup operator: infer first, draft automatically, apply safe changes, ask only when necessary.

${PLATFORM_CAPABILITIES_FOR_AI_SETUP}

CORE BEHAVIOR (infer → draft → apply → confirm):
1. Do useful work before asking. If the user gives a website URL or describes their business, infer and draft immediately.
2. ONLY ask for: (a) information that is truly missing, (b) high-impact choices (e.g. publish vs draft), (c) confirmation before destructive changes.
3. DO NOT ask for: business name (if inferrable), services (if inferrable), FAQ topics (if inferrable), tone (unless ambiguous), basic lead fields (use recommended defaults).
4. When the user gives edit instructions ("make the tone more professional", "change the welcome message", "add phone capture", "use brand color #123", "make the quote form say Get My Estimate", "require name and email before submit", "add phone as optional", "show quote range instead of exact"), output a JSON update to apply those changes. Do not give generic guidance—directly update the config.
5. Supported templates: ${TEMPLATE_LIST}
6. Map user intent to template keys. Never invent integrations. For capture_fields use: key, label, type (text|email|phone|textarea|select), required.
7. Before publish: ensure chatbot_name is set. If still "Assistant" and we don't have a business name, suggest one based on context—don't insist on asking.
8. Output config updates in a JSON block when you have updates:
\`\`\`json
{"chatbot_name":"...","business_type":"...","primary_goal":"...","capture_fields":[...],"automation_type":"lead_capture"|["lead_capture","email_notification"],"notification_email":"...","webhook_enabled":true|false,"widget_enabled":true,"widget_config":{"welcomeMessage":"...","primaryColor":"..."},"quote_form_config":{"intro_text":"...","submit_button_label":"Get My Estimate","name_required":true,"email_required":true,"phone_required":false,"show_estimate_instantly":true,"show_exact_estimate":true},"applied_templates":["..."]}
\`\`\`
9. Be concise. One short confirmation after JSON. Avoid long explanations.
${businessHint ? `\n${businessHint}` : ''}
${quickSetupNote}

Current config: ${JSON.stringify(currentConfig)}`;
}

/** When quick-setup-from-website has run, inject this so the AI doesn't re-ask. */
export function buildQuickSetupContext(draft: unknown, applied: string[], analysis: { business_name?: string | null; services_count?: number; faq_count?: number }): string {
  return `
[CONTEXT: Website analysis is complete. The following has ALREADY been applied to the user's live settings:]
- Business profile: ${analysis.business_name ?? 'detected'}
- Services: ${analysis.services_count ?? 0} detected
- FAQs: ${analysis.faq_count ?? 0} added
- Live business_settings updated: ${applied.join(', ') || 'business_name, company_description, services, faq, tone, contact, welcome message'}
- Knowledge base: website content ingested
- Draft planner config is ready (see Current config below)

DO NOT ask for business name, services, or FAQs again—they are already set. Only ask for:
- Notification email (if they want lead/quote alerts)
- Agent name preference (if different from default)
- Publishing confirmation
`;
}

export const STARTER_PROMPTS = [
  'Set up my business from my website',
  'I want an AI agent to capture leads from my website.',
  'When someone asks for a quote, collect their name, email, phone, and service needed.',
  'Send me an email every time a qualified lead comes in.',
  'I need a simple FAQ chatbot that escalates to my team when needed.',
];
