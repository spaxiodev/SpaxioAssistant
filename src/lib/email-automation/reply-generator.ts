/**
 * Generates the auto-reply body for an incoming email.
 *
 * Logic:
 * 1. If a template exists for the detected language → use it.
 * 2. If not, and ai_translate_enabled → ask OpenAI to translate the fallback template.
 * 3. If not, use the fallback template as-is.
 * 4. If ai_enhancement_enabled → ask OpenAI to polish the reply text for the chosen tone.
 */

import OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { EmailAutomationSettings, TonePreset } from './types';
import { emailLayout, escapeHtml } from '@/lib/email';

// ─── Template variable interpolation ─────────────────────────────────────────

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

function buildVars(params: {
  customerName: string | null;
  businessName: string | null;
  originalSubject: string | null;
}): Record<string, string> {
  return {
    customer_name: params.customerName ?? 'there',
    business_name: params.businessName ?? 'our team',
    original_subject: params.originalSubject ?? 'your message',
  };
}

// ─── Tone descriptions for AI ─────────────────────────────────────────────────

const TONE_DESCRIPTIONS: Record<TonePreset, string> = {
  professional: 'polished, formal, and concise — suitable for B2B or service businesses',
  friendly:
    'warm, approachable, and conversational — suitable for retail and consumer services',
  luxury:
    'elegant, refined, and exclusive — suitable for high-end brands and premium services',
  concise: 'extremely brief and to the point — two sentences maximum',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function translateTemplate(
  text: string,
  targetLanguage: string,
  businessName: string | null
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a professional email translator for "${businessName ?? 'a business'}". 
Translate the following email reply template into ${targetLanguage} (ISO 639-1 code). 
Keep {{template_variables}} exactly as-is. Output ONLY the translated text, no extra commentary.`,
        },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
      max_tokens: 600,
    });
    return response.choices[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

async function aiEnhanceReply(
  text: string,
  tone: TonePreset,
  language: string,
  businessName: string | null
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an email writing assistant for "${businessName ?? 'a business'}".
Rewrite the following customer auto-reply in a ${TONE_DESCRIPTIONS[tone]} tone.
Language: ${language}. Keep it SHORT — max 80 words. Do NOT add new commitments, prices, or specific details.
Output ONLY the rewritten email body text, no subject line, no extra commentary.`,
        },
        { role: 'user', content: text },
      ],
      temperature: 0.4,
      max_tokens: 300,
    });
    return response.choices[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export interface GenerateReplyParams {
  supabase: SupabaseClient;
  organizationId: string;
  settings: EmailAutomationSettings;
  detectedLanguage: string;
  customerName: string | null;
  businessName: string | null;
  originalSubject: string | null;
}

export interface GeneratedReply {
  subject: string;
  bodyText: string;
  bodyHtml: string;
  replyLanguage: string;
  templateId: string | null;
  aiEnhanced: boolean;
}

export async function generateAutoReply(params: GenerateReplyParams): Promise<GeneratedReply> {
  const {
    supabase,
    organizationId,
    settings,
    detectedLanguage,
    customerName,
    businessName,
    originalSubject,
  } = params;

  const vars = buildVars({ customerName, businessName, originalSubject });
  let replyLanguage = detectedLanguage;
  let templateId: string | null = null;
  let bodyText: string;
  let subjectText: string;
  let aiEnhanced = false;

  // 1. Look for a template in the detected language
  const { data: langTemplate } = await supabase
    .from('email_reply_templates')
    .select('id, subject_template, body_template')
    .eq('organization_id', organizationId)
    .eq('language_code', detectedLanguage)
    .eq('is_active', true)
    .maybeSingle();

  if (langTemplate) {
    templateId = langTemplate.id as string;
    subjectText = interpolate(
      (langTemplate.subject_template as string | null) ?? 'Re: {{original_subject}}',
      vars
    );
    bodyText = interpolate(langTemplate.body_template as string, vars);
  } else {
    // 2. Fall back to fallback-language template
    const fallbackLang = settings.fallback_language;
    const { data: fallbackTemplate } = await supabase
      .from('email_reply_templates')
      .select('id, subject_template, body_template')
      .eq('organization_id', organizationId)
      .eq('language_code', fallbackLang)
      .eq('is_active', true)
      .maybeSingle();

    const rawBody =
      fallbackTemplate?.body_template ??
      `Hi {{customer_name}},\n\nThank you for reaching out. A member of our team will get back to you as soon as possible.\n\nBest regards,\n{{business_name}}`;
    const rawSubject =
      fallbackTemplate?.subject_template ?? 'Re: {{original_subject}}';

    // 3. If AI translation enabled and language differs, translate
    if (settings.ai_translate_enabled && detectedLanguage !== fallbackLang) {
      const translated = await translateTemplate(rawBody, detectedLanguage, businessName);
      bodyText = interpolate(translated ?? rawBody, vars);
    } else {
      bodyText = interpolate(rawBody, vars);
      replyLanguage = fallbackLang;
    }

    subjectText = interpolate(rawSubject, vars);
    if (fallbackTemplate) templateId = fallbackTemplate.id as string;
  }

  // 4. AI tone enhancement (optional)
  if (settings.ai_enhancement_enabled) {
    const enhanced = await aiEnhanceReply(
      bodyText,
      settings.tone_preset,
      replyLanguage,
      businessName
    );
    if (enhanced) {
      bodyText = enhanced;
      aiEnhanced = true;
    }
  }

  const bodyHtml = emailLayout({
    title: subjectText,
    badge: 'Auto-Reply',
    content: `<p style="white-space:pre-wrap">${escapeHtml(bodyText)}</p>`,
    language: replyLanguage,
  });

  return {
    subject: subjectText.slice(0, 250),
    bodyText: bodyText.slice(0, 5000),
    bodyHtml,
    replyLanguage,
    templateId,
    aiEnhanced,
  };
}
