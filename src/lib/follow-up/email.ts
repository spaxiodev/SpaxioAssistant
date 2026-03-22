import { Resend } from 'resend';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AutomationRunInput } from '@/lib/automations/types';
import { emailLayout, escapeHtml } from '@/lib/email';
import { resolveTenantOutboundFromAddress } from '@/lib/email/resend-from';
import { generateFollowUpOutput } from '@/lib/follow-up/generate-follow-up';

export type FollowUpMode =
  | 'template_auto_send'
  | 'ai_generated_auto_send'
  | 'ai_draft_for_approval'
  | 'internal_only_notification';

type TemplateRow = {
  id: string;
  subject_template: string | null;
  body_template: string;
  subject_template_localized?: Record<string, string> | null;
  body_template_localized?: Record<string, string> | null;
  is_html: boolean;
  key: string;
};

type DraftPayload = {
  subject: string;
  bodyHtml: string;
  bodyText: string;
  templateId: string | null;
  aiOutput?: Record<string, unknown>;
};

type SendResult =
  | { status: 'sent'; externalId: string | null; draftId?: string | null; logId?: string }
  | { status: 'skipped'; reason: string; draftId?: string | null; logId?: string }
  | { status: 'failed'; reason: string; draftId?: string | null; logId?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string | null | undefined): email is string {
  return !!email && EMAIL_RE.test(email.trim());
}

function normalizeText(htmlOrText: string): string {
  return htmlOrText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeLanguageCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if (!v) return null;
  const two = v.includes('-') ? v.slice(0, 2) : v;
  const code = two.slice(0, 2);
  return code || null;
}

function nextStepTextForLanguage(language: string): string {
  const lang = normalizeLanguageCode(language) ?? 'en';
  if (lang === 'fr') return 'Nous reviendrons vers vous sous peu pour la prochaine étape.';
  return 'We will follow up shortly with the next step.';
}

function getLocalizedTemplateValue(
  localized: unknown,
  language: string
): string | null {
  if (!localized || typeof localized !== 'object') return null;
  const record = localized as Record<string, unknown>;
  const value = record[language];
  return typeof value === 'string' ? value : null;
}

function pickRecipient(input: AutomationRunInput): { email: string | null; name: string | null } {
  const email =
    (typeof input.customer_email === 'string' ? input.customer_email : null) ??
    (typeof input.lead?.email === 'string' ? input.lead.email : null) ??
    null;
  const name =
    (typeof input.customer_name === 'string' ? input.customer_name : null) ??
    (typeof input.lead?.name === 'string' ? input.lead.name : null) ??
    null;
  return { email: email?.trim() || null, name: name?.trim() || null };
}

function renderTemplate(
  template: string,
  input: AutomationRunInput,
  businessName: string | null,
  nextStepText: string
): string {
  const vars: Record<string, string> = {
    customer_name:
      (typeof input.customer_name === 'string' ? input.customer_name : null) ??
      (typeof input.lead?.name === 'string' ? input.lead.name : null) ??
      'there',
    business_name: businessName ?? 'our team',
    customer_email:
      (typeof input.customer_email === 'string' ? input.customer_email : null) ??
      (typeof input.lead?.email === 'string' ? input.lead.email : null) ??
      '',
    customer_phone:
      (typeof input.customer_phone === 'string' ? input.customer_phone : null) ??
      (typeof input.lead?.phone === 'string' ? input.lead.phone : null) ??
      '',
    service_requested:
      (typeof input.service_requested === 'string' ? input.service_requested : null) ??
      (typeof input.service_type === 'string' ? input.service_type : null) ??
      (typeof input.lead?.message === 'string' ? input.lead.message : null) ??
      '',
    quote_details: typeof input.form_answers === 'object' ? JSON.stringify(input.form_answers).slice(0, 800) : '',
    lead_message: (typeof input.lead?.message === 'string' ? input.lead.message : null) ?? '',
    conversation_summary:
      (typeof input.conversation_summary === 'string' ? input.conversation_summary : null) ??
      (typeof input.transcript_snippet === 'string' ? input.transcript_snippet : null) ??
      '',
    next_step: nextStepText,
    business_email: (typeof input.business_email === 'string' ? input.business_email : null) ?? '',
    business_phone: (typeof input.business_phone === 'string' ? input.business_phone : null) ?? '',
    customer_language: (typeof (input as any).customer_language === 'string' ? (input as any).customer_language : null) ?? '',
  };

  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => escapeHtml(vars[key] ?? ''));
}

async function getBusinessContext(supabase: SupabaseClient, organizationId: string) {
  const { data } = await supabase
    .from('business_settings')
    .select('business_name, company_description, industry, tone_of_voice, services_offered, pricing_notes, faq, contact_email, phone, default_language')
    .eq('organization_id', organizationId)
    .maybeSingle();
  return data ?? null;
}

async function getTemplate(
  supabase: SupabaseClient,
  organizationId: string,
  key: string | null
): Promise<TemplateRow | null> {
  let q = supabase
    .from('follow_up_templates')
    .select('id, subject_template, body_template, subject_template_localized, body_template_localized, is_html, key')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .limit(1);
  q = key ? q.eq('key', key) : q.eq('key', 'lead_confirmation');
  const { data } = await q.maybeSingle();
  return (data as TemplateRow | null) ?? null;
}

async function buildDraftPayload(params: {
  supabase: SupabaseClient;
  organizationId: string;
  input: AutomationRunInput;
  mode: FollowUpMode;
  templateKey: string | null;
  actionConfig?: Record<string, unknown>;
  customerLanguage?: string | null;
}): Promise<DraftPayload> {
  const { supabase, organizationId, input, mode, templateKey, actionConfig, customerLanguage } = params;
  const settings = await getBusinessContext(supabase, organizationId);
  const businessName = typeof settings?.business_name === 'string' ? settings.business_name : null;
  const businessDefaultLanguage = normalizeLanguageCode(settings?.default_language) ?? 'en';
  const resolvedCustomerLanguage = normalizeLanguageCode(customerLanguage ?? (input as any).customer_language) ?? null;
  const templateLanguage = mode === 'internal_only_notification' ? businessDefaultLanguage : (resolvedCustomerLanguage ?? businessDefaultLanguage);

  if (mode === 'template_auto_send' || mode === 'internal_only_notification') {
    const manualSubject =
      actionConfig && typeof actionConfig.manual_subject === 'string'
        ? String(actionConfig.manual_subject).slice(0, 250)
        : null;
    const manualBodyText =
      actionConfig && typeof actionConfig.manual_body_text === 'string'
        ? String(actionConfig.manual_body_text).slice(0, 5000)
        : null;
    const manualBodyHtml =
      actionConfig && typeof actionConfig.manual_body_html === 'string'
        ? String(actionConfig.manual_body_html).slice(0, 30000)
        : null;
    if (manualSubject && (manualBodyText || manualBodyHtml)) {
      return {
        subject: manualSubject,
        bodyHtml:
          manualBodyHtml ??
          emailLayout({
            title: manualSubject,
            badge: 'Follow-up',
            content: `<p>${escapeHtml(manualBodyText ?? '')}</p>`,
            language: templateLanguage,
          }),
        bodyText: manualBodyText ?? normalizeText(manualBodyHtml ?? ''),
        templateId: null,
      };
    }
    const template = await getTemplate(supabase, organizationId, templateKey);
    const subjectTemplate =
      getLocalizedTemplateValue(template?.subject_template_localized, templateLanguage) ??
      template?.subject_template ??
      'Thanks for contacting {{business_name}}';
    const bodyTemplate =
      getLocalizedTemplateValue(template?.body_template_localized, templateLanguage) ??
      template?.body_template ??
      'We received your request.';
    const subjectRaw = renderTemplate(
      subjectTemplate,
      input,
      businessName,
      nextStepTextForLanguage(templateLanguage)
    );
    const bodyRaw = renderTemplate(bodyTemplate, input, businessName, nextStepTextForLanguage(templateLanguage));
    const html = template?.is_html
      ? emailLayout({ title: subjectRaw || 'Follow-up', badge: 'Follow-up', content: `<p>${bodyRaw}</p>`, language: templateLanguage })
      : emailLayout({ title: subjectRaw || 'Follow-up', badge: 'Follow-up', content: `<p>${bodyRaw}</p>`, language: templateLanguage });
    return {
      subject: normalizeText(subjectRaw).slice(0, 250),
      bodyHtml: html,
      bodyText: normalizeText(bodyRaw).slice(0, 5000),
      templateId: template?.id ?? null,
    };
  }

  const aiOut = await generateFollowUpOutput({
    organizationId,
    sourceType: 'conversation_milestone',
    sourceId: String(input.lead_id ?? input.quote_request_id ?? input.conversation_id ?? crypto.randomUUID()),
    context: {
      customerLanguage: resolvedCustomerLanguage,
      businessDefaultLanguage,
      lead: input.lead
        ? {
            id: String(input.lead_id ?? ''),
            name: String(input.lead.name ?? ''),
            email: String(input.lead.email ?? ''),
            phone: (input.lead.phone as string | null | undefined) ?? null,
            message: (input.lead.message as string | null | undefined) ?? null,
            requested_service: (input.service_requested as string | null | undefined) ?? null,
          }
        : null,
      quoteRequest: input.quote_request_id
        ? {
            id: String(input.quote_request_id),
            customer_name: String(input.customer_name ?? input.lead?.name ?? ''),
            customer_email: (input.customer_email as string | null | undefined) ?? null,
            customer_phone: (input.customer_phone as string | null | undefined) ?? null,
            service_type: (input.service_type as string | null | undefined) ?? null,
            project_details: (input.project_details as string | null | undefined) ?? null,
            form_answers: (input.form_answers as Record<string, unknown> | null | undefined) ?? null,
            estimate_total: (input.estimate_total as number | null | undefined) ?? null,
            estimate_low: (input.estimate_low as number | null | undefined) ?? null,
            estimate_high: (input.estimate_high as number | null | undefined) ?? null,
          }
        : null,
      conversationSnippet: (input.transcript_snippet as string | null | undefined) ?? null,
      businessName,
      industry: typeof settings?.industry === 'string' ? settings.industry : null,
      businessDescription: typeof settings?.company_description === 'string' ? settings.company_description : null,
      toneOfVoice: typeof settings?.tone_of_voice === 'string' ? settings.tone_of_voice : null,
      services: Array.isArray(settings?.services_offered) ? (settings?.services_offered as string[]) : null,
      pricingNotes: typeof settings?.pricing_notes === 'string' ? settings.pricing_notes : null,
      faq: settings?.faq ?? null,
    },
  });

  const subject = (aiOut.draft_email_subject || `Follow-up from ${businessName ?? 'our team'}`).slice(0, 250);
  const bodyText = (aiOut.draft_email_body || aiOut.recommended_action || 'Thank you for contacting us.').slice(0, 5000);
  const safeHtml = emailLayout({
    title: subject,
    badge: 'AI Follow-up',
    content: `<p>${escapeHtml(bodyText)}</p>`,
    language: templateLanguage,
  });

  return {
    subject,
    bodyHtml: safeHtml,
    bodyText,
    templateId: null,
    aiOutput: aiOut as unknown as Record<string, unknown>,
  };
}

async function insertSendLog(supabase: SupabaseClient, row: Record<string, unknown>): Promise<string | null> {
  const { data } = await supabase.from('follow_up_send_logs').insert(row).select('id').maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export async function executeFollowUpAction(params: {
  supabase: SupabaseClient;
  organizationId: string;
  automationId: string | null;
  automationName: string | null;
  input: AutomationRunInput;
  actionConfig: Record<string, unknown>;
}): Promise<SendResult> {
  const { supabase, organizationId, automationId, input, actionConfig } = params;
  const mode = (actionConfig.mode as FollowUpMode | undefined) ?? 'ai_draft_for_approval';
  const templateKey = typeof actionConfig.template_key === 'string' ? actionConfig.template_key : null;
  const dedupeWindowKey =
    (typeof input.trigger_type === 'string' ? input.trigger_type : 'automation') +
    ':' +
    String(input.lead_id ?? input.quote_request_id ?? input.conversation_id ?? 'none') +
    ':' +
    String(automationId ?? 'no_automation');
  const dedupeKey = dedupeWindowKey.slice(0, 220);
  const { email: customerEmail, name: customerName } = pickRecipient(input);

  const resolveCustomerLanguage = async (): Promise<string | null> => {
    const fromPayload = normalizeLanguageCode(
      (input as any).customer_language ?? (input as any).customerLanguage ?? (input as any).recipient_language
    );
    if (fromPayload) return fromPayload;

    if (typeof input.quote_request_id === 'string') {
      const { data } = await supabase
        .from('quote_requests')
        .select('customer_language')
        .eq('id', input.quote_request_id)
        .eq('organization_id', organizationId)
        .maybeSingle();
      const lang = normalizeLanguageCode((data as any)?.customer_language);
      if (lang) return lang;
    }

    if (typeof input.lead_id === 'string') {
      const { data } = await supabase
        .from('leads')
        .select('customer_language')
        .eq('id', input.lead_id)
        .eq('organization_id', organizationId)
        .maybeSingle();
      const lang = normalizeLanguageCode((data as any)?.customer_language);
      if (lang) return lang;
    }

    if (typeof input.conversation_id === 'string') {
      const { data } = await supabase
        .from('conversations')
        .select('conversation_language')
        .eq('id', input.conversation_id)
        .maybeSingle();
      return normalizeLanguageCode((data as any)?.conversation_language);
    }

    return null;
  };

  const customerLanguageResolved = await resolveCustomerLanguage();
  const { data: bizSettings } = await supabase
    .from('business_settings')
    .select('default_language, business_name')
    .eq('organization_id', organizationId)
    .maybeSingle();
  const businessDefaultLanguage = normalizeLanguageCode((bizSettings as any)?.default_language) ?? 'en';
  const tenantBusinessName =
    bizSettings && typeof (bizSettings as { business_name?: unknown }).business_name === 'string'
      ? (bizSettings as { business_name: string }).business_name
      : null;
  const recipientLanguage = mode === 'internal_only_notification' ? businessDefaultLanguage : customerLanguageResolved ?? businessDefaultLanguage;

  const internalEmail =
    (typeof actionConfig.internal_to_email === 'string' && actionConfig.internal_to_email.trim()) || null;
  const recipientEmail = mode === 'internal_only_notification' ? internalEmail : customerEmail;
  if (!isValidEmail(recipientEmail)) {
    const logId = await insertSendLog(supabase, {
      organization_id: organizationId,
      automation_id: automationId,
      source_event_type: String(input.trigger_type ?? 'unknown'),
      source_event_id: String(input.lead_id ?? input.quote_request_id ?? input.conversation_id ?? ''),
      dedupe_key: dedupeKey,
      recipient_email: recipientEmail ?? '',
      recipient_name: customerName,
      subject: 'Skipped follow-up',
      status: 'skipped_missing_email',
      error_message: 'Missing or invalid recipient email',
    });
    return { status: 'skipped', reason: 'Missing recipient email', logId: logId ?? undefined };
  }

  const existing = await supabase
    .from('follow_up_send_logs')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('dedupe_key', dedupeKey)
    .limit(1)
    .maybeSingle();
  if (existing.data?.id) {
    return { status: 'skipped', reason: 'Duplicate follow-up prevented', logId: existing.data.id as string };
  }

  const payload = await buildDraftPayload({
    supabase,
    organizationId,
    input,
    mode,
    templateKey,
    actionConfig,
    customerLanguage: customerLanguageResolved,
  });

  const { data: draft } = await supabase
    .from('follow_up_drafts')
    .insert({
      organization_id: organizationId,
      automation_id: automationId,
      source_event_type: String(input.trigger_type ?? 'unknown'),
      source_event_id: String(input.lead_id ?? input.quote_request_id ?? input.conversation_id ?? ''),
      source_type: String(input.trigger_type ?? 'automation'),
      source_id: (input.lead_id as string | undefined) ?? (input.quote_request_id as string | undefined) ?? null,
      lead_id: (input.lead_id as string | undefined) ?? null,
      conversation_id: (input.conversation_id as string | undefined) ?? null,
      quote_request_id: (input.quote_request_id as string | undefined) ?? null,
      template_id: payload.templateId,
      recipient_email: recipientEmail,
      recipient_name: customerName,
        recipient_language: recipientLanguage,
      subject: payload.subject,
      body_html: payload.bodyHtml,
      body_text: payload.bodyText,
      generation_mode: mode,
      status: mode === 'ai_draft_for_approval' ? 'pending_approval' : 'approved',
      ai_output: payload.aiOutput ?? null,
      ai_input: { input, actionConfig },
    })
    .select('id')
    .maybeSingle();

  const draftId = (draft?.id as string | undefined) ?? null;

  if (mode === 'ai_draft_for_approval') {
    return { status: 'skipped', reason: 'Draft created for approval', draftId };
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    const logId = await insertSendLog(supabase, {
      organization_id: organizationId,
      automation_id: automationId,
      follow_up_draft_id: draftId,
      source_event_type: String(input.trigger_type ?? 'unknown'),
      source_event_id: String(input.lead_id ?? input.quote_request_id ?? input.conversation_id ?? ''),
      dedupe_key: dedupeKey,
      recipient_email: recipientEmail,
      recipient_name: customerName,
      subject: payload.subject,
      body_html: payload.bodyHtml,
      body_text: payload.bodyText,
      provider: 'resend',
      status: 'failed',
      error_message: 'RESEND_API_KEY missing',
    });
    return { status: 'failed', reason: 'Email not configured', draftId, logId: logId ?? undefined };
  }

  const resend = new Resend(resendKey);
  try {
    const sent = await resend.emails.send({
      from: resolveTenantOutboundFromAddress(tenantBusinessName),
      to: [recipientEmail],
      replyTo: typeof actionConfig.reply_to === 'string' ? actionConfig.reply_to : undefined,
      subject: payload.subject,
      html: payload.bodyHtml,
      text: payload.bodyText,
    });
    const logId = await insertSendLog(supabase, {
      organization_id: organizationId,
      automation_id: automationId,
      follow_up_draft_id: draftId,
      source_event_type: String(input.trigger_type ?? 'unknown'),
      source_event_id: String(input.lead_id ?? input.quote_request_id ?? input.conversation_id ?? ''),
      dedupe_key: dedupeKey,
      recipient_email: recipientEmail,
      recipient_name: customerName,
      subject: payload.subject,
      body_html: payload.bodyHtml,
      body_text: payload.bodyText,
      provider: 'resend',
      provider_message_id: sent.data?.id ?? null,
      status: 'sent',
      metadata: { mode },
    });
    if (draftId) {
      await supabase
        .from('follow_up_drafts')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          send_log_id: logId,
        })
        .eq('id', draftId);
    }
    return { status: 'sent', externalId: sent.data?.id ?? null, draftId, logId: logId ?? undefined };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Failed to send follow-up';
    const logId = await insertSendLog(supabase, {
      organization_id: organizationId,
      automation_id: automationId,
      follow_up_draft_id: draftId,
      source_event_type: String(input.trigger_type ?? 'unknown'),
      source_event_id: String(input.lead_id ?? input.quote_request_id ?? input.conversation_id ?? ''),
      dedupe_key: dedupeKey,
      recipient_email: recipientEmail,
      recipient_name: customerName,
      subject: payload.subject,
      body_html: payload.bodyHtml,
      body_text: payload.bodyText,
      provider: 'resend',
      status: 'failed',
      error_message: reason.slice(0, 500),
    });
    if (draftId) {
      await supabase.from('follow_up_drafts').update({ status: 'failed' }).eq('id', draftId);
    }
    return { status: 'failed', reason, draftId, logId: logId ?? undefined };
  }
}
