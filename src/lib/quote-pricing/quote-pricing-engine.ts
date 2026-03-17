/**
 * Server-side quote pricing engine. Evaluates collected inputs against pricing rules.
 * Safe, deterministic: no arbitrary code execution. Structured config only.
 */

import type {
  QuotePricingVariableRow,
  QuotePricingRuleRow,
  EstimationLineItem,
  EstimationResult,
  PerUnitConfig,
  TieredConfig,
  AddonConfig,
  MultiplierConfig,
  FormulaConfig,
} from './types';

const DEFAULT_CONFIDENCE = 0.9;
const LOW_CONFIDENCE_THRESHOLD = 0.6;

function toNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v === true) return 1;
  if (v === false) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function getInputValue(inputs: Record<string, unknown>, key: string): unknown {
  const v = inputs[key];
  if (v !== undefined) return v;
  return undefined;
}

/** Safe formula: only variable keys, numbers, + - * / ( ). No arbitrary code execution. */
function evaluateFormula(expression: string, inputs: Record<string, unknown>): number | null {
  const trimmed = expression.replace(/\s+/g, '');
  if (!/^[\d\w+\-*/().]+$/.test(trimmed)) return null;
  let expr = trimmed;
  for (const [key, val] of Object.entries(inputs)) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) continue;
    const num = toNumber(val);
    if (num === null) continue;
    const re = new RegExp(`\\b${key}\\b`, 'g');
    expr = expr.replace(re, String(num));
  }
  return safeEvalExpression(expr);
}

/** Minimal safe evaluator: numbers, + - * / ( ) only. No Function, no eval. */
function safeEvalExpression(expr: string): number | null {
  let i = 0;
  const n = expr.length;
  function skipSpaces() {
    while (i < n && /\s/.test(expr[i]!)) i++;
  }
  function parseNumber(): number | null {
    skipSpaces();
    const start = i;
    if (expr[i] === '(') {
      i++;
      const v = parseAdd();
      skipSpaces();
      if (expr[i] === ')') i++;
      return v;
    }
    if (i < n && /[0-9.]/.test(expr[i]!)) {
      while (i < n && /[0-9.]/.test(expr[i]!)) i++;
      const num = parseFloat(expr.slice(start, i));
      return Number.isFinite(num) ? num : null;
    }
    return null;
  }
  function parseMul(): number | null {
    let left = parseNumber();
    if (left === null) return null;
    for (;;) {
      skipSpaces();
      const op = expr[i];
      if (op === '*') {
        i++;
        const right = parseNumber();
        if (right === null) return null;
        left = left * right;
      } else if (op === '/') {
        i++;
        const right = parseNumber();
        if (right === null || right === 0) return null;
        left = left / right;
      } else break;
    }
    return left;
  }
  function parseAdd(): number | null {
    let left = parseMul();
    if (left === null) return null;
    for (;;) {
      skipSpaces();
      const op = expr[i];
      if (op === '+') {
        i++;
        const right = parseMul();
        if (right === null) return null;
        left = left + right;
      } else if (op === '-') {
        i++;
        const right = parseMul();
        if (right === null) return null;
        left = left - right;
      } else break;
    }
    return left;
  }
  const result = parseAdd();
  skipSpaces();
  return i >= n && result !== null ? result : null;
}

function validateAndCoerceInputs(
  inputs: Record<string, unknown>,
  variables: QuotePricingVariableRow[]
): { coerced: Record<string, unknown>; missing: string[] } {
  const coerced: Record<string, unknown> = {};
  const missing: string[] = [];

  for (const v of variables) {
    const raw = getInputValue(inputs, v.key);
    if (raw === undefined || raw === null) {
      if (v.default_value !== null && v.default_value !== undefined) {
        if (v.variable_type === 'number' || v.variable_type === 'quantity' || v.variable_type === 'area') {
          const n = Number(v.default_value);
          coerced[v.key] = Number.isFinite(n) ? n : v.default_value;
        } else if (v.variable_type === 'boolean') {
          coerced[v.key] = v.default_value === 'true' || v.default_value === '1';
        } else {
          coerced[v.key] = v.default_value;
        }
      } else if (v.required) {
        missing.push(v.key);
      }
      continue;
    }

    switch (v.variable_type) {
      case 'number':
      case 'quantity':
      case 'area':
      case 'currency': {
        const n = toNumber(raw);
        coerced[v.key] = n !== null ? n : (v.default_value != null ? Number(v.default_value) : null);
        if (v.required && (coerced[v.key] === null || coerced[v.key] === undefined)) missing.push(v.key);
        break;
      }
      case 'boolean':
        coerced[v.key] = raw === true || raw === 'true' || raw === 1 || raw === '1';
        break;
      case 'select':
      case 'text':
        coerced[v.key] = typeof raw === 'string' ? raw.trim().slice(0, 2000) : String(raw).slice(0, 2000);
        break;
      case 'multi_select':
        coerced[v.key] = Array.isArray(raw) ? raw : (typeof raw === 'string' ? raw.split(',').map((s) => s.trim()) : []);
        break;
      case 'range':
        if (typeof raw === 'object' && raw !== null && 'low' in raw && 'high' in raw) {
          coerced[v.key] = raw;
        } else {
          const n = toNumber(raw);
          coerced[v.key] = n !== null ? { low: n, high: n } : null;
        }
        break;
      default:
        coerced[v.key] = raw;
    }
  }
  return { coerced, missing };
}

/**
 * Run the pricing engine: validate inputs, apply rules in order, return result.
 */
export function runPricingEngine(params: {
  inputs: Record<string, unknown>;
  variables: QuotePricingVariableRow[];
  rules: QuotePricingRuleRow[];
  serviceId: string | null;
  pricingMode: string;
}): EstimationResult {
  const { inputs, variables, rules, serviceId, pricingMode } = params;
  const { coerced, missing } = validateAndCoerceInputs(inputs, variables);
  const applied_rules: EstimationLineItem[] = [];
  let runningTotal = 0;
  const assumptions: string[] = [];

  const activeRules = rules
    .filter((r) => r.is_active && (r.service_id == null || r.service_id === serviceId))
    .sort((a, b) => a.sort_order - b.sort_order);

  for (const rule of activeRules) {
    const config = rule.config as Record<string, unknown>;
    let amount = 0;
    let detail: string | undefined;

    switch (rule.rule_type) {
      case 'fixed_price': {
        const amt = Number(config.amount);
        if (Number.isFinite(amt)) {
          amount = amt;
          detail = (config.label as string) || rule.name;
        }
        break;
      }
      case 'per_unit': {
        const cfg = config as unknown as PerUnitConfig;
        const val = toNumber(coerced[cfg.variable_key]);
        if (val != null && val >= 0) {
          const pricePerUnit = Number(cfg.price_per_unit);
          if (Number.isFinite(pricePerUnit)) {
            amount = val * pricePerUnit;
            detail = `${val} × ${pricePerUnit}${cfg.unit_label ? ` ${cfg.unit_label}` : ''}`;
          }
        }
        break;
      }
      case 'tiered': {
        const cfg = config as unknown as TieredConfig;
        const val = toNumber(coerced[cfg.variable_key]);
        if (val != null && val >= 0 && Array.isArray(cfg.tiers)) {
          const tier = cfg.tiers.find((t) => val >= t.min && (t.max == null || val <= t.max));
          if (tier && Number.isFinite(tier.price_per_unit)) {
            amount = val * tier.price_per_unit;
            detail = `Tier: ${val} × ${tier.price_per_unit}`;
          }
        }
        break;
      }
      case 'addon': {
        const cfg = config as unknown as AddonConfig;
        const raw = getInputValue(coerced, cfg.variable_key);
        const match =
          cfg.when_value === undefined ||
          (typeof cfg.when_value === 'boolean' && raw === cfg.when_value) ||
          (typeof cfg.when_value === 'string' && String(raw) === cfg.when_value) ||
          (typeof cfg.when_value === 'number' && toNumber(raw) === cfg.when_value);
        if (match) {
          const amt = Number(cfg.amount);
          if (Number.isFinite(amt)) {
            amount = amt;
            detail = (config.label as string) || rule.name;
          }
        }
        break;
      }
      case 'multiplier': {
        const cfg = config as unknown as MultiplierConfig;
        const mult = Number(cfg.multiplier);
        if (Number.isFinite(mult) && mult >= 0) {
          amount = runningTotal * (mult - 1);
          if (amount !== 0) detail = `× ${mult}`;
        }
        break;
      }
      case 'minimum_charge': {
        const minAmt = Number(config.minimum_amount);
        if (Number.isFinite(minAmt) && runningTotal < minAmt) {
          amount = minAmt - runningTotal;
          detail = `Minimum charge (${minAmt})`;
        }
        break;
      }
      case 'range_adjustment': {
        const cfg = config as { variable_key: string; low_multiplier?: number; high_multiplier?: number };
        const range = coerced[cfg.variable_key];
        if (range && typeof range === 'object' && 'low' in range && 'high' in range) {
          const r = range as { low: number; high: number };
          const low = toNumber(r.low);
          const high = toNumber(r.high);
          if (low != null && high != null && high >= low) {
            const mid = (low + high) / 2;
            const spread = high - low;
            const lowMult = typeof cfg.low_multiplier === 'number' ? cfg.low_multiplier : 0.9;
            const highMult = typeof cfg.high_multiplier === 'number' ? cfg.high_multiplier : 1.1;
            const mult = spread > 0 ? lowMult + ((highMult - lowMult) * (mid - low)) / spread : 1;
            amount = runningTotal * (mult - 1);
            if (amount !== 0) detail = `Range adjustment (× ${mult.toFixed(2)})`;
          }
        }
        break;
      }
      case 'formula': {
        const cfg = config as unknown as FormulaConfig;
        if (typeof cfg.expression === 'string') {
          const result = evaluateFormula(cfg.expression, coerced);
          if (result !== null) {
            amount = result;
            detail = cfg.expression;
          }
        }
        break;
      }
      default:
        break;
    }

    if (amount !== 0) {
      applied_rules.push({
        rule_id: rule.id,
        rule_name: rule.name,
        rule_type: rule.rule_type,
        amount,
        label: (config.label as string) || rule.name,
        detail,
      });
      runningTotal += amount;
    }
  }

  const valid = missing.length === 0;
  const hasRules = activeRules.length > 0;
  const confidence = valid && hasRules ? DEFAULT_CONFIDENCE : valid ? 0.5 : 0.2;
  const human_review_recommended =
    confidence < LOW_CONFIDENCE_THRESHOLD ||
    pricingMode === 'always_require_review' ||
    (pricingMode === 'manual_review_required_above_threshold' && runningTotal > 10000);

  let estimate_low: number | null = null;
  let estimate_high: number | null = null;
  if (pricingMode === 'estimate_range' && runningTotal > 0) {
    estimate_low = Math.round(runningTotal * 0.85 * 100) / 100;
    estimate_high = Math.round(runningTotal * 1.15 * 100) / 100;
  }

  return {
    valid,
    missing_required: missing,
    extracted_inputs: coerced,
    applied_rules,
    subtotal: Math.round(runningTotal * 100) / 100,
    total: Math.round(runningTotal * 100) / 100,
    estimate_low,
    estimate_high,
    confidence,
    assumptions,
    human_review_recommended,
    output_mode: pricingMode as EstimationResult['output_mode'],
  };
}
