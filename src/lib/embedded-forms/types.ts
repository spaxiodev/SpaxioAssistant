/** Core types for the Embedded Forms system. */

export type FormType = 'lead_form' | 'quote_form' | 'custom_request_form';

export type FieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'textarea'
  | 'number'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'date';

export type SubmissionStatus =
  | 'new'
  | 'reviewed'
  | 'contacted'
  | 'converted'
  | 'archived';

export type SubmissionSource = 'embed' | 'widget' | 'api';

export type ThemeMode = 'inherit' | 'light' | 'dark' | 'auto';

export interface FormField {
  id: string;
  form_id: string;
  field_key: string;
  label: string;
  field_type: FieldType;
  placeholder?: string | null;
  required: boolean;
  options_json: string[];
  sort_order: number;
  pricing_mapping_json: Record<string, unknown>;
  conditional_logic_json: Record<string, unknown>;
  created_at: string;
}

/** Shape sent from the form builder for create/update. */
export interface FormFieldInput {
  id?: string;
  field_key: string;
  label: string;
  field_type: FieldType;
  placeholder?: string;
  required: boolean;
  options_json: string[];
  sort_order: number;
  pricing_mapping_json?: Record<string, unknown>;
}

export type QuoteFormFieldSource = 'custom' | 'widget_ai';

export interface EmbeddedForm {
  id: string;
  organization_id: string;
  name: string;
  slug: string | null;
  form_type: FormType;
  /** For quote_form: custom builder vs mirror AI widget quote form. */
  quote_form_field_source?: QuoteFormFieldSource;
  is_active: boolean;
  success_message: string | null;
  theme_settings: {
    primary_color?: string;
    border_radius?: string;
  };
  pricing_profile_id: string | null;
  created_at: string;
  updated_at: string;
  fields?: FormField[];
}

export interface FormSubmission {
  id: string;
  form_id: string;
  organization_id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  answers_json: Record<string, unknown>;
  calculated_total: number | null;
  quote_breakdown_json: Record<string, unknown>;
  source: SubmissionSource;
  status: SubmissionStatus;
  quote_request_id: string | null;
  created_at: string;
  updated_at: string;
  /** Joined form name (available when queried with form join) */
  form_name?: string;
}

/** Public form config returned from /api/embed/form/[id] */
export interface PublicFormConfig {
  id: string;
  name: string;
  form_type: FormType;
  success_message: string | null;
  theme_settings: {
    primary_color?: string;
    border_radius?: string;
  };
  /** When quote_form uses the same fields as the AI widget (server-resolved). */
  quote_form_field_source?: 'custom' | 'widget_ai';
  /** Shown above fields (e.g. AI widget intro text). */
  heading_text?: string | null;
  /** Primary submit button label. */
  submit_button_label?: string | null;
  fields: Array<{
    field_key: string;
    label: string;
    field_type: FieldType;
    placeholder?: string | null;
    required: boolean;
    options_json: string[];
    sort_order: number;
    select_options?: { value: string; label: string }[];
    default_value?: string | null;
  }>;
}
