/**
 * Automation templates for the dashboard.
 * Each template pre-fills trigger/action and can require an agent.
 */

import type { TriggerType, ActionType } from './types';
import {
  UserPlus,
  MessageSquare,
  Headphones,
  DollarSign,
  Bell,
  HelpCircle,
  FileText,
  AlertCircle,
  Calendar,
  Webhook,
  ScrollText,
  GitBranch,
  type LucideIcon,
} from 'lucide-react';

export interface AutomationTemplate {
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
  trigger_type: TriggerType;
  default_trigger_config: Record<string, unknown>;
  action_type: ActionType;
  default_action_config: Record<string, unknown>;
  requires_agent: boolean;
  /** Whether this template should be shown in Simple Mode (business owner–friendly). */
  visible_in_simple_mode: boolean;
  /** Whether this template should be shown in Developer Mode. */
  visible_in_developer_mode: boolean;
  /**
   * Optional feature flag hint for future eligibility checks.
   * When the required feature is missing, the template should be hidden.
   */
  requires_feature?: 'webhooks' | 'inbox' | 'leads' | 'agent';
}

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    key: 'lead_qualification',
    title: 'Lead qualification',
    description: 'When a lead is captured, use an AI agent to score and categorize them.',
    icon: UserPlus,
    trigger_type: 'contact_info_captured',
    default_trigger_config: {},
    action_type: 'qualify_lead_with_agent',
    default_action_config: {},
    requires_agent: true,
    visible_in_simple_mode: false,
    visible_in_developer_mode: true,
    requires_feature: 'agent',
  },
  {
    key: 'contact_capture',
    title: 'Save visitor contact details',
    description: 'Save visitor contact details so you can follow up later.',
    icon: MessageSquare,
    trigger_type: 'contact_info_captured',
    default_trigger_config: {},
    action_type: 'save_lead_record',
    default_action_config: {},
    requires_agent: false,
    visible_in_simple_mode: true,
    visible_in_developer_mode: true,
    requires_feature: 'leads',
  },
  {
    key: 'support_handoff',
    title: 'Support handoff',
    description: 'When a conversation meets criteria, create a ticket or hand off to a human.',
    icon: Headphones,
    trigger_type: 'conversation_completed',
    default_trigger_config: {},
    action_type: 'handoff_to_human',
    default_action_config: {},
    requires_agent: false,
    visible_in_simple_mode: false,
    visible_in_developer_mode: false,
    requires_feature: 'inbox',
  },
  {
    key: 'pricing_inquiry_followup',
    title: 'Pricing inquiry follow-up',
    description: 'Send a follow-up message or email when someone asks about pricing.',
    icon: DollarSign,
    trigger_type: 'conversation_completed',
    default_trigger_config: {},
    action_type: 'send_follow_up_message',
    default_action_config: {},
    requires_agent: false,
    visible_in_simple_mode: true,
    visible_in_developer_mode: true,
  },
  {
    key: 'new_website_lead_notification',
    title: 'New website lead notification',
    description: 'Get notified by email when a new lead is captured from your widget.',
    icon: Bell,
    trigger_type: 'lead_form_submitted',
    default_trigger_config: {},
    action_type: 'send_email_notification',
    default_action_config: {},
    requires_agent: false,
    visible_in_simple_mode: true,
    visible_in_developer_mode: true,
  },
  {
    key: 'faq_escalation',
    title: 'FAQ escalation to human',
    description: 'When the bot can’t resolve the question, escalate to your team.',
    icon: HelpCircle,
    trigger_type: 'conversation_completed',
    default_trigger_config: {},
    action_type: 'handoff_to_human',
    default_action_config: {},
    requires_agent: false,
    visible_in_simple_mode: false,
    visible_in_developer_mode: false,
    requires_feature: 'inbox',
  },
  {
    key: 'quote_request_intake',
    title: 'Quote request intake',
    description: 'When someone requests a quote (form or chat), qualify and notify sales.',
    icon: FileText,
    trigger_type: 'lead_form_submitted',
    default_trigger_config: {},
    action_type: 'send_email_notification',
    default_action_config: {},
    requires_agent: false,
    visible_in_simple_mode: true,
    visible_in_developer_mode: true,
  },
  {
    key: 'low_confidence_rescue',
    title: 'Low confidence rescue',
    description: 'When the agent is unsure, hand off to a human or send an internal alert.',
    icon: AlertCircle,
    trigger_type: 'agent_confidence_low',
    default_trigger_config: {},
    action_type: 'handoff_to_human',
    default_action_config: {},
    requires_agent: false,
    visible_in_simple_mode: false,
    visible_in_developer_mode: false,
    requires_feature: 'inbox',
  },
  {
    key: 'daily_lead_digest',
    title: 'Daily lead digest',
    description: 'Get a scheduled summary of new leads (schedule trigger).',
    icon: Calendar,
    trigger_type: 'schedule_triggered',
    default_trigger_config: {},
    action_type: 'send_email_notification',
    default_action_config: {},
    requires_agent: false,
    visible_in_simple_mode: true,
    visible_in_developer_mode: true,
  },
  {
    key: 'webhook_to_crm_sync',
    title: 'Send lead data to another tool',
    description: 'When an external system sends a webhook, forward the data to another URL.',
    icon: Webhook,
    trigger_type: 'webhook_received',
    default_trigger_config: {},
    action_type: 'call_webhook',
    default_action_config: {},
    requires_agent: false,
    visible_in_simple_mode: false,
    visible_in_developer_mode: true,
    requires_feature: 'webhooks',
  },
  {
    key: 'post_conversation_summary',
    title: 'Post-conversation summary',
    description: 'When a chat ends, use an agent to summarize the conversation (stored in run history).',
    icon: ScrollText,
    trigger_type: 'conversation_completed',
    default_trigger_config: {},
    action_type: 'qualify_lead_with_agent',
    default_action_config: {},
    requires_agent: true,
    visible_in_simple_mode: false,
    visible_in_developer_mode: false,
    requires_feature: 'agent',
  },
  {
    key: 'smart_sales_routing',
    title: 'Smart sales routing',
    description: 'Route high-intent leads to sales via webhook or notification.',
    icon: GitBranch,
    trigger_type: 'contact_info_captured',
    default_trigger_config: {},
    action_type: 'call_webhook',
    default_action_config: {},
    requires_agent: false,
    visible_in_simple_mode: false,
    visible_in_developer_mode: false,
    requires_feature: 'webhooks',
  },
];

export function getTemplateByKey(key: string): AutomationTemplate | undefined {
  return AUTOMATION_TEMPLATES.find((t) => t.key === key);
}
