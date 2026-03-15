/**
 * Supported automation templates for the AI Setup Assistant.
 * AI must only recommend these; no unbounded actions.
 */

import type { AutomationTemplateKey } from './types';

export interface AISetupTemplate {
  key: AutomationTemplateKey;
  title: string;
  description: string;
  /** Default capture fields when this template is selected */
  defaultCaptureFields?: { key: string; label: string; type: 'text' | 'email' | 'phone' | 'textarea'; required?: boolean }[];
  /** Requires email notification */
  suggestsEmail?: boolean;
  /** Suggests webhook */
  suggestsWebhook?: boolean;
  /** Suggested primary_goal text */
  suggestedGoal?: string;
}

export const AI_SETUP_TEMPLATES: AISetupTemplate[] = [
  {
    key: 'lead_capture',
    title: 'Lead capture',
    description: 'Capture leads from your website with name, email, phone, and optional message.',
    defaultCaptureFields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'email', required: true },
      { key: 'phone', label: 'Phone', type: 'phone' },
      { key: 'message', label: 'Message', type: 'textarea' },
    ],
    suggestsEmail: true,
    suggestsWebhook: true,
    suggestedGoal: 'Capture qualified leads from the website and notify the team.',
  },
  {
    key: 'quote_request_capture',
    title: 'Quote request capture',
    description: 'Collect quote requests with service type, project details, and contact info.',
    defaultCaptureFields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'email', required: true },
      { key: 'phone', label: 'Phone', type: 'phone' },
      { key: 'service_needed', label: 'Service needed', type: 'text', required: true },
      { key: 'project_details', label: 'Project details', type: 'textarea' },
    ],
    suggestsEmail: true,
    suggestsWebhook: true,
    suggestedGoal: 'Collect quote requests and send them to sales.',
  },
  {
    key: 'appointment_request_capture',
    title: 'Appointment request capture',
    description: 'Let visitors request appointments or callbacks with their availability.',
    defaultCaptureFields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'email', required: true },
      { key: 'phone', label: 'Phone', type: 'phone', required: true },
      { key: 'preferred_time', label: 'Preferred time', type: 'text' },
    ],
    suggestsEmail: true,
    suggestsWebhook: true,
    suggestedGoal: 'Capture appointment requests and notify the team.',
  },
  {
    key: 'faq_chatbot',
    title: 'FAQ chatbot',
    description: 'Answer common questions using your knowledge base and fallback to human when needed.',
    suggestedGoal: 'Answer FAQs and escalate complex questions.',
  },
  {
    key: 'support_intake',
    title: 'Support intake',
    description: 'Collect support tickets with issue description and contact details.',
    defaultCaptureFields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'email', required: true },
      { key: 'subject', label: 'Subject', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea', required: true },
    ],
    suggestsEmail: true,
    suggestedGoal: 'Triage support requests and notify support team.',
  },
  {
    key: 'email_notification',
    title: 'Email notification',
    description: 'Send an email when a lead is captured or a form is submitted.',
    suggestsEmail: true,
    suggestedGoal: 'Notify the team by email when a lead is captured.',
  },
  {
    key: 'webhook_workflow',
    title: 'Webhook workflow',
    description: 'Send lead or event data to an external URL (CRM, Zapier, custom app).',
    suggestsWebhook: true,
    suggestedGoal: 'Forward leads to an external system via webhook.',
  },
  {
    key: 'google_sheets_logging',
    title: 'Google Sheets logging',
    description: 'Log leads or events to a Google Sheet (via webhook or integration).',
    suggestsWebhook: true,
    suggestedGoal: 'Log leads to a spreadsheet for tracking.',
  },
  {
    key: 'crm_push',
    title: 'CRM push',
    description: 'Push leads or contacts to your CRM (via webhook or native integration).',
    suggestsWebhook: true,
    suggestedGoal: 'Add new leads to the CRM automatically.',
  },
  {
    key: 'slack_notification',
    title: 'Slack notification',
    description: 'Post new leads or events to a Slack channel.',
    suggestsWebhook: true,
    suggestedGoal: 'Notify the team in Slack when a lead is captured.',
  },
];

export function getAISetupTemplateByKey(key: string): AISetupTemplate | undefined {
  return AI_SETUP_TEMPLATES.find((t) => t.key === key);
}

export function getRecommendedTemplatesForBusinessType(businessType: string): AISetupTemplate[] {
  const lower = businessType.toLowerCase();
  if (lower.includes('service') || lower.includes('agency') || lower.includes('consulting')) {
    return AI_SETUP_TEMPLATES.filter((t) =>
      ['lead_capture', 'quote_request_capture', 'email_notification', 'webhook_workflow'].includes(t.key)
    );
  }
  if (lower.includes('support') || lower.includes('saas')) {
    return AI_SETUP_TEMPLATES.filter((t) =>
      ['support_intake', 'faq_chatbot', 'email_notification', 'slack_notification'].includes(t.key)
    );
  }
  if (lower.includes('booking') || lower.includes('appointment')) {
    return AI_SETUP_TEMPLATES.filter((t) =>
      ['appointment_request_capture', 'lead_capture', 'email_notification'].includes(t.key)
    );
  }
  return AI_SETUP_TEMPLATES.slice(0, 5);
}
