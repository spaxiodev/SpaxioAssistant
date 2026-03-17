/**
 * Quote pricing engine: types for profiles, services, variables, rules, and estimation results.
 */

export const PRICING_MODES = [
  'exact_estimate',
  'estimate_range',
  'quote_draft_only',
  'manual_review_required_above_threshold',
  'always_require_review',
] as const;
export type PricingMode = (typeof PRICING_MODES)[number];

export const VARIABLE_TYPES = [
  'number',
  'boolean',
  'select',
  'multi_select',
  'text',
  'area',
  'quantity',
  'currency',
  'range',
] as const;
export type VariableType = (typeof VARIABLE_TYPES)[number];

export const RULE_TYPES = [
  'fixed_price',
  'per_unit',
  'tiered',
  'addon',
  'multiplier',
  'minimum_charge',
  'range_adjustment',
  'formula',
] as const;
export type RuleType = (typeof RULE_TYPES)[number];

export interface QuotePricingProfileRow {
  id: string;
  organization_id: string;
  name: string;
  industry_type: string | null;
  is_default: boolean;
  description: string | null;
  currency: string;
  pricing_mode: PricingMode;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface QuoteServiceRow {
  id: string;
  organization_id: string;
  pricing_profile_id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  base_price: number | null;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface QuotePricingVariableRow {
  id: string;
  organization_id: string;
  pricing_profile_id: string;
  service_id: string | null;
  name: string;
  key: string;
  label: string;
  variable_type: VariableType;
  unit_label: string | null;
  required: boolean;
  default_value: string | null;
  options: unknown;
  help_text: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface QuotePricingRuleRow {
  id: string;
  organization_id: string;
  pricing_profile_id: string;
  service_id: string | null;
  rule_type: RuleType;
  name: string;
  description: string | null;
  config: Record<string, unknown>;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Config shapes per rule_type (safe structured evaluation only). */
export interface FixedPriceConfig {
  amount: number;
  label?: string;
}
export interface PerUnitConfig {
  variable_key: string;
  price_per_unit: number;
  unit_label?: string;
  label?: string;
}
export interface TieredConfig {
  variable_key: string;
  tiers: { min: number; max?: number; price_per_unit: number }[];
  label?: string;
}
export interface AddonConfig {
  variable_key: string;
  when_value?: boolean | string | number;
  amount: number;
  label?: string;
}
export interface MultiplierConfig {
  variable_key?: string;
  multiplier: number;
  label?: string;
}
export interface MinimumChargeConfig {
  minimum_amount: number;
  label?: string;
}
export interface RangeAdjustmentConfig {
  variable_key: string;
  low_multiplier?: number;
  high_multiplier?: number;
  label?: string;
}
/** Formula: only allow references to variable keys and + - * / ( ). No arbitrary code. */
export interface FormulaConfig {
  expression: string;
  label?: string;
}

export interface EstimationLineItem {
  rule_id: string;
  rule_name: string;
  rule_type: string;
  amount: number;
  label?: string;
  detail?: string;
}

export interface EstimationResult {
  valid: boolean;
  missing_required: string[];
  extracted_inputs: Record<string, unknown>;
  applied_rules: EstimationLineItem[];
  subtotal: number;
  total: number;
  estimate_low: number | null;
  estimate_high: number | null;
  confidence: number;
  assumptions: string[];
  human_review_recommended: boolean;
  output_mode: PricingMode;
}

export interface PricingContext {
  profile: QuotePricingProfileRow;
  services: QuoteServiceRow[];
  variables: QuotePricingVariableRow[];
  rules: QuotePricingRuleRow[];
}
