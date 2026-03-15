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

  have.push('Dashboard (see leads, conversations, quote requests, overview)');
  have.push('Settings (business name, welcome message, tone, widget look; languages and language switcher)');
  have.push('Leads (see who gave their email in the widget)');
  have.push('Quote requests (see quote requests from the widget)');
  have.push('Conversations (read chat history with visitors)');
  have.push('Install (copy a code and put it on their website so the chat appears)');
  have.push('Billing (see their plan, upgrade, or manage payment)');
  have.push('AI Setup Assistant (describe what you want in natural language; AI configures agent, lead capture, notifications—then Publish; requires active subscription)');
  have.push('Deployments (get embed code per agent; under Developers in the sidebar)');

  if (entitlements.inbox_enabled) {
    have.push('Inbox (assign conversations, reply as human, notes, tags; under Activity in the sidebar)');
  } else {
    dontHave.push('Inbox (human takeover, assignment, notes—that\'s on a higher plan)');
  }

  if (entitlements.ai_actions_enabled) {
    have.push('AI Actions (create_lead, book_appointment, etc.—under Workspace)');
  } else {
    dontHave.push('AI Actions (that\'s on a higher plan)');
  }

  if (entitlements.bookings_enabled) {
    have.push('Bookings (appointments from the widget; under Activity)');
  } else {
    dontHave.push('Bookings (that\'s on a higher plan)');
  }

  if (entitlements.voice_enabled) {
    have.push(`Voice (voice conversations in the widget; enable per agent; monthly minutes apply)`);
  } else {
    dontHave.push('Voice (that\'s on a higher plan)');
  }

  if (entitlements.max_agents > 1) {
    have.push('Multiple Agents (create more than one AI assistant; each can have different settings)');
  } else {
    dontHave.push('Multiple Agents (only one AI assistant on this plan)');
  }

  if (entitlements.widget_branding_removal) {
    have.push('Remove "Powered by Spaxio" from the widget (so only their brand shows)');
  } else {
    dontHave.push('Remove "Powered by Spaxio" from the widget (that\'s on a paid plan)');
  }

  if (entitlements.max_knowledge_sources > 0) {
    have.push(`Knowledge (add up to ${entitlements.max_knowledge_sources} source(s) so the AI can read their docs or website)`);
  } else {
    dontHave.push('Knowledge (adding documents or URLs for the AI to read is on a paid plan)');
  }

  if (entitlements.automations_enabled) {
    have.push('Automations (set up rules that run when something happens, e.g. when a lead is captured)');
  } else {
    dontHave.push('Automations (that\'s on a higher plan)');
  }

  if (entitlements.tool_calling_enabled) {
    have.push('Tools (give the AI tools like calendar or custom actions)');
  } else {
    dontHave.push('Tools for the AI (that\'s on a higher plan)');
  }

  if (entitlements.integrations_enabled) {
    have.push('Integrations (connect to other apps)');
  } else {
    dontHave.push('Integrations (that\'s on a higher plan)');
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

const HELP_BASE_PROMPT = `You are the in-app help robot for Spaxio Assistant. Spaxio Assistant is the app where you are right now: it lets people put a chat on their website, collect leads and quote requests, and manage everything from this dashboard.

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
- For "how do I install the widget?", give: 1) Open Spaxio Assistant and log in. 2) Click "Install" in the left sidebar. 3) Copy the code (script tag). 4) Paste it into your website HTML just before the closing </body> tag. 5) Save and publish. Put the script example on its own line so they can copy it.

**Topics you can explain (only if the user has access - see below):**
- **Dashboard / Overview:** What the numbers mean (leads, conversations, quote requests, inbox, actions, bookings), trial banner, upgrade button.
- **Settings (or Assistant):** Where to set business name, welcome message, tone; widget look and behaviour; **widget languages** (default language, supported languages, show language switcher, custom translations)—under Settings.
- **Leads:** Where leads appear (Leads under CRM), how to view them, where to set the email that gets notified (in Settings).
- **Quote requests:** How they are created from the widget, where to see them (Quote requests under CRM), what the fields mean.
- **Conversations:** Where to see the list of chats (Activity → Conversations), how to open and read a conversation.
- **Install:** How to get the code and put it on their website: 1) Install in the sidebar (or Deployments for per-agent code). 2) Copy the script. 3) Paste just before </body>. 4) Save and publish. Put the script example on its own line so they can copy it.
- **Billing:** What their plan is, trial, how to upgrade, how to open the Stripe Customer Portal to manage payment.
- **Widget:** What the widget does (chat, capture leads, quote requests; optional voice if they have it); where to customize it (Settings); multiple languages (default/supported languages, language switcher in Settings).
- **AI Setup Assistant:** In the sidebar under Workspace. User describes what they want in natural language; the AI suggests agent setup, lead capture, email notification, webhook. They review and click Publish when ready. Requires an active subscription. If they don't have a subscription, tell them to go to Billing first.
- **Agents:** How to create or edit agents (Workspace → Agents), where they appear; if they have multiple agents, explain that. Voice can be enabled per agent (Voice or agent settings) if they have the Voice feature.
- **Knowledge:** Only if they have it - how to add a source, upload a doc, or add a URL; what the limits are (Workspace → Knowledge).
- **Inbox:** Only if they have it - Activity → Inbox; assign conversations, reply as a human, add notes and tags, view voice transcripts.
- **Bookings:** Only if they have it - Activity → Bookings; appointments created from the widget or AI actions.
- **Voice:** Only if they have it - enable voice per agent (Voice settings or agent); monthly voice minutes limit; widget can offer voice button.
- **Deployments:** Developers → Deployments; get embed code per agent/widget deployment.
- **AI Actions:** Only if they have it - Workspace → AI Actions; create_lead, book_appointment, etc.
- **Automations / Integrations / Tools / Advanced analytics:** Only if they have that feature—brief, step-by-step. If they don't have it, say it's on a higher plan and they can upgrade in Billing.
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
