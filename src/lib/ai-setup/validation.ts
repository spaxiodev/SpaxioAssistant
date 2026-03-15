/**
 * Validate planner config against allowed templates and fields.
 * Prevents unsupported or dangerous values.
 */

import type { AssistantPlannerConfig, CaptureField } from './types';
import { AI_SETUP_TEMPLATES } from './templates';

const ALLOWED_TEMPLATE_KEYS = new Set<string>(AI_SETUP_TEMPLATES.map((t) => t.key));
const ALLOWED_FIELD_TYPES = new Set(['text', 'email', 'phone', 'textarea', 'select']);
const MAX_CAPTURE_FIELDS = 20;
const MAX_FIELD_LABEL = 100;
const MAX_FIELD_KEY = 64;

export type ValidationResult = { valid: boolean; errors: string[] };

export function validatePlannerConfig(config: unknown): ValidationResult {
  const errors: string[] = [];
  if (config === null || typeof config !== 'object') {
    return { valid: false, errors: ['Config must be an object'] };
  }

  const c = config as Record<string, unknown>;

  if (c.chatbot_name !== undefined) {
    if (typeof c.chatbot_name !== 'string') errors.push('chatbot_name must be a string');
    else if (c.chatbot_name.length > 200) errors.push('chatbot_name too long');
  }

  if (c.primary_goal !== undefined && typeof c.primary_goal !== 'string') {
    errors.push('primary_goal must be a string');
  }

  if (c.capture_fields !== undefined) {
    if (!Array.isArray(c.capture_fields)) errors.push('capture_fields must be an array');
    else {
      const arr = c.capture_fields as unknown[];
      if (arr.length > MAX_CAPTURE_FIELDS) errors.push(`capture_fields max ${MAX_CAPTURE_FIELDS}`);
      arr.forEach((item, i) => {
        if (item === null || typeof item !== 'object') {
          errors.push(`capture_fields[${i}] must be an object`);
          return;
        }
        const f = item as Record<string, unknown>;
        if (typeof f.key !== 'string' || f.key.length > MAX_FIELD_KEY) errors.push(`capture_fields[${i}].key invalid`);
        if (typeof f.label !== 'string' || f.label.length > MAX_FIELD_LABEL) errors.push(`capture_fields[${i}].label invalid`);
        if (f.type !== undefined && !ALLOWED_FIELD_TYPES.has(f.type as string)) errors.push(`capture_fields[${i}].type must be one of text, email, phone, textarea, select`);
      });
    }
  }

  if (c.automation_type !== undefined) {
    const at = c.automation_type;
    if (Array.isArray(at)) {
      at.forEach((k, i) => {
        if (typeof k !== 'string' || !ALLOWED_TEMPLATE_KEYS.has(k)) errors.push(`automation_type[${i}] is not a supported template`);
      });
    } else if (typeof at !== 'string' || !ALLOWED_TEMPLATE_KEYS.has(at)) {
      errors.push('automation_type must be a supported template key or array of keys');
    }
  }

  if (c.notification_email !== undefined && c.notification_email !== null) {
    if (typeof c.notification_email !== 'string') errors.push('notification_email must be a string');
    else if (c.notification_email.length > 320) errors.push('notification_email too long');
  }

  if (c.webhook_enabled !== undefined && typeof c.webhook_enabled !== 'boolean') {
    errors.push('webhook_enabled must be a boolean');
  }

  if (c.widget_enabled !== undefined && typeof c.widget_enabled !== 'boolean') {
    errors.push('widget_enabled must be a boolean');
  }

  if (c.publish_status !== undefined && c.publish_status !== 'draft' && c.publish_status !== 'published') {
    errors.push('publish_status must be draft or published');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/** Sanitize capture_fields for persistence (strip unknown props, trim). */
export function sanitizeCaptureFields(fields: unknown): CaptureField[] {
  if (!Array.isArray(fields)) return [];
  const out: CaptureField[] = [];
  for (const item of fields.slice(0, MAX_CAPTURE_FIELDS)) {
    if (item === null || typeof item !== 'object') continue;
    const f = item as Record<string, unknown>;
    const key = typeof f.key === 'string' ? f.key.slice(0, MAX_FIELD_KEY).replace(/[^a-z0-9_]/gi, '_') : `field_${out.length}`;
    const label = typeof f.label === 'string' ? f.label.slice(0, MAX_FIELD_LABEL) : key;
    const type = (typeof f.type === 'string' && ALLOWED_FIELD_TYPES.has(f.type)) ? f.type : 'text';
    const required = typeof f.required === 'boolean' ? f.required : false;
    const options = Array.isArray(f.options) ? f.options.filter((o): o is string => typeof o === 'string').slice(0, 50) : undefined;
    out.push({ key, label, type: type as CaptureField['type'], required, options });
  }
  return out;
}
