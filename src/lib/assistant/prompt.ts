export type FaqItem = {
  question: string;
  answer: string;
};

export type BusinessSettingsContext = {
  business_name?: string | null;
  industry?: string | null;
  company_description?: string | null;
  services_offered?: string[] | null;
  pricing_notes?: string | null;
  service_base_prices?: Record<string, number> | null;
  tone_of_voice?: string | null;
  contact_email?: string | null;
  phone?: string | null;
  faq?: FaqItem[] | null;
  faq_page_url?: string | null;
  website_url?: string | null;
  website_learned_content?: string | null;
  website_learned_at?: string | null;
};

export function buildBusinessContext(settings?: BusinessSettingsContext | null): string {
  if (!settings) {
    return 'No business details configured.';
  }

  const parts: string[] = [];

  if (settings.business_name) {
    parts.push(`Business name: ${settings.business_name}`);
  }
  if (settings.industry) {
    parts.push(`Industry: ${settings.industry}`);
  }
  if (settings.company_description) {
    parts.push(`Company description: ${settings.company_description}`);
  }
  if (settings.services_offered && settings.services_offered.length > 0) {
    parts.push(`Services offered: ${settings.services_offered.join(', ')}`);
  }
  if (settings.pricing_notes) {
    parts.push(`Pricing notes: ${settings.pricing_notes}`);
  }
  if (settings.service_base_prices && typeof settings.service_base_prices === 'object') {
    const basePrices = Object.entries(settings.service_base_prices)
      .filter(
        (entry): entry is [string, number] =>
          typeof entry[0] === 'string' && typeof entry[1] === 'number' && Number.isFinite(entry[1])
      )
      .map(([service, price]) => `${service}: $${price.toLocaleString()}`);
    if (basePrices.length > 0) {
      parts.push(
        `Configured service base prices (use these as starting prices or minimums unless the user asks for a full custom quote): ${basePrices.join(', ')}`
      );
    }
  }
  if (settings.contact_email) {
    parts.push(`Contact email: ${settings.contact_email}`);
  }
  if (settings.phone) {
    parts.push(`Phone: ${settings.phone}`);
  }
  if (settings.tone_of_voice) {
    parts.push(`Tone of voice: ${settings.tone_of_voice}`);
  }

  if (Array.isArray(settings.faq) && settings.faq.length > 0) {
    const faqText = settings.faq
      .map((item) => `Q: ${item.question} A: ${item.answer}`)
      .join(' ');
    parts.push(`FAQ: ${faqText}`);
  }
  if (settings.faq_page_url) {
    parts.push(`FAQ page URL (direct users here for more questions): ${settings.faq_page_url}`);
  }
  if (settings.website_learned_content && settings.website_learned_content.trim()) {
    parts.push(
      `Additional context learned from the business website:\n${settings.website_learned_content.trim()}`
    );
  }

  if (parts.length === 0) {
    return 'No business details configured.';
  }

  return parts.join('\n');
}

function buildBaseSystemPrompt(businessName?: string | null): string {
  const namedBusiness = businessName?.trim() || 'the business';

  return `
You are a helpful AI assistant for a service business, embedded on the business's website. You know the business's information from the context below (company details, services, FAQ, and contact info).

Always follow these rules:
- Use ONLY the provided business context (business settings, services, FAQ, pricing notes, and contact details). Do not invent services, locations, guarantees, or prices that are not clearly in the context.
- Contact information: When the user asks for the contact email, owner email, how to reach the business, or "what's your email", give them the contact email and phone from the business context. If only one is set, give that one. Say they can also keep chatting here.
- FAQ and website knowledge: You have FAQ content in the context—use it to answer questions. When users have general questions or ask where to find more information, suggest they check the FAQ. If the business context includes a "FAQ page URL", share that link and suggest they visit it for the full list of questions and answers. Otherwise say they can find the FAQ on this website.
- If you are unsure or the context does not include the requested information, say that you are not certain, then either (a) ask 1–3 clarifying questions, or (b) suggest connecting with the business directly and offer to collect contact details.
- When users ask about pricing, quotes, booking, availability, or say they want to buy, schedule, or get started, TREAT THIS AS A LEAD and prioritize collecting their details.
- For lead / quote intent, ask for: name, best email, phone (optional if they resist), service type, project details, location, and any timing/deadline. Keep this conversational, not like a form.
- When answering about services, rely on the list of services offered and FAQ. If something is not listed, explain that it may not be offered or they should confirm with the business.
- If the business name is available in the context, refer to the company by that exact name instead of saying "the business".
- For pricing questions, use any pricing notes and configured service base prices as guidance. Treat configured base prices as starting prices or minimums, and clearly label them as estimates unless the context explicitly says they are fixed prices.
- Stay concise, friendly, and aligned with the business tone_of_voice if provided.
- Prefer short paragraphs and bullet points over long walls of text.

If the user directly provides their contact information (name + email or phone), always:
1) Acknowledge that you have their details.
2) Briefly recap what they are interested in.
3) Let them know ${namedBusiness} will follow up.
`.trim();
}

export function buildSystemPrompt(settings?: BusinessSettingsContext | null): string {
  const businessContext = buildBusinessContext(settings);
  const baseSystemPrompt = buildBaseSystemPrompt(settings?.business_name);
  return `${baseSystemPrompt}

Business context:
${businessContext}`;
}

/**
 * Build system prompt for an agent. When agent has custom system_prompt, use it and append business context.
 * Otherwise use the default website-chatbot prompt (buildSystemPrompt) for backward compatibility.
 */
export function buildSystemPromptForAgent(
  agent: { system_prompt?: string | null; role_type?: string },
  settings?: BusinessSettingsContext | null
): string {
  const businessContext = buildBusinessContext(settings);
  if (agent.system_prompt && agent.system_prompt.trim()) {
    return `${agent.system_prompt.trim()}

Business context (use this to answer questions about the company):
${businessContext}`;
  }
  return buildSystemPrompt(settings);
}

