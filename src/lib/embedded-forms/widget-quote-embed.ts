/**
 * Build public embedded-form field definitions from the same sources as the AI widget quote form:
 * business_settings.quote_form_config + variables on the org's resolved default pricing profile
 * (via getPricingContext resolution).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { FieldType } from '@/lib/embedded-forms/types';
import type { QuotePricingVariableRow } from '@/lib/quote-pricing/types';
import { getPricingContext } from '@/lib/quote-pricing/estimate-quote-service';

export type QuoteFormConfigShape = {
  intro_text?: string;
  submit_button_label?: string;
  name_required?: boolean;
  email_required?: boolean;
  phone_required?: boolean;
};

export type WidgetQuotePublicField = {
  field_key: string;
  label: string;
  field_type: FieldType;
  placeholder?: string | null;
  required: boolean;
  options_json: string[];
  sort_order: number;
  /** When set, select/radio use value + label (e.g. boolean Yes/No → true/false). */
  select_options?: { value: string; label: string }[];
  default_value?: string | null;
};

const DEFAULT_QFC: Required<
  Pick<QuoteFormConfigShape, 'name_required' | 'email_required' | 'phone_required' | 'submit_button_label'>
> = {
  name_required: true,
  email_required: true,
  phone_required: false,
  submit_button_label: 'Submit quote request',
};

function normalizeQuoteFormConfig(raw: unknown): QuoteFormConfigShape {
  if (!raw || typeof raw !== 'object') return {};
  const o = raw as Record<string, unknown>;
  return {
    intro_text: typeof o.intro_text === 'string' ? o.intro_text : undefined,
    submit_button_label:
      typeof o.submit_button_label === 'string' ? o.submit_button_label : undefined,
    name_required: typeof o.name_required === 'boolean' ? o.name_required : undefined,
    email_required: typeof o.email_required === 'boolean' ? o.email_required : undefined,
    phone_required: typeof o.phone_required === 'boolean' ? o.phone_required : undefined,
  };
}

function mapVariableToEmbedField(v: QuotePricingVariableRow, sortBase: number): WidgetQuotePublicField {
  const t = v.variable_type;
  if (t === 'boolean') {
    return {
      field_key: v.key,
      label: v.label,
      field_type: 'select',
      placeholder: v.unit_label ?? null,
      required: v.required ?? false,
      options_json: [],
      sort_order: sortBase + (v.sort_order ?? 0),
      select_options: [
        { value: 'false', label: 'No' },
        { value: 'true', label: 'Yes' },
      ],
      default_value: v.default_value ?? 'false',
    };
  }
  if (t === 'select' && Array.isArray(v.options)) {
    const opts = v.options as { value?: string; label?: string }[];
    const select_options = opts
      .filter((x) => x && typeof x.value === 'string')
      .map((x) => ({ value: x.value!, label: typeof x.label === 'string' ? x.label : x.value! }));
    if (select_options.length > 0) {
      return {
        field_key: v.key,
        label: v.label,
        field_type: 'select',
        placeholder: v.unit_label ?? null,
        required: v.required ?? false,
        options_json: [],
        sort_order: sortBase + (v.sort_order ?? 0),
        select_options,
        default_value: v.default_value ?? null,
      };
    }
  }
  if (t === 'text') {
    return {
      field_key: v.key,
      label: v.label,
      field_type: 'text',
      placeholder: v.unit_label ?? null,
      required: v.required ?? false,
      options_json: [],
      sort_order: sortBase + (v.sort_order ?? 0),
      default_value: v.default_value ?? null,
    };
  }
  if (t === 'multi_select') {
    return {
      field_key: v.key,
      label: v.label,
      field_type: 'textarea',
      placeholder: v.unit_label ?? 'Comma-separated values',
      required: v.required ?? false,
      options_json: [],
      sort_order: sortBase + (v.sort_order ?? 0),
      default_value: v.default_value ?? null,
    };
  }
  if (t === 'number' || t === 'quantity' || t === 'currency' || t === 'area' || t === 'range') {
    return {
      field_key: v.key,
      label: v.label,
      field_type: 'number',
      placeholder: v.unit_label ?? null,
      required: v.required ?? false,
      options_json: [],
      sort_order: sortBase + (v.sort_order ?? 0),
      default_value: v.default_value ?? null,
    };
  }
  // Unknown variable types → textarea
  return {
    field_key: v.key,
    label: v.label,
    field_type: 'textarea',
    placeholder: v.unit_label ?? null,
    required: v.required ?? false,
    options_json: [],
    sort_order: sortBase + (v.sort_order ?? 0),
    default_value: v.default_value ?? null,
  };
}

export async function loadWidgetQuoteEmbedBundle(
  supabase: SupabaseClient,
  organizationId: string
): Promise<{
  fields: WidgetQuotePublicField[];
  heading_text: string;
  submit_button_label: string;
  quote_form_config: QuoteFormConfigShape;
}> {
  const { data: settings } = await supabase
    .from('business_settings')
    .select('quote_form_config')
    .eq('organization_id', organizationId)
    .maybeSingle();

  const qfc = normalizeQuoteFormConfig(settings?.quote_form_config);
  const nameRequired = qfc.name_required !== false;
  const emailRequired = qfc.email_required !== false;
  const phoneRequired = qfc.phone_required === true;

  const context = await getPricingContext(supabase, { organizationId });
  const variables = (context?.variables ?? []) as QuotePricingVariableRow[];
  const serviceId = context?.services?.length === 1 ? context.services[0]!.id : null;
  const scopedVars = serviceId
    ? variables.filter((row) => !row.service_id || row.service_id === serviceId)
    : variables.filter((row) => !row.service_id);

  const contact: WidgetQuotePublicField[] = [
    {
      field_key: 'name',
      label: 'Name',
      field_type: 'text',
      placeholder: null,
      required: nameRequired,
      options_json: [],
      sort_order: 0,
    },
    {
      field_key: 'email',
      label: 'Email',
      field_type: 'email',
      placeholder: null,
      required: emailRequired,
      options_json: [],
      sort_order: 1,
    },
    {
      field_key: 'phone',
      label: phoneRequired ? 'Phone' : 'Phone (optional)',
      field_type: 'phone',
      placeholder: null,
      required: phoneRequired,
      options_json: [],
      sort_order: 2,
    },
  ];

  const VAR_SORT_BASE = 10;
  const dynamicFields = scopedVars.map((v) => mapVariableToEmbedField(v, VAR_SORT_BASE));

  const intro = (qfc.intro_text ?? '').trim();
  const heading_text = intro.length > 0 ? intro : 'Get a quote';
  const submit_label =
    (qfc.submit_button_label ?? '').trim() || DEFAULT_QFC.submit_button_label;

  return {
    fields: [...contact, ...dynamicFields],
    heading_text,
    submit_button_label: submit_label,
    quote_form_config: qfc,
  };
}
