/**
 * Defines which setup actions are safe to auto-apply vs require user confirmation.
 * Used by the AI Setup Assistant to determine when to act vs when to ask.
 */

import type { SetupActionName } from './setup-actions';

/** Actions that write to live settings. Safe to run without explicit user confirmation. */
export const SAFE_TO_AUTO_APPLY: SetupActionName[] = [
  'update_business_settings', // Only for additive/non-destructive updates
  'apply_safe_setup_draft',
  'ingest_website_source',
];

/** Actions that require user confirmation before executing. */
export const REQUIRES_CONFIRMATION: SetupActionName[] = [
  'create_recommended_automation', // Sends messages externally
];

/** Fields that are safe to update without confirmation (additive or filling blanks). */
export const SAFE_BUSINESS_SETTINGS_FIELDS = [
  'business_name',
  'company_description',
  'services_offered',
  'faq',
  'tone_of_voice',
  'contact_email',
  'phone',
  'chatbot_welcome_message',
  'primary_brand_color',
  'lead_notification_email',
] as const;

/** Actions that are read-only (never require confirmation). */
export const READ_ONLY_ACTIONS: SetupActionName[] = [
  'get_business_settings',
  'get_widget_config',
  'get_agents',
  'get_setup_status',
  'analyze_website',
];

export function isSafeToAutoApply(action: SetupActionName): boolean {
  return SAFE_TO_AUTO_APPLY.includes(action) || READ_ONLY_ACTIONS.includes(action);
}

export function requiresConfirmation(action: SetupActionName): boolean {
  return REQUIRES_CONFIRMATION.includes(action);
}
