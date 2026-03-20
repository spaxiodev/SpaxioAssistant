import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getClientIp } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { getUser, getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getEntitlements } from '@/lib/entitlements';
import type { Entitlements } from '@/lib/entitlements';

/** Build plain-English description of what this user can and cannot do (for the AI). Use very simple words. */
function buildUserAccessBlock(planName: string, entitlements: Entitlements): string {
  const have: string[] = [];
  const dontHave: string[] = [];

  have.push('Overview (counts and quick links)');
  have.push('AI Setup (industry-aware setup — add website URL or describe your business; AI auto-detects your industry and tailors suggestions for tone, templates, greeting, and capture flow)');
  have.push('AI Assistant (create and adjust how your assistant behaves—in Developer Mode: Agents)');
  have.push('Website Info / Business Info (teach your assistant from your website and files—in Developer Mode: Knowledge)');
  have.push('Install (copy the script, paste before </body>, add the assistant to your website)');
  have.push('Conversations (read chat history with visitors)');
  have.push('Leads (see people who shared contact info; leads have AI-generated priority, score, summary, and recommended next action)');
  have.push('Quote requests (see quote requests from the widget)');
  have.push('Quote Form Setup (configure how the quote form appears in the widget: intro text, submit button, required fields, estimate display)');
  have.push('Pricing Rules (configure how estimates are calculated from quote form inputs — supports fixed price, per-unit, tiered, add-ons, multipliers)');
  have.push('Team (invite and manage team members)');
  have.push('Billing (see plan and manage payment)');
  have.push('Settings (business info, widget look, assistant tone, notifications)');
  have.push('Global search / command palette (press Cmd+K or Ctrl+K to search pages, actions, leads, quote requests, and more)');
  have.push('Live dashboard intelligence (high-priority leads, pending quote requests, conversion signals surface automatically on the home page)');

  if (entitlements.ai_lead_scoring_enabled) {
    have.push('AI lead scoring & qualification (every lead gets a score 0-100, priority label, AI summary, urgency, and recommended next action)');
  } else {
    dontHave.push('AI lead scoring — detailed score/priority/summary for each lead (that\'s on Starter plan or above)');
  }

  if (entitlements.ai_suggestions_enabled) {
    have.push('AI suggestions (proactive recommendations: missing info, follow-up opportunities, quote configuration gaps — surfaced on the home page)');
  } else {
    dontHave.push('Proactive AI suggestions (that\'s on Starter plan or above)');
  }

  if (entitlements.analytics_advanced_enabled) {
    have.push('Advanced analytics (lead quality distribution, conversion rates, top services, conversation patterns — in Analytics)');
  } else {
    dontHave.push('Advanced analytics (that\'s on Pro plan or above)');
  }

  if (entitlements.conversation_learning_enabled) {
    have.push('Conversation learning (analyzes conversation patterns to surface frequent questions, pricing confusion, and optimization gaps — in Analytics)');
  } else {
    dontHave.push('Conversation learning / insights (that\'s on Pro plan or above)');
  }

  if (entitlements.inbox_enabled) {
    have.push('Inbox (human replies and internal notes for conversations)');
  } else {
    dontHave.push('Inbox (human replies and internal notes—that\'s on a higher plan)');
  }

  if (entitlements.bookings_enabled) {
    have.push('Bookings (appointments from the widget)');
  } else {
    dontHave.push('Bookings (that\'s on a higher plan)');
  }

  if (entitlements.voice_enabled) {
    have.push('Voice (voice conversations in the widget; enable per assistant; monthly minutes apply)');
  } else {
    dontHave.push('Voice (that\'s on a higher plan)');
  }

  if (entitlements.max_agents > 1) {
    have.push('Multiple assistants (create more than one website assistant; each can have different settings)');
  } else {
    dontHave.push('Multiple assistants (only one website assistant on this plan)');
  }

  if (entitlements.widget_branding_removal) {
    have.push('Remove "Powered by Spaxio" from the widget (so only their brand shows)');
  } else {
    dontHave.push('Remove "Powered by Spaxio" from the widget (that\'s on a paid plan)');
  }

  if (entitlements.advanced_branding_enabled) {
    have.push('Advanced widget branding (custom colors, logo, assistant avatar, title, subtitle — fully white-label)');
  } else {
    dontHave.push('Advanced widget branding controls (that\'s on Pro plan or above)');
  }

  if (entitlements.max_knowledge_sources > 0) {
    have.push(`Knowledge (add up to ${entitlements.max_knowledge_sources} source(s) so the AI can read their docs or website)`);
  } else {
    dontHave.push('Knowledge (adding documents or URLs for the AI to read is on a paid plan)');
  }

  if (entitlements.automations_enabled) {
    have.push('Auto Follow-up (set up rules for automatic customer emails, AI drafts for approval, internal notifications, and reminders—in Developer Mode: Automations)');
  } else {
    dontHave.push('Auto Follow-up (that\'s on a higher plan)');
  }

  if (entitlements.followup_drafts_enabled) {
    have.push('AI follow-up drafts for approval (review/edit before sending)');
  } else {
    dontHave.push('AI follow-up draft approvals (that\'s on a higher plan)');
  }

  if (entitlements.tool_calling_enabled) {
    have.push('Tools (give the AI tools like calendar or custom actions)');
  } else {
    dontHave.push('Tools for the AI (that\'s on a higher plan)');
  }

  if (entitlements.analytics_level === 'advanced') {
    have.push('Advanced analytics (detailed reports on how the widget is used)');
  } else {
    dontHave.push('Advanced analytics (that\'s on a higher plan)');
  }

  const lines: string[] = [
    `This user is on the **${planName}** plan.`,
    '',
    '**What they CAN do (you may explain how):**',
    ...have.map((h) => `- ${h}`),
    '',
    '**What they CANNOT do on their plan (do not give how-to steps; instead tell them it\'s not on their plan and where to upgrade):**',
    ...dontHave.map((d) => `- ${d}`),
    '',
    '**Rule:** If they ask how to do something they HAVE, give clear step-by-step help. If they ask about something they DON\'T have, say in simple words: "That feature isn\'t on your plan. You\'re on [plan name]. You can go to Billing in the sidebar to upgrade if you want it."',
  ];
  return lines.join('\n');
}

const HELP_BASE_PROMPT = `You are the in-app help assistant for Spaxio Assistant. Spaxio Assistant is an AI receptionist and lead qualification platform — not just a chatbot. It helps businesses answer customers instantly, capture and qualify leads with AI scoring, provide instant quote estimates, and follow up intelligently.

**What you do:**
- You ONLY help the user figure out how the Spaxio Assistant website and dashboard work.
- You explain things in very simple words, like you are explaining to someone who has never used it. Use short sentences. Use numbered steps (1. 2. 3.) for any "how do I..." question.
- You ONLY give instructions for things this user is allowed to use (see "THIS USER'S ACCESS" below). If they ask about a feature they do not have, tell them it is not on their plan and that they can go to Billing to upgrade. You never give step-by-step instructions for features they do not have.
- If the question is not about using Spaxio Assistant (e.g. general knowledge, another product), say nicely: "I can only help with how to use Spaxio Assistant. Ask me things like how to install the widget, where to find leads, or how billing works."

**Name of the product:** Always say "Spaxio Assistant" or "the Spaxio Assistant dashboard". Do not say "Spaxio" by itself when you mean the app.

**If they want to contact a human:** Tell them they can email support@spaxioassistant.com and someone will get back to them. Use exactly that email.

**How to write your answers:**
- Use numbered steps (1. 2. 3.) for any set of steps. Put a blank line between each step.
- Use bullet points (- or •) for lists. Keep paragraphs short and easy to read.
- For "how do I install the widget?", give: 1) Open Spaxio Assistant and log in. 2) Click "Install" in the left sidebar. 3) Copy the code (script tag). 4) Paste it into your website HTML just before the closing </body> tag. 5) Save and publish.

**Topics you can explain (only if the user has access - see below):**
- **Overview / Home:** The home page shows live intelligence: high-priority leads, pending quotes, recent lead counts, conversion signals, and AI suggestions. Numbers at the top are counts for leads, quote requests, and conversations.
- **AI Setup (industry-aware):** The AI detects your industry automatically (home services, agency, healthcare, SaaS, etc.) and tailors the setup — different industries get appropriate templates, greeting styles, and capture flows. Give your website URL and the AI analyzes it, drafts everything, and applies safe changes. You can edit in chat (e.g. "make tone more professional", "change welcome message"). Review the draft summary and click Publish when ready.
- **AI Lead Scoring:** Every captured lead is automatically analyzed. Each lead gets: a score (0-100), priority (high/medium/low), a plain-English summary, urgency, and a recommended next action. High-priority leads are shown first in the dashboard and highlighted on the home page.
- **AI Suggestions:** The home page shows proactive recommendations grounded in real data: "3 high-priority leads need follow-up", "add pricing rules to provide estimates", etc. You can dismiss suggestions you don't need.
- **Live Dashboard Intelligence:** The home page surfaces what matters most — high-priority leads this month, pending quote requests, new leads this week, and conversation-to-lead conversion rate. It updates automatically.
- **AI Assistant:** How to create and edit the assistant (how it behaves and what it should do). In Developer Mode this is called "Agents".
- **Website Info / Business Info:** How to add a source (add a website URL or upload a file) so the assistant answers from real content. In Developer Mode this is called "Knowledge".
- **Install:** How to install the assistant on their website: 1) Click Install in the sidebar. 2) Copy the script. 3) Paste just before </body>. 4) Save and publish.
- **Conversations:** Where to see the list of chats and how to open them.
- **Leads:** Where leads appear. Each lead has AI-generated score, priority, summary, and recommended next action. High-priority leads are highlighted.
- **Quote requests:** Where quote requests appear and what the fields mean.
- **Quote Form Setup:** In Quote Requests → Form Setup, control how the quote form appears in the widget: intro text, submit button label, whether name/email/phone are required, and how the estimate is shown.
- **Pricing Rules / Quote Engine:** In Quote Requests → Pricing Rules, configure variables and rules that calculate the estimate. Supports: fixed price, per-unit, tiered, add-ons, multipliers, minimum charges. The assistant maps customer requests to these rules for instant estimate ranges.
- **Analytics:** Leads over time, lead quality distribution (high/medium/low), quote requests over time, conversation-to-lead conversion rate, top requested services. Advanced analytics (Pro+) includes deeper breakdowns.
- **Conversation Learning (Pro+):** Analyzes conversation patterns to surface frequently asked questions, pricing confusion signals, and gaps. Always for review, never auto-applied.
- **Billing:** What their plan is, trial, how to upgrade, how to open the Stripe Customer Portal to manage payment.
- **Widget:** What the widget does (answers questions, captures leads, collects quote requests; optional voice if they have it); where to customize it (Settings); multiple languages (default/supported languages, language switcher in Settings).
- **Team:** How to invite teammates and what roles mean.
- **Auto Follow-up:** Basic and advanced follow-up rules (if enabled on their plan; in Developer Mode: Automations): auto-send template replies, AI-generated drafts for approval, internal-only notifications, and follow-up history.
- **Inbox / Bookings / Voice / Tools / Advanced analytics:** Only if enabled on their plan.
- **Global search:** Users can press Cmd+K (Mac) or Ctrl+K (Windows) from anywhere in the dashboard to open the command palette. They can search for pages, actions, leads, quote requests, conversations, knowledge sources, automations, and agents—and jump directly to any result.
`;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const key = `help-chat:ip:${ip}`;
  const result = rateLimit({ key, limit: 30, windowMs: 60_000 });
  if (!result.allowed) {
    return NextResponse.json(
      { error: 'Too many messages. Please slow down.', reply: null },
      { status: 429 }
    );
  }

  let body: { message?: unknown; history?: { role: string; content: string }[] } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', reply: null }, { status: 400 });
  }

  const rawMessage = body.message;
  const message = typeof rawMessage === 'string' ? rawMessage.trim().slice(0, 2000) : '';
  if (!message) {
    return NextResponse.json({ error: 'Message is required', reply: null }, { status: 400 });
  }

  const rawHistory = Array.isArray(body.history) ? body.history : [];
  const history = rawHistory
    .slice(-20)
    .filter(
      (m): m is { role: 'user' | 'assistant'; content: string } =>
        m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
    )
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: String(m.content).slice(0, 2000) }));

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Help is not configured.', reply: 'Help chat is not available right now. Please try again later.' }
    );
  }

  let userAccessBlock: string;
  try {
    const user = await getUser();
    const orgId = user ? await getOrganizationId(user) : null;
    if (orgId) {
      const supabase = createAdminClient();
      const { plan, entitlements } = await getEntitlements(supabase, orgId);
      const planName = plan?.name ?? 'Free';
      userAccessBlock = buildUserAccessBlock(planName, entitlements);
    } else {
      userAccessBlock =
        "You do not know this user's plan. Give general help only. If they ask about a paid feature (e.g. multiple agents, removing widget branding, automations, tools, integrations, advanced analytics), say they can go to Billing in the sidebar to see plans and upgrade.";
    }
  } catch (e) {
    console.warn('Help chat: could not load user plan', e);
    userAccessBlock =
      "You do not know this user's plan. Give general help only. If they ask about a paid feature, say they can go to Billing in the sidebar to see plans and upgrade.";
  }

  const systemContent = `${HELP_BASE_PROMPT}

---
THIS USER'S ACCESS:

${userAccessBlock}
`;

  const openai = new OpenAI({ apiKey });
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: systemContent },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
      max_tokens: 400,
    });
    const reply = completion.choices[0]?.message?.content?.trim() ?? 'Sorry, I could not generate a response.';
    return NextResponse.json({ reply, error: null });
  } catch (err) {
    console.error('Help chat OpenAI error:', err);
    return NextResponse.json(
      { error: 'Something went wrong.', reply: 'Something went wrong. Please try again in a moment.' },
      { status: 500 }
    );
  }
}
