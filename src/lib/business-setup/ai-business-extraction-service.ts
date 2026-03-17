/**
 * AI Business Extraction: single server-side extraction from combined business input.
 * Returns structured JSON for all sections (profile, services, knowledge, pricing, agents, automations, widget, ai_pages, branding).
 */

import OpenAI from 'openai';
import type {
  ExtractedBusinessProfile,
  ExtractedService,
  ExtractedKnowledge,
  ExtractedPricing,
  ExtractedAgent,
  ExtractedAutomation,
  ExtractedWidgetConfig,
  ExtractedAIPageSuggestion,
  ExtractedBranding,
} from './types';

const MAX_INPUT_CHARS = 50_000;

const EXTRACTION_SYSTEM = `You are a business setup analyst. You extract structured information from raw business input (website text, pasted content, pricing sheets, FAQs, descriptions) to build a complete business configuration.

Rules:
- Use ONLY information present in the input. Do not invent business names, services, or contact details.
- For missing fields use null or empty arrays.
- Prefer short, clear values. Truncate long text to 2-3 sentences where appropriate.
- For services: infer slug from name (lowercase, hyphens). Mark likely_quoteable true if the business seems to sell/quote that service.
- For pricing: only include if the user provided pricing info (prices, variables, rules). Otherwise leave pricing section minimal or null.
- For agents: recommend 1-3 sensible defaults (e.g. website_chatbot, quote_assistant, support_agent) based on business type.
- For automations: recommend 2-5 sensible defaults (e.g. lead notification, quote request notification, support ticket).
- For ai_pages: suggest 0-2 pages (e.g. quote page, support page) if the business type fits.

Return a single JSON object with exactly these top-level keys:
- business_profile: { business_name?, company_description?, industry?, service_area?, contact_email?, phone?, business_hours?, tone_of_voice?, welcome_message_suggestion?, lead_notification_email? }
- services: [ { name, description?, slug?, likely_quoteable? } ] (max 25)
- knowledge: { faqs?: [ { q, a } ], policies?: [], support_topics?: [], business_facts?: [], website_derived_summary? } (max 15 FAQs)
- pricing: null or { industry_hint?, currency?, services?: [ { name, slug, description?, base_price? } ], variables?: [], rules?: [], pricing_notes?, estimate_behavior? }
- agents: [ { name, role_type, description?, system_prompt_snippet?, suggested_tools? } ] (role_type: website_chatbot, quote_assistant, support_agent, faq_agent, sales_agent, booking_agent, custom)
- automations: [ { name, description?, trigger_type, action_type, trigger_config?, action_config? } ] (trigger_type: lead_form_submitted, quote_request_submitted, support_requested; action_type: send_email_notification, create_support_ticket, etc.)
- widget_config: { welcome_message?, primary_color?, position? }
- ai_pages: [ { title, slug, page_type, description?, welcome_message?, handoff_suggestion? } ] (page_type: quote, support, booking, intake, general)
- branding: { tone_of_voice?, welcome_message?, tagline? }

Reply with only the JSON, no markdown.`;

export interface ExtractionInput {
  combinedText: string;
  websiteUrl?: string | null;
}

export interface ExtractionResult {
  business_profile: ExtractedBusinessProfile;
  services: ExtractedService[];
  knowledge: ExtractedKnowledge;
  pricing: ExtractedPricing | null;
  agents: ExtractedAgent[];
  automations: ExtractedAutomation[];
  widget_config: ExtractedWidgetConfig;
  ai_pages: ExtractedAIPageSuggestion[];
  branding: ExtractedBranding;
}

export async function extractBusinessWithAI(input: ExtractionInput): Promise<ExtractionResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const openai = new OpenAI({ apiKey });
  const text = input.combinedText.slice(0, MAX_INPUT_CHARS);
  const userContent = [
    input.websiteUrl ? `Website URL: ${input.websiteUrl}` : '',
    `Business information to analyze:\n\n${text}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    messages: [
      { role: 'system', content: EXTRACTION_SYSTEM },
      { role: 'user', content: userContent },
    ],
    max_tokens: 4000,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error('Empty extraction response');

  const parsed = JSON.parse(raw) as Record<string, unknown>;
  return normalizeExtractionResult(parsed);
}

function normalizeExtractionResult(parsed: Record<string, unknown>): ExtractionResult {
  const bp = parsed.business_profile as Record<string, unknown> | undefined;
  const business_profile: ExtractedBusinessProfile = {
    business_name: typeof bp?.business_name === 'string' ? bp.business_name.slice(0, 500) : null,
    company_description: typeof bp?.company_description === 'string' ? bp.company_description.slice(0, 2000) : null,
    industry: typeof bp?.industry === 'string' ? bp.industry.slice(0, 200) : null,
    service_area: typeof bp?.service_area === 'string' ? bp.service_area.slice(0, 500) : null,
    contact_email: typeof bp?.contact_email === 'string' ? bp.contact_email.slice(0, 320) : null,
    phone: typeof bp?.phone === 'string' ? bp.phone.slice(0, 50) : null,
    business_hours: typeof bp?.business_hours === 'string' ? bp.business_hours.slice(0, 300) : null,
    tone_of_voice: typeof bp?.tone_of_voice === 'string' ? bp.tone_of_voice.slice(0, 100) : null,
    welcome_message_suggestion: typeof bp?.welcome_message_suggestion === 'string' ? bp.welcome_message_suggestion.slice(0, 500) : null,
    lead_notification_email: typeof bp?.lead_notification_email === 'string' ? bp.lead_notification_email.slice(0, 320) : null,
  };

  const servicesRaw = Array.isArray(parsed.services) ? parsed.services : [];
  const services: ExtractedService[] = servicesRaw
    .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null && typeof (s as { name?: unknown }).name === 'string')
    .slice(0, 25)
    .map((s) => ({
      name: String((s as { name: string }).name).slice(0, 300),
      description: typeof (s as { description?: string }).description === 'string' ? (s as { description: string }).description.slice(0, 500) : null,
      slug: typeof (s as { slug?: string }).slug === 'string' ? (s as { slug: string }).slug.slice(0, 100) : null,
      likely_quoteable: Boolean((s as { likely_quoteable?: boolean }).likely_quoteable),
    }));

  const know = parsed.knowledge as Record<string, unknown> | undefined;
  const faqsRaw = Array.isArray(know?.faqs) ? know.faqs : [];
  const faqs = faqsRaw
    .filter((x): x is { q: string; a: string } => typeof x === 'object' && x !== null && typeof (x as { q?: unknown }).q === 'string' && typeof (x as { a?: unknown }).a === 'string')
    .slice(0, 15)
    .map((x) => ({ q: String(x.q).slice(0, 500), a: String(x.a).slice(0, 1000) }));
  const knowledge: ExtractedKnowledge = {
    faqs,
    policies: Array.isArray(know?.policies) ? (know.policies as string[]).filter((s): s is string => typeof s === 'string').slice(0, 20).map((s) => s.slice(0, 500)) : [],
    support_topics: Array.isArray(know?.support_topics) ? (know.support_topics as string[]).filter((s): s is string => typeof s === 'string').slice(0, 15).map((s) => s.slice(0, 200)) : [],
    business_facts: Array.isArray(know?.business_facts) ? (know.business_facts as string[]).filter((s): s is string => typeof s === 'string').slice(0, 15).map((s) => s.slice(0, 300)) : [],
    website_derived_summary: typeof know?.website_derived_summary === 'string' ? know.website_derived_summary.slice(0, 1000) : null,
  };

  let pricing: ExtractedPricing | null = null;
  const pr = parsed.pricing as Record<string, unknown> | null | undefined;
  if (pr && typeof pr === 'object') {
    const prServices = Array.isArray(pr.services) ? pr.services : [];
    pricing = {
      industry_hint: typeof pr.industry_hint === 'string' ? pr.industry_hint.slice(0, 100) : null,
      currency: typeof pr.currency === 'string' ? pr.currency.slice(0, 10) : 'USD',
      services: prServices
        .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null && typeof (s as { name?: unknown }).name === 'string')
        .slice(0, 20)
        .map((s) => ({
          name: String((s as { name: string }).name).slice(0, 200),
          slug: typeof (s as { slug?: string }).slug === 'string' ? (s as { slug: string }).slug.slice(0, 100) : String((s as { name: string }).name).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          description: typeof (s as { description?: string }).description === 'string' ? (s as { description: string }).description.slice(0, 500) : undefined,
          base_price: typeof (s as { base_price?: number }).base_price === 'number' && Number.isFinite((s as { base_price: number }).base_price) ? (s as { base_price: number }).base_price : undefined,
        })),
      variables: Array.isArray(pr.variables)
        ? (pr.variables as Array<Record<string, unknown>>)
            .filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null && typeof (v as { key?: unknown }).key === 'string' && typeof (v as { label?: unknown }).label === 'string' && typeof (v as { variable_type?: unknown }).variable_type === 'string')
            .slice(0, 30)
            .map((v) => ({
              key: String((v as { key: string }).key).slice(0, 80),
              label: String((v as { label: string }).label).slice(0, 200),
              variable_type: String((v as { variable_type: string }).variable_type).slice(0, 50),
              unit_label: typeof (v as { unit_label?: string }).unit_label === 'string' ? (v as { unit_label: string }).unit_label.slice(0, 30) : undefined,
              required: typeof (v as { required?: boolean }).required === 'boolean' ? (v as { required: boolean }).required : undefined,
            }))
        : [],
      rules: Array.isArray(pr.rules)
        ? (pr.rules as Array<Record<string, unknown>>)
            .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null && typeof (r as { rule_type?: unknown }).rule_type === 'string' && typeof (r as { name?: unknown }).name === 'string')
            .slice(0, 30)
            .map((r) => ({
              rule_type: String((r as { rule_type: string }).rule_type).slice(0, 80),
              name: String((r as { name: string }).name).slice(0, 200),
              config: typeof (r as { config?: unknown }).config === 'object' && (r as { config?: unknown }).config !== null ? (r as { config: Record<string, unknown> }).config : {},
              sort_order: typeof (r as { sort_order?: number }).sort_order === 'number' && Number.isFinite((r as { sort_order: number }).sort_order) ? (r as { sort_order: number }).sort_order : undefined,
            }))
        : [],
      pricing_notes: typeof pr.pricing_notes === 'string' ? pr.pricing_notes.slice(0, 1000) : null,
      estimate_behavior: typeof pr.estimate_behavior === 'string' ? pr.estimate_behavior.slice(0, 300) : null,
    };
  }

  const agentsRaw = Array.isArray(parsed.agents) ? parsed.agents : [];
  const agents: ExtractedAgent[] = agentsRaw
    .filter((a): a is Record<string, unknown> => typeof a === 'object' && a !== null && typeof (a as { name?: unknown }).name === 'string' && typeof (a as { role_type?: unknown }).role_type === 'string')
    .slice(0, 10)
    .map((a) => ({
      name: String((a as { name: string }).name).slice(0, 200),
      role_type: String((a as { role_type: string }).role_type).slice(0, 50),
      description: typeof (a as { description?: string }).description === 'string' ? (a as { description: string }).description.slice(0, 500) : null,
      system_prompt_snippet: typeof (a as { system_prompt_snippet?: string }).system_prompt_snippet === 'string' ? (a as { system_prompt_snippet: string }).system_prompt_snippet.slice(0, 500) : null,
      suggested_tools: Array.isArray((a as { suggested_tools?: unknown }).suggested_tools) ? ((a as { suggested_tools: string[] }).suggested_tools).filter((t): t is string => typeof t === 'string').slice(0, 10) : [],
    }));

  const automationsRaw = Array.isArray(parsed.automations) ? parsed.automations : [];
  const automations: ExtractedAutomation[] = automationsRaw
    .filter((a): a is Record<string, unknown> => typeof a === 'object' && a !== null && typeof (a as { name?: unknown }).name === 'string' && typeof (a as { trigger_type?: unknown }).trigger_type === 'string' && typeof (a as { action_type?: unknown }).action_type === 'string')
    .slice(0, 10)
    .map((a) => ({
      name: String((a as { name: string }).name).slice(0, 200),
      description: typeof (a as { description?: string }).description === 'string' ? (a as { description: string }).description.slice(0, 500) : null,
      trigger_type: String((a as { trigger_type: string }).trigger_type).slice(0, 80),
      action_type: String((a as { action_type: string }).action_type).slice(0, 80),
      trigger_config: typeof (a as { trigger_config?: unknown }).trigger_config === 'object' && (a as { trigger_config?: unknown }).trigger_config !== null ? (a as { trigger_config: Record<string, unknown> }).trigger_config : undefined,
      action_config: typeof (a as { action_config?: unknown }).action_config === 'object' && (a as { action_config?: unknown }).action_config !== null ? (a as { action_config: Record<string, unknown> }).action_config : undefined,
    }));

  const wc = parsed.widget_config as Record<string, unknown> | undefined;
  const widget_config: ExtractedWidgetConfig = {
    welcome_message: typeof wc?.welcome_message === 'string' ? wc.welcome_message.slice(0, 500) : null,
    primary_color: typeof wc?.primary_color === 'string' ? wc.primary_color.slice(0, 30) : null,
    position: typeof wc?.position === 'string' ? wc.position.slice(0, 30) : null,
  };

  const pagesRaw = Array.isArray(parsed.ai_pages) ? parsed.ai_pages : [];
  const ai_pages: ExtractedAIPageSuggestion[] = pagesRaw
    .filter((p): p is Record<string, unknown> => typeof p === 'object' && p !== null && typeof (p as { title?: unknown }).title === 'string' && typeof (p as { slug?: unknown }).slug === 'string')
    .slice(0, 5)
    .map((p) => ({
      title: String((p as { title: string }).title).slice(0, 200),
      slug: String((p as { slug: string }).slug).slice(0, 100),
      page_type: typeof (p as { page_type?: string }).page_type === 'string' ? (p as { page_type: string }).page_type.slice(0, 50) : 'general',
      description: typeof (p as { description?: string }).description === 'string' ? (p as { description: string }).description.slice(0, 500) : null,
      welcome_message: typeof (p as { welcome_message?: string }).welcome_message === 'string' ? (p as { welcome_message: string }).welcome_message.slice(0, 500) : null,
      handoff_suggestion: typeof (p as { handoff_suggestion?: string }).handoff_suggestion === 'string' ? (p as { handoff_suggestion: string }).handoff_suggestion.slice(0, 300) : null,
    }));

  const br = parsed.branding as Record<string, unknown> | undefined;
  const branding: ExtractedBranding = {
    tone_of_voice: typeof br?.tone_of_voice === 'string' ? br.tone_of_voice.slice(0, 100) : null,
    welcome_message: typeof br?.welcome_message === 'string' ? br.welcome_message.slice(0, 500) : null,
    tagline: typeof br?.tagline === 'string' ? br.tagline.slice(0, 200) : null,
  };

  return {
    business_profile,
    services,
    knowledge,
    pricing,
    agents,
    automations,
    widget_config,
    ai_pages,
    branding,
  };
}
