/**
 * Setup action definitions and execution for the AI Setup Assistant.
 * The assistant uses these tools to read/write real settings.
 * See safe-actions.ts for which actions auto-apply vs require confirmation.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { sanitizeText, sanitizeFaq } from '@/lib/validation';
import { ingestDocumentBatchEmbed } from '@/lib/knowledge/ingest';
import { fetchWebsiteText } from '@/lib/website-auto-setup/fetch-and-extract';
import { analyzeWebsiteWithAI } from '@/lib/website-auto-setup/analyze-website';
import type { AssistantPlannerConfig, CaptureField } from './types';
import { getAISetupTemplateByKey, getRecommendedTemplatesForBusinessType } from './templates';
import type { WebsiteAnalysis } from '@/lib/website-auto-setup/types';

export type SetupActionName =
  | 'get_business_settings'
  | 'update_business_settings'
  | 'get_widget_config'
  | 'get_agents'
  | 'get_setup_status'
  | 'analyze_website'
  | 'ingest_website_source'
  | 'apply_safe_setup_draft'
  | 'update_planner_draft'
  | 'create_recommended_automation';

/** Schema for action parameters (used by OpenAI tools) */
export const SETUP_ACTION_SCHEMAS: Record<
  SetupActionName,
  { description: string; parameters: Record<string, unknown> }
> = {
  get_business_settings: {
    description: 'Get current business settings (name, description, services, FAQs, contact, tone, welcome message).',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  update_business_settings: {
    description:
      'Update business settings. Use for: business_name, company_description, services_offered, faq, tone_of_voice, contact_email, phone, chatbot_welcome_message, primary_brand_color, lead_notification_email. Safe to auto-apply unless replacing existing custom content.',
    parameters: {
      type: 'object',
      properties: {
        business_name: { type: 'string', description: 'Business name' },
        company_description: { type: 'string', description: '1-3 sentence company description' },
        services_offered: { type: 'array', items: { type: 'string' }, description: 'List of services' },
        faq: {
          type: 'array',
          items: { type: 'object', properties: { q: { type: 'string' }, a: { type: 'string' } }, required: ['q', 'a'] },
          description: 'FAQ items {q, a}',
        },
        tone_of_voice: { type: 'string', description: 'e.g. professional, friendly' },
        contact_email: { type: 'string', description: 'Contact email' },
        phone: { type: 'string', description: 'Phone number' },
        chatbot_welcome_message: { type: 'string', description: 'Widget welcome message' },
        primary_brand_color: { type: 'string', description: 'Hex color e.g. #0f172a' },
        lead_notification_email: { type: 'string', description: 'Where to send lead notifications' },
      },
      required: [],
    },
  },
  get_widget_config: {
    description: 'Get current widget configuration (welcome message, brand color, logo, position).',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  get_agents: {
    description: 'List all AI agents for this organization.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  get_setup_status: {
    description: 'Get current setup status: planner draft, what is applied, what needs approval.',
    parameters: {
      type: 'object',
      properties: {
        session_id: { type: 'string', description: 'Optional session ID to get planner config' },
      },
      required: [],
    },
  },
  analyze_website: {
    description: 'Fetch and analyze website content. Returns business_name, services, faq, contact, tone. Use when user provides a website URL.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Website URL (https://...)' },
        business_type: { type: 'string', description: 'Optional business type hint' },
        description: { type: 'string', description: 'Optional short description' },
      },
      required: ['url'],
    },
  },
  ingest_website_source: {
    description: 'Add website content to knowledge base so the assistant can answer from it. Call after analyze_website.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Website URL' },
        content: { type: 'string', description: 'Pre-fetched content (from analyze_website) or empty to fetch' },
      },
      required: ['url'],
    },
  },
  apply_safe_setup_draft: {
    description:
      'Apply safe draft fields to live settings. Safe: business description, services, FAQs, welcome message draft, tone, recommended lead fields, basic widget copy. Does NOT publish or change customer-facing live state destructively.',
    parameters: {
      type: 'object',
      properties: {
        draft: {
          type: 'object',
          description: 'Draft config with business_name, company_description, services_offered, faq, tone_of_voice, contact_email, phone, chatbot_welcome_message, primary_brand_color, capture_fields',
          properties: {
            business_name: { type: 'string' },
            company_description: { type: 'string' },
            services_offered: { type: 'array', items: { type: 'string' } },
            faq: { type: 'array', items: { type: 'object', properties: { q: { type: 'string' }, a: { type: 'string' } } } },
            tone_of_voice: { type: 'string' },
            contact_email: { type: 'string' },
            phone: { type: 'string' },
            chatbot_welcome_message: { type: 'string' },
            primary_brand_color: { type: 'string' },
            capture_fields: {
              type: 'array',
              items: { type: 'object', properties: { key: { type: 'string' }, label: { type: 'string' }, type: { type: 'string' }, required: { type: 'boolean' } } },
            },
          },
        },
      },
      required: ['draft'],
    },
  },
  update_planner_draft: {
    description:
      'Update the planner config draft (session). Use to set chatbot_name, primary_goal, capture_fields, automation_type, notification_email, widget_config. This updates the draft only; user must approve/publish to go live.',
    parameters: {
      type: 'object',
      properties: {
        chatbot_name: { type: 'string' },
        primary_goal: { type: 'string' },
        capture_fields: { type: 'array', items: { type: 'object' } },
        automation_type: { type: 'string' },
        notification_email: { type: 'string' },
        widget_config: { type: 'object', properties: { welcomeMessage: { type: 'string' }, primaryColor: { type: 'string' } } },
      },
      required: [],
    },
  },
  create_recommended_automation: {
    description:
      'Create a recommended automation (e.g. lead notification, quote notification). REQUIRES USER CONFIRMATION before creating automations that send messages externally.',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['lead_notification', 'quote_notification'], description: 'Automation type' },
        to_email: { type: 'string', description: 'Email to notify' },
      },
      required: ['type', 'to_email'],
    },
  },
};

export type SetupActionResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string; requiresConfirmation?: boolean };

export async function executeSetupAction(
  supabase: SupabaseClient,
  orgId: string,
  actionName: SetupActionName,
  args: Record<string, unknown>,
  context?: { sessionId?: string; plannerConfig?: AssistantPlannerConfig }
): Promise<SetupActionResult> {
  switch (actionName) {
    case 'get_business_settings': {
      const { data, error } = await supabase
        .from('business_settings')
        .select(
          'business_name, industry, company_description, services_offered, faq, tone_of_voice, contact_email, phone, lead_notification_email, primary_brand_color, chatbot_name, chatbot_welcome_message, widget_enabled'
        )
        .eq('organization_id', orgId)
        .single();
      if (error || !data) return { ok: false, error: 'Business settings not found' };
      return { ok: true, data };
    }
    case 'update_business_settings': {
      const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (args.business_name !== undefined) payload.business_name = sanitizeText(args.business_name, 500) || null;
      if (args.company_description !== undefined) payload.company_description = sanitizeText(args.company_description, 4000) || null;
      if (args.services_offered !== undefined) {
        payload.services_offered = Array.isArray(args.services_offered)
          ? (args.services_offered as unknown[]).map((s) => sanitizeText(String(s), 200)).filter(Boolean)
          : [];
      }
      if (args.faq !== undefined) payload.faq = sanitizeFaq(args.faq);
      if (args.tone_of_voice !== undefined) payload.tone_of_voice = sanitizeText(args.tone_of_voice, 200) || null;
      if (args.contact_email !== undefined) payload.contact_email = sanitizeText(args.contact_email, 320) || null;
      if (args.phone !== undefined) payload.phone = sanitizeText(args.phone, 50) || null;
      if (args.chatbot_welcome_message !== undefined) payload.chatbot_welcome_message = sanitizeText(args.chatbot_welcome_message, 500) || null;
      if (args.primary_brand_color !== undefined) payload.primary_brand_color = sanitizeText(args.primary_brand_color, 50) || null;
      if (args.lead_notification_email !== undefined) payload.lead_notification_email = sanitizeText(args.lead_notification_email, 320) || null;

      const { error } = await supabase
        .from('business_settings')
        .update(payload)
        .eq('organization_id', orgId);
      if (error) return { ok: false, error: error.message };
      return { ok: true, data: { updated: Object.keys(payload).filter((k) => k !== 'updated_at') } };
    }
    case 'get_widget_config': {
      const { data, error } = await supabase
        .from('business_settings')
        .select('chatbot_welcome_message, primary_brand_color, widget_logo_url, chatbot_name, business_name')
        .eq('organization_id', orgId)
        .single();
      if (error || !data) return { ok: false, error: 'Widget config not found' };
      return {
        ok: true,
        data: {
          welcomeMessage: data.chatbot_welcome_message ?? 'Hi! How can I help you today?',
          primaryColor: data.primary_brand_color ?? '#0f172a',
          logoUrl: data.widget_logo_url,
          chatbotName: data.chatbot_name ?? data.business_name ?? 'Assistant',
        },
      };
    }
    case 'get_agents': {
      const { data, error } = await supabase
        .from('agents')
        .select('id, name, description, role_type, widget_enabled')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (error) return { ok: false, error: error.message };
      return { ok: true, data: data ?? [] };
    }
    case 'get_setup_status': {
      const sessionId = (args.session_id ?? context?.sessionId) as string | undefined;
      let plannerConfig: AssistantPlannerConfig | null = context?.plannerConfig ?? null;
      if (sessionId && !plannerConfig) {
        const { data: session } = await supabase
          .from('ai_setup_sessions')
          .select('planner_config, status')
          .eq('id', sessionId)
          .eq('organization_id', orgId)
          .single();
        if (session?.planner_config) plannerConfig = session.planner_config as AssistantPlannerConfig;
      }
      const { data: settings } = await supabase
        .from('business_settings')
        .select('business_name, chatbot_welcome_message')
        .eq('organization_id', orgId)
        .single();
      return {
        ok: true,
        data: {
          planner_draft: plannerConfig,
          live_business_name: settings?.business_name,
          live_welcome_message: settings?.chatbot_welcome_message,
        },
      };
    }
    case 'analyze_website': {
      const url = typeof args.url === 'string' ? args.url.trim() : '';
      if (!url || !url.startsWith('http')) return { ok: false, error: 'Valid website URL required' };
      try {
        const text = await fetchWebsiteText(url);
        const analysis = await analyzeWebsiteWithAI(
          text,
          typeof args.business_type === 'string' ? args.business_type : null,
          typeof args.description === 'string' ? args.description : null
        );
        return { ok: true, data: { ...analysis, _raw_content_length: text.length } };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Website analysis failed';
        return { ok: false, error: msg };
      }
    }
    case 'ingest_website_source': {
      const url = typeof args.url === 'string' ? args.url.trim() : '';
      if (!url || !url.startsWith('http')) return { ok: false, error: 'Valid website URL required' };
      let content = typeof args.content === 'string' ? args.content : '';
      if (!content) {
        try {
          content = await fetchWebsiteText(url);
        } catch {
          return { ok: false, error: 'Could not fetch website' };
        }
      }

      const { data: existingSource } = await supabase
        .from('knowledge_sources')
        .select('id')
        .eq('organization_id', orgId)
        .eq('source_type', 'website_crawl')
        .limit(1)
        .maybeSingle();

      let sourceId: string;
      if (existingSource?.id) {
        sourceId = existingSource.id;
      } else {
        const { data: newSource, error: createErr } = await supabase
          .from('knowledge_sources')
          .insert({
            organization_id: orgId,
            name: `Website: ${new URL(url).hostname}`,
            source_type: 'website_crawl',
            config: { url },
          })
          .select('id')
          .single();
        if (createErr || !newSource) return { ok: false, error: createErr?.message ?? 'Failed to create source' };
        sourceId = newSource.id;
      }

      const safeContent = content.slice(0, 100_000);
      const result = await ingestDocumentBatchEmbed(supabase, {
        sourceId,
        title: url,
        content: safeContent,
        externalId: url,
        metadata: { url },
        embed: true,
      });
      await supabase
        .from('knowledge_sources')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', sourceId);
      return { ok: true, data: { sourceId, chunksCreated: result.chunksCreated } };
    }
    case 'apply_safe_setup_draft': {
      const draft = args.draft as Record<string, unknown> | undefined;
      if (!draft || typeof draft !== 'object') return { ok: false, error: 'Invalid draft' };
      const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (typeof draft.business_name === 'string' && draft.business_name.trim())
        payload.business_name = sanitizeText(draft.business_name, 500);
      if (typeof draft.company_description === 'string' && draft.company_description.trim())
        payload.company_description = sanitizeText(draft.company_description, 4000);
      if (Array.isArray(draft.services_offered) && draft.services_offered.length > 0)
        payload.services_offered = (draft.services_offered as unknown[]).map((s) => sanitizeText(String(s), 200)).filter(Boolean);
      if (Array.isArray(draft.faq) && draft.faq.length > 0) payload.faq = sanitizeFaq(draft.faq);
      if (typeof draft.tone_of_voice === 'string' && draft.tone_of_voice.trim())
        payload.tone_of_voice = sanitizeText(draft.tone_of_voice, 200);
      if (typeof draft.contact_email === 'string' && draft.contact_email.trim())
        payload.contact_email = sanitizeText(draft.contact_email, 320);
      if (typeof draft.phone === 'string' && draft.phone.trim()) payload.phone = sanitizeText(draft.phone, 50);
      if (typeof draft.chatbot_welcome_message === 'string' && draft.chatbot_welcome_message.trim())
        payload.chatbot_welcome_message = sanitizeText(draft.chatbot_welcome_message, 500);
      if (typeof draft.primary_brand_color === 'string' && draft.primary_brand_color.trim())
        payload.primary_brand_color = sanitizeText(draft.primary_brand_color, 50);
      if (draft.quote_form_config && typeof draft.quote_form_config === 'object') {
        const qfc = draft.quote_form_config as Record<string, unknown>;
        const merged: Record<string, unknown> = {
          intro_text: typeof qfc.intro_text === 'string' ? sanitizeText(qfc.intro_text, 500) ?? '' : undefined,
          submit_button_label: typeof qfc.submit_button_label === 'string' ? sanitizeText(qfc.submit_button_label, 100) ?? 'Submit quote request' : undefined,
          name_required: typeof qfc.name_required === 'boolean' ? qfc.name_required : undefined,
          email_required: typeof qfc.email_required === 'boolean' ? qfc.email_required : undefined,
          phone_required: typeof qfc.phone_required === 'boolean' ? qfc.phone_required : undefined,
          show_estimate_instantly: typeof qfc.show_estimate_instantly === 'boolean' ? qfc.show_estimate_instantly : undefined,
          show_exact_estimate: typeof qfc.show_exact_estimate === 'boolean' ? qfc.show_exact_estimate : undefined,
        };
        const clean: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(merged)) if (v !== undefined) clean[k] = v;
        if (Object.keys(clean).length > 0) payload.quote_form_config = clean;
      }

      const { data: existing } = await supabase
        .from('business_settings')
        .select('id')
        .eq('organization_id', orgId)
        .single();

      if (existing?.id) {
        const { error } = await supabase
          .from('business_settings')
          .update(payload)
          .eq('organization_id', orgId);
        if (error) return { ok: false, error: error.message };
      } else {
        const { error } = await supabase
          .from('business_settings')
          .insert({ organization_id: orgId, ...payload });
        if (error) return { ok: false, error: error.message };
      }
      return { ok: true, data: { applied: Object.keys(payload).filter((k) => k !== 'updated_at') } };
    }
    case 'update_planner_draft': {
      // This is handled in the chat route by merging into planner_config
      return { ok: true, data: { message: 'Planner draft will be updated by the chat handler' } };
    }
    case 'create_recommended_automation': {
      // REQUIRES CONFIRMATION - we return requiresConfirmation so the assistant asks first
      return { ok: false, error: 'Automation creation requires user confirmation. Ask the user to approve.', requiresConfirmation: true };
    }
    default:
      return { ok: false, error: `Unknown action: ${actionName}` };
  }
}

/**
 * Build planner draft from website analysis for infer→draft flow.
 */
export function buildPlannerDraftFromAnalysis(
  analysis: WebsiteAnalysis,
  businessType?: string
): Partial<AssistantPlannerConfig> {
  const templates = businessType ? getRecommendedTemplatesForBusinessType(businessType) : [];
  const leadTemplate = getAISetupTemplateByKey('lead_capture');
  const captureFields: CaptureField[] = leadTemplate?.defaultCaptureFields?.map((f) => ({
    key: f.key,
    label: f.label,
    type: f.type as CaptureField['type'],
    required: f.required ?? false,
  })) ?? [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'email', label: 'Email', type: 'email', required: true },
    { key: 'phone', label: 'Phone', type: 'phone' },
    { key: 'message', label: 'Message', type: 'textarea' },
  ];

  const welcomeMessage = analysis.business_name
    ? `Hi! I'm here to help with ${analysis.business_name}. What can I do for you today?`
    : "Hi! I'm here to help. What can I do for you today?";

  return {
    chatbot_name: analysis.business_name ? `${analysis.business_name} Assistant` : 'Assistant',
    business_type: businessType ?? undefined,
    primary_goal: analysis.company_description ?? 'Help visitors and capture leads.',
    capture_fields: captureFields,
    automation_type: templates.length > 0 ? templates[0].key : 'lead_capture',
    applied_templates: templates.slice(0, 3).map((t) => t.key),
    notification_email: analysis.contact_email ?? undefined,
    widget_enabled: true,
    widget_config: {
      welcomeMessage,
      primaryColor: undefined,
    },
  };
}
