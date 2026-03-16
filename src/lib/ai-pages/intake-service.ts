/**
 * Structured intake: extract and validate fields from conversation.
 */

import type { IntakeFieldSchema, SessionState } from './types';

export function validateCollectedFields(
  collected: Record<string, unknown>,
  schema: IntakeFieldSchema[]
): { valid: boolean; missing: string[] } {
  const required = schema.filter((f) => f.required);
  const missing: string[] = [];
  for (const f of required) {
    const v = collected[f.key];
    if (v === undefined || v === null || (typeof v === 'string' && !v.trim())) missing.push(f.key);
  }
  return { valid: missing.length === 0, missing };
}

export function completionPercent(
  collected: Record<string, unknown>,
  schema: IntakeFieldSchema[]
): number {
  if (schema.length === 0) return 0;
  const required = schema.filter((f) => f.required);
  const optional = schema.filter((f) => !f.required);
  let score = 0;
  for (const f of required) {
    const v = collected[f.key];
    if (v !== undefined && v !== null && (typeof v !== 'string' || v.trim())) score += 1;
  }
  const requiredTotal = required.length;
  const optionalFilled = optional.filter((f) => {
    const v = collected[f.key];
    return v !== undefined && v !== null && (typeof v !== 'string' || v.trim());
  }).length;
  const optionalTotal = optional.length;
  const requiredWeight = requiredTotal * 2;
  const optionalWeight = optionalTotal;
  const totalWeight = requiredWeight + optionalWeight;
  const value = (score * 2) + (totalWeight > 0 ? (optionalFilled / Math.max(1, optionalTotal)) * optionalWeight : 0);
  return Math.min(100, Math.round((value / totalWeight) * 100));
}

export function sanitizeCollectedField(value: unknown, type: string): unknown {
  if (value === null || value === undefined) return value;
  if (type === 'string' || type === 'text') {
    const s = String(value).trim().slice(0, 2000);
    return s || null;
  }
  if (type === 'number') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (type === 'boolean') return Boolean(value);
  return value;
}

export function mergeExtractedIntoState(
  currentState: SessionState,
  extracted: Record<string, unknown>,
  schema: IntakeFieldSchema[]
): SessionState {
  const collected = { ...(currentState.collected_fields ?? {}) };
  for (const f of schema) {
    const raw = extracted[f.key];
    if (raw === undefined) continue;
    const sanitized = sanitizeCollectedField(raw, f.type);
    if (sanitized !== undefined && sanitized !== null) collected[f.key] = sanitized;
  }
  const { valid, missing } = validateCollectedFields(collected, schema);
  const completion_percent = completionPercent(collected, schema);
  return {
    ...currentState,
    collected_fields: collected,
    missing_required: missing,
    completion_percent,
    final_status: valid && completion_percent >= 80 ? 'submitted' : currentState.final_status,
  };
}
