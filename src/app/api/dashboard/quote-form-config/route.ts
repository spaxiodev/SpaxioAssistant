import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { sanitizeText } from '@/lib/validation';

export type QuoteFormConfig = {
  intro_text?: string;
  submit_button_label?: string;
  name_required?: boolean;
  email_required?: boolean;
  phone_required?: boolean;
  show_estimate_instantly?: boolean;
  show_exact_estimate?: boolean;
};

const DEFAULTS: QuoteFormConfig = {
  intro_text: '',
  submit_button_label: 'Submit quote request',
  name_required: true,
  email_required: true,
  phone_required: false,
  show_estimate_instantly: true,
  show_exact_estimate: true,
};

export async function GET() {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('business_settings')
      .select('quote_form_config')
      .eq('organization_id', orgId)
      .single();

    if (error || !data) {
      return NextResponse.json({ ...DEFAULTS });
    }

    const raw = (data as { quote_form_config?: QuoteFormConfig }).quote_form_config;
    const config =
      raw && typeof raw === 'object'
        ? {
            intro_text: typeof raw.intro_text === 'string' ? raw.intro_text : DEFAULTS.intro_text,
            submit_button_label:
              typeof raw.submit_button_label === 'string'
                ? raw.submit_button_label
                : DEFAULTS.submit_button_label,
            name_required:
              typeof raw.name_required === 'boolean' ? raw.name_required : DEFAULTS.name_required,
            email_required:
              typeof raw.email_required === 'boolean' ? raw.email_required : DEFAULTS.email_required,
            phone_required:
              typeof raw.phone_required === 'boolean' ? raw.phone_required : DEFAULTS.phone_required,
            show_estimate_instantly:
              typeof raw.show_estimate_instantly === 'boolean'
                ? raw.show_estimate_instantly
                : DEFAULTS.show_estimate_instantly,
            show_exact_estimate:
              typeof raw.show_exact_estimate === 'boolean'
                ? raw.show_exact_estimate
                : DEFAULTS.show_exact_estimate,
          }
        : DEFAULTS;

    return NextResponse.json(config);
  } catch (e) {
    console.error('quote-form-config GET', e);
    return NextResponse.json({ error: 'Failed to load config' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const body = (await request.json().catch(() => ({}))) as Partial<QuoteFormConfig>;
    const supabase = createAdminClient();

    const update: Partial<QuoteFormConfig> = {};
    if (body.intro_text !== undefined) update.intro_text = sanitizeText(body.intro_text, 500) ?? '';
    if (body.submit_button_label !== undefined)
      update.submit_button_label = sanitizeText(body.submit_button_label, 100) ?? DEFAULTS.submit_button_label!;
    if (typeof body.name_required === 'boolean') update.name_required = body.name_required;
    if (typeof body.email_required === 'boolean') update.email_required = body.email_required;
    if (typeof body.phone_required === 'boolean') update.phone_required = body.phone_required;
    if (typeof body.show_estimate_instantly === 'boolean')
      update.show_estimate_instantly = body.show_estimate_instantly;
    if (typeof body.show_exact_estimate === 'boolean')
      update.show_exact_estimate = body.show_exact_estimate;

    const { data: existing } = await supabase
      .from('business_settings')
      .select('id, quote_form_config')
      .eq('organization_id', orgId)
      .single();

    const current =
      existing && (existing as { quote_form_config?: QuoteFormConfig }).quote_form_config
        ? ((existing as { quote_form_config?: QuoteFormConfig }).quote_form_config as QuoteFormConfig)
        : {};
    const merged = { ...DEFAULTS, ...current, ...update };

    const { error } = await supabase
      .from('business_settings')
      .update({
        quote_form_config: merged,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', orgId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(merged);
  } catch (e) {
    console.error('quote-form-config PUT', e);
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
  }
}
