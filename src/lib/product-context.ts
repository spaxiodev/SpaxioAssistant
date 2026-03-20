/**
 * Single source of truth for platform capabilities used by the AI Setup Assistant
 * and in-app help chat. Keep in sync with docs/WEBSITE_SUMMARY.md when the product changes.
 */

/** Platform context for the AI Setup Assistant: what exists in the product and what this assistant can do. */
export const PLATFORM_CAPABILITIES_FOR_AI_SETUP = `
Product context (Spaxio Assistant):
- Spaxio Assistant is an AI receptionist and lead qualification platform for businesses — not a generic chatbot. Core differentiation: answers customers instantly, captures and qualifies leads with AI scoring, collects quote requests and provides instant estimates, and follows up intelligently with high-intent leads.
- Core functions: learns your business from website URL or files (Website Info / Business Info); answers visitor questions 24/7; captures leads with AI qualification (score, priority, urgency, recommended action); collects quote requests with configurable pricing rules for instant estimates; deploys as chat widget and/or full-page link; optionally voice conversations (plan-gated); Auto Follow-up (automatic customer follow-up emails, AI drafts for approval, follow-up history); team, billing, settings.
- In Simple Mode, we use plain language: "AI Assistant" (not "Agents"), "Website Info" or "Business Info" (not "Knowledge"), "Auto Follow-up" (not "Automations").
- The main setup flow: enter your website URL → AI analyzes it and auto-detects your industry → drafts setup tailored to your business type (home services gets quote-first flow, agencies get consultation flow, etc.) → applies safe changes (business profile, services, FAQs, website info) → you review and approve → install widget → go live.
- Industry-aware setup: the assistant automatically adapts its suggestions based on your industry (home services, agency/consulting, healthcare, SaaS, retail, legal, etc.) — different industries get appropriate templates, greeting styles, and capture flows.
- AI Lead Qualification: every captured lead is analyzed by AI to produce a score (0-100), priority (high/medium/low), summary, urgency level, and recommended next action. High-priority leads are surfaced prominently in the dashboard.
- Quote Engine: businesses can configure pricing rules and variables. The assistant maps customer requests to these rules and produces instant estimate ranges or draft quotes. Supports: fixed price, per-unit, tiered, add-ons, multipliers, minimum charges.
- Live Dashboard Intelligence: the dashboard surfaces what matters most — high-priority leads needing follow-up, pending quote requests, new leads this week, and conversation-to-lead conversion rates.
- AI Suggestions: the platform proactively recommends improvements grounded in real data (e.g. "3 high-priority leads need follow-up", "add pricing info to improve quote quality", "enable lead capture — you have conversations but no leads captured").
- Conversation Learning (Pro+): the platform analyzes conversation patterns to surface frequently asked questions, pricing confusion, missing info gaps, and optimization suggestions — always for review, never auto-applied.
- Core areas in the dashboard: AI Setup, Install, Website Info (Knowledge), Conversations, Leads, Quote Requests, Auto Follow-up (Automations), Analytics, Team, Billing, Settings.
- Website Info (Knowledge): you can add website URLs and upload files so the assistant answers using the business's real content.
- Install: you copy a small script and add it to your website to show the assistant widget.
- This AI Setup Assistant can help configure: assistant behavior (tone, greeting, industry-specific templates), lead capture and quote request forms, notification emails, and simple Auto Follow-up (for example: "automatically reply to new leads", "create AI follow-up drafts for review", "notify me when a lead comes in").
- If the user asks about advanced/hidden areas (CRM sections, tickets, documents/templates, standalone AI Actions, integrations, preview/demo/test routes, webhook management UI), explain simply that Spaxio Assistant is focused on helping them launch an AI receptionist quickly: AI Setup, Install, Website Info, Conversations, Leads, Quote Requests, Auto Follow-up, Analytics, Team, Billing, Settings.
- The dashboard has global search / command palette: users can press Cmd+K (Mac) or Ctrl+K (Windows) from anywhere in the dashboard to quickly search and jump to pages, actions, leads, quote requests, conversations, website info, Auto Follow-up, and AI Assistants.
`.trim();

/**
 * Feature descriptions for help-chat context blocks.
 * Used to explain specific features when users ask about them.
 */
export const FEATURE_DESCRIPTIONS = {
  ai_lead_scoring: `AI Lead Qualification automatically analyzes every captured lead. It produces: a score (0-100), a priority label (high/medium/low), a plain-language summary of who the lead is and what they want, urgency level, and a recommended next action for your team. High-priority leads are surfaced prominently in the dashboard so you never miss a hot opportunity.`,

  quote_engine: `The Quote Engine lets you configure pricing rules and variables for your services. When customers ask about cost, the assistant can interpret their request and produce instant estimate ranges based on your configuration. Supports: fixed prices, per-unit pricing, tiered pricing, add-ons, multipliers, and minimum charges. The quote form collects service details and the engine produces a result without hallucinating numbers outside your rules.`,

  ai_suggestions: `AI Suggestions are proactive recommendations generated from real data about your setup and usage. Examples: "3 high-priority leads need follow-up", "add pricing rules to provide instant estimates", "enable lead capture — you have conversations but no captured leads". Suggestions are dismissible and always grounded in actual configuration gaps or data patterns.`,

  conversation_learning: `Conversation Learning (Pro+) analyzes patterns across your stored conversations to surface: frequently asked questions, pricing confusion, common service inquiries, and gaps where the assistant couldn't answer well. These insights are presented for your review and never auto-applied. Use them to improve your FAQs, add missing info, and tune your assistant over time.`,

  industry_presets: `Industry-Aware Setup automatically tailors the setup experience to your business type. Home services businesses get a quote-first flow. Agencies get a consultation/project inquiry flow. Healthcare businesses get an appointment request flow. The AI detects your industry from your website and pre-fills appropriate templates, greeting styles, and FAQ suggestions — all editable before publishing.`,

  live_intelligence: `The Live Dashboard Intelligence panel shows what needs your attention right now: high-priority leads from this month, pending quote requests awaiting review, new leads this week, and conversation-to-lead conversion rate. This makes the dashboard feel operational — useful every time you log in, not just after setup.`,
} as const;
