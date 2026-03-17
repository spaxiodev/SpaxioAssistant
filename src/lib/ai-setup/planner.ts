/**
 * Planner: merge structured updates from AI into planner_config.
 * Does NOT call LLM; expects extracted JSON from the AI response.
 */

import type { AssistantPlannerConfig, AutomationTemplateKey } from './types';
import { validatePlannerConfig, sanitizeCaptureFields } from './validation';
import { getAISetupTemplateByKey } from './templates';

/**
 * Merge a partial config (e.g. extracted from AI) into current config.
 * Validates and sanitizes; returns merged config or null if invalid.
 */
export function mergePlannerConfig(
  current: AssistantPlannerConfig,
  update: Record<string, unknown>
): AssistantPlannerConfig | null {
  const merged: AssistantPlannerConfig = { ...current };

  if (typeof update.chatbot_name === 'string' && update.chatbot_name.trim()) {
    merged.chatbot_name = update.chatbot_name.trim().slice(0, 200);
  }
  if (typeof update.business_type === 'string') {
    merged.business_type = update.business_type.trim().slice(0, 200);
  }
  if (typeof update.primary_goal === 'string') {
    merged.primary_goal = update.primary_goal.trim().slice(0, 1000);
  }
  if (update.capture_fields !== undefined) {
    merged.capture_fields = sanitizeCaptureFields(update.capture_fields);
  }
  if (typeof update.notification_email === 'string') {
    merged.notification_email = update.notification_email.trim().slice(0, 320) || undefined;
  }
  if (typeof update.webhook_enabled === 'boolean') {
    merged.webhook_enabled = update.webhook_enabled;
  }
  if (typeof update.widget_enabled === 'boolean') {
    merged.widget_enabled = update.widget_enabled;
  }
  if (update.widget_config !== undefined && update.widget_config !== null && typeof update.widget_config === 'object') {
    const wc = update.widget_config as Record<string, unknown>;
    merged.widget_config = {
      ...merged.widget_config,
      position: typeof wc.position === 'string' ? wc.position as AssistantPlannerConfig['widget_config'] extends { position?: infer P } ? P : never : merged.widget_config?.position,
      welcomeMessage: typeof wc.welcomeMessage === 'string' ? wc.welcomeMessage : merged.widget_config?.welcomeMessage,
      primaryColor: typeof wc.primaryColor === 'string' ? wc.primaryColor : merged.widget_config?.primaryColor,
      widgetLogoUrl: typeof wc.widgetLogoUrl === 'string' ? wc.widgetLogoUrl.trim().slice(0, 2000) : merged.widget_config?.widgetLogoUrl,
    };
  }
  if (update.automation_type !== undefined) {
    if (Array.isArray(update.automation_type)) {
      const keys = update.automation_type.filter((k): k is string => typeof k === 'string') as AutomationTemplateKey[];
      merged.automation_type = keys.length ? keys : undefined;
      merged.applied_templates = keys.slice(0, 10);
    } else if (typeof update.automation_type === 'string') {
      merged.automation_type = update.automation_type as AutomationTemplateKey;
      merged.applied_templates = [update.automation_type as AutomationTemplateKey];
    }
  }
  if (typeof update.follow_up_enabled === 'boolean') {
    merged.follow_up_enabled = update.follow_up_enabled;
  }
  if (update.quote_form_config !== undefined && update.quote_form_config !== null && typeof update.quote_form_config === 'object') {
    const qfc = update.quote_form_config as Record<string, unknown>;
    merged.quote_form_config = {
      ...merged.quote_form_config,
      intro_text: typeof qfc.intro_text === 'string' ? qfc.intro_text : merged.quote_form_config?.intro_text,
      submit_button_label: typeof qfc.submit_button_label === 'string' ? qfc.submit_button_label : merged.quote_form_config?.submit_button_label,
      name_required: typeof qfc.name_required === 'boolean' ? qfc.name_required : merged.quote_form_config?.name_required,
      email_required: typeof qfc.email_required === 'boolean' ? qfc.email_required : merged.quote_form_config?.email_required,
      phone_required: typeof qfc.phone_required === 'boolean' ? qfc.phone_required : merged.quote_form_config?.phone_required,
      show_estimate_instantly: typeof qfc.show_estimate_instantly === 'boolean' ? qfc.show_estimate_instantly : merged.quote_form_config?.show_estimate_instantly,
      show_exact_estimate: typeof qfc.show_exact_estimate === 'boolean' ? qfc.show_exact_estimate : merged.quote_form_config?.show_exact_estimate,
    };
  }

  const result = validatePlannerConfig(merged);
  if (!result.valid) return null;
  return merged;
}

/**
 * Apply a template key to config: set goal, capture_fields, and flags from template defaults.
 */
export function applyTemplateToConfig(
  config: AssistantPlannerConfig,
  templateKey: string
): AssistantPlannerConfig {
  const template = getAISetupTemplateByKey(templateKey);
  if (!template) return config;

  const next: AssistantPlannerConfig = { ...config };
  if (template.suggestedGoal) next.primary_goal = template.suggestedGoal;
  if (template.defaultCaptureFields?.length) {
    next.capture_fields = template.defaultCaptureFields.map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      required: f.required ?? false,
    }));
  }
  if (template.suggestsEmail) next.notification_email = config.notification_email || undefined;
  if (template.suggestsWebhook) next.webhook_enabled = true;
  if (!next.applied_templates?.includes(template.key)) {
    next.applied_templates = [...(next.applied_templates || []), template.key];
  }
  return next;
}
