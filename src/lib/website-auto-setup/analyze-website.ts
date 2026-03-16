/**
 * AI analysis of website text: extract business name, services, FAQs, contact, tone.
 * All runs server-side with OpenAI.
 */

import OpenAI from 'openai';
import type { WebsiteAnalysis } from './types';

const SYSTEM_PROMPT = `You analyze website content and extract structured business information.
Return a single JSON object with these keys (use null for missing):
- business_name: string or null
- company_description: string or null (1-3 sentences)
- services_offered: array of strings or null
- faq: array of { "q": string, "a": string } or null (max 10 items)
- contact_email: string or null
- phone: string or null
- tone_of_voice: string or null (e.g. "professional", "friendly", "technical")
- key_pages: array of page titles or URLs mentioned, or null
Use only the provided website text. Do not invent information. Reply with only the JSON, no markdown.`;

export async function analyzeWebsiteWithAI(
  websiteText: string,
  businessType?: string | null,
  businessDescription?: string | null,
  openaiApiKey?: string
): Promise<WebsiteAnalysis> {
  const key = openaiApiKey ?? process.env.OPENAI_API_KEY;
  if (!key?.trim()) throw new Error('OPENAI_API_KEY not configured');

  const openai = new OpenAI({ apiKey: key });
  const truncated = websiteText.slice(0, 24_000);
  const userContent =
    [businessType && `Business type: ${businessType}`, businessDescription && `Description: ${businessDescription}`, `Website content:\n${truncated}`]
      .filter(Boolean)
      .join('\n\n');

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    max_tokens: 2000,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error('Empty AI response');

  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const faqRaw = parsed.faq;
  let faq: WebsiteAnalysis['faq'] = null;
  if (Array.isArray(faqRaw)) {
    faq = faqRaw
      .filter((x): x is { q?: string; a?: string } => typeof x === 'object' && x !== null)
      .map((x) => ({ q: String(x.q ?? '').slice(0, 500), a: String(x.a ?? '').slice(0, 1000) }))
      .filter((x) => x.q.trim());
    if (faq.length === 0) faq = null;
  }

  return {
    business_name: typeof parsed.business_name === 'string' ? parsed.business_name.slice(0, 500) : null,
    company_description: typeof parsed.company_description === 'string' ? parsed.company_description.slice(0, 2000) : null,
    services_offered: Array.isArray(parsed.services_offered)
      ? (parsed.services_offered as unknown[]).filter((s): s is string => typeof s === 'string').slice(0, 30).map((s) => s.slice(0, 300))
      : null,
    faq,
    contact_email: typeof parsed.contact_email === 'string' ? parsed.contact_email.slice(0, 320) : null,
    phone: typeof parsed.phone === 'string' ? parsed.phone.slice(0, 50) : null,
    tone_of_voice: typeof parsed.tone_of_voice === 'string' ? parsed.tone_of_voice.slice(0, 100) : null,
    key_pages: Array.isArray(parsed.key_pages)
      ? (parsed.key_pages as unknown[]).filter((s): s is string => typeof s === 'string').slice(0, 20).map((s) => s.slice(0, 500))
      : null,
  };
}
