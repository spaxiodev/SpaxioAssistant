/**
 * Industry starter templates for quote pricing. Used by settings UI and optional seeding.
 */

import type { VariableType } from './types';
import type { RuleType } from './types';

export interface TemplateVariable {
  key: string;
  label: string;
  variable_type: VariableType;
  unit_label?: string | null;
  required: boolean;
  default_value?: string | null;
  options?: unknown;
  help_text?: string | null;
}

export interface TemplateRule {
  rule_type: RuleType;
  name: string;
  description?: string | null;
  config: Record<string, unknown>;
  sort_order: number;
}

export interface IndustryTemplate {
  industry_type: string;
  name: string;
  description: string;
  currency: string;
  variables: TemplateVariable[];
  services: { name: string; slug: string; description?: string }[];
  rules: TemplateRule[];
}

export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    industry_type: 'web_design',
    name: 'Web Design',
    description: 'Website projects: pages, ecommerce, booking, copywriting, rush delivery',
    currency: 'USD',
    services: [{ name: 'Website project', slug: 'website', description: 'Custom website design and development' }],
    variables: [
      { key: 'number_of_pages', label: 'Number of pages', variable_type: 'number', required: true, unit_label: 'pages', help_text: 'Main content pages' },
      { key: 'ecommerce_enabled', label: 'E-commerce / online store', variable_type: 'boolean', required: false, default_value: 'false' },
      { key: 'booking_enabled', label: 'Booking / scheduling', variable_type: 'boolean', required: false, default_value: 'false' },
      { key: 'blog_enabled', label: 'Blog section', variable_type: 'boolean', required: false, default_value: 'false' },
      { key: 'copywriting_needed', label: 'Copywriting included', variable_type: 'boolean', required: false, default_value: 'false' },
      { key: 'rush_delivery', label: 'Rush delivery', variable_type: 'boolean', required: false, default_value: 'false' },
    ],
    rules: [
      { rule_type: 'fixed_price', name: 'Base website fee', config: { amount: 1500, label: 'Base website' }, sort_order: 0 },
      { rule_type: 'per_unit', name: 'Per page', config: { variable_key: 'number_of_pages', price_per_unit: 120, unit_label: 'pages', label: 'Pages' }, sort_order: 10 },
      { rule_type: 'addon', name: 'E-commerce addon', config: { variable_key: 'ecommerce_enabled', when_value: true, amount: 800, label: 'E-commerce' }, sort_order: 20 },
      { rule_type: 'addon', name: 'Booking addon', config: { variable_key: 'booking_enabled', when_value: true, amount: 400, label: 'Booking' }, sort_order: 21 },
      { rule_type: 'addon', name: 'Copywriting addon', config: { variable_key: 'copywriting_needed', when_value: true, amount: 500, label: 'Copywriting' }, sort_order: 22 },
      { rule_type: 'addon', name: 'Rush delivery', config: { variable_key: 'rush_delivery', when_value: true, amount: 300, label: 'Rush delivery' }, sort_order: 30 },
    ],
  },
  {
    industry_type: 'landscaping',
    name: 'Landscaping',
    description: 'Yard care: lot size, bushes, hedges, mowing, trimming, cleanup, mulch, urgency',
    currency: 'USD',
    services: [{ name: 'Landscaping visit', slug: 'visit', description: 'Single visit: mowing, trimming, cleanup' }],
    variables: [
      { key: 'lot_size', label: 'Lot size', variable_type: 'area', required: true, unit_label: 'sq ft' },
      { key: 'number_of_bushes', label: 'Number of bushes to trim', variable_type: 'quantity', required: false, default_value: '0' },
      { key: 'hedge_length', label: 'Hedge length', variable_type: 'number', required: false, unit_label: 'ft', default_value: '0' },
      { key: 'mowing_needed', label: 'Mowing needed', variable_type: 'boolean', required: true, default_value: 'true' },
      { key: 'trimming_needed', label: 'Trimming needed', variable_type: 'boolean', required: false, default_value: 'false' },
      { key: 'cleanup_needed', label: 'Cleanup / debris removal', variable_type: 'boolean', required: false, default_value: 'false' },
      { key: 'mulch_needed', label: 'Mulch', variable_type: 'boolean', required: false, default_value: 'false' },
      { key: 'urgency', label: 'Urgent / same week', variable_type: 'boolean', required: false, default_value: 'false' },
    ],
    rules: [
      { rule_type: 'fixed_price', name: 'Base visit fee', config: { amount: 80, label: 'Base visit' }, sort_order: 0 },
      { rule_type: 'per_unit', name: 'Mowing by lot size', config: { variable_key: 'lot_size', price_per_unit: 0.02, unit_label: 'sq ft', label: 'Mowing (by area)' }, sort_order: 10 },
      { rule_type: 'per_unit', name: 'Bush trimming', config: { variable_key: 'number_of_bushes', price_per_unit: 15, label: 'Per bush' }, sort_order: 20 },
      { rule_type: 'per_unit', name: 'Hedge trimming', config: { variable_key: 'hedge_length', price_per_unit: 3, unit_label: 'ft', label: 'Hedge trimming' }, sort_order: 21 },
      { rule_type: 'addon', name: 'Cleanup fee', config: { variable_key: 'cleanup_needed', when_value: true, amount: 75, label: 'Cleanup' }, sort_order: 30 },
      { rule_type: 'addon', name: 'Urgency surcharge', config: { variable_key: 'urgency', when_value: true, amount: 50, label: 'Rush' }, sort_order: 40 },
    ],
  },
  {
    industry_type: 'cleaning',
    name: 'Cleaning',
    description: 'Residential or commercial cleaning: square footage, frequency, extras',
    currency: 'USD',
    services: [{ name: 'Cleaning service', slug: 'cleaning', description: 'One-time or recurring cleaning' }],
    variables: [
      { key: 'square_footage', label: 'Square footage', variable_type: 'area', required: true, unit_label: 'sq ft' },
      { key: 'frequency', label: 'Frequency', variable_type: 'select', required: false, options: [{ value: 'once', label: 'One-time' }, { value: 'weekly', label: 'Weekly' }, { value: 'biweekly', label: 'Bi-weekly' }], default_value: 'once' },
      { key: 'deep_clean', label: 'Deep clean', variable_type: 'boolean', required: false, default_value: 'false' },
      { key: 'windows', label: 'Interior windows', variable_type: 'boolean', required: false, default_value: 'false' },
    ],
    rules: [
      { rule_type: 'fixed_price', name: 'Base fee', config: { amount: 100, label: 'Base' }, sort_order: 0 },
      { rule_type: 'per_unit', name: 'Per sq ft', config: { variable_key: 'square_footage', price_per_unit: 0.12, unit_label: 'sq ft', label: 'By area' }, sort_order: 10 },
      { rule_type: 'addon', name: 'Deep clean', config: { variable_key: 'deep_clean', when_value: true, amount: 80, label: 'Deep clean' }, sort_order: 20 },
      { rule_type: 'addon', name: 'Windows', config: { variable_key: 'windows', when_value: true, amount: 50, label: 'Windows' }, sort_order: 21 },
    ],
  },
  {
    industry_type: 'consulting',
    name: 'Consulting',
    description: 'Hourly or project-based consulting with optional rush',
    currency: 'USD',
    services: [{ name: 'Consulting engagement', slug: 'consulting', description: 'Strategy, advisory, or project-based work' }],
    variables: [
      { key: 'estimated_hours', label: 'Estimated hours', variable_type: 'quantity', required: true, unit_label: 'hours' },
      { key: 'project_type', label: 'Project type', variable_type: 'select', required: false, options: [{ value: 'strategy', label: 'Strategy' }, { value: 'implementation', label: 'Implementation' }, { value: 'audit', label: 'Audit' }] },
      { key: 'rush', label: 'Rush / tight deadline', variable_type: 'boolean', required: false, default_value: 'false' },
    ],
    rules: [
      { rule_type: 'per_unit', name: 'Hourly rate', config: { variable_key: 'estimated_hours', price_per_unit: 150, unit_label: 'hr', label: 'Consulting hours' }, sort_order: 0 },
      { rule_type: 'minimum_charge', name: 'Minimum engagement', config: { minimum_amount: 500, label: 'Minimum' }, sort_order: 5 },
      { rule_type: 'addon', name: 'Rush fee', config: { variable_key: 'rush', when_value: true, amount: 200, label: 'Rush / tight deadline' }, sort_order: 10 },
    ],
  },
];

export function getTemplateByIndustry(industry_type: string): IndustryTemplate | undefined {
  return INDUSTRY_TEMPLATES.find((t) => t.industry_type === industry_type);
}
