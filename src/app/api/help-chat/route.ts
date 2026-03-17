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
  have.push('AI Setup (set up your website assistant with AI)');
  have.push('AI Assistants (create and adjust how your assistant behaves)');
  have.push('Knowledge (teach your assistant from your website and files)');
  have.push('Install (install the assistant on your website and preview it)');
  have.push('Conversations (read chat history with visitors)');
  have.push('Leads (see people who shared contact info)');
  have.push('Quote requests (see quote requests from the widget)');
  have.push('Quote Form Setup (configure how the quote form appears in the widget: intro text, submit button, required fields, estimate display)');
  have.push('Pricing Rules (configure how estimates are calculated from quote form inputs)');
  have.push('Team (invite and manage team members)');
  have.push('Billing (see plan and manage payment)');
  have.push('Settings (business info, widget look, assistant tone, notifications)');

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
    have.push(`Voice (voice conversations in the widget; enable per assistant; monthly minutes apply)`);
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
- **Overview:** What the numbers mean (leads, conversations, quote requests), trial banner, upgrade button.
- **AI Setup:** Give your website URL and preferences; the AI analyzes the site, drafts setup, and applies safe changes. You can edit in chat (e.g. "make tone more professional", "change welcome message"). Review the draft summary and click Publish when ready.
- **AI Assistants:** How to create and edit assistants (how the assistant behaves and what it should do).
- **Knowledge:** How to add a source (add a website URL or upload a file) and what limits mean.
- **Install:** How to install the assistant on their website: 1) Click Install in the sidebar. 2) Copy the script. 3) Paste just before </body>. 4) Save and publish.
- **Conversations:** Where to see the list of chats and how to open them.
- **Leads:** Where leads appear and how to follow up.
- **Quote requests:** Where quote requests appear and what the fields mean.
- **Quote Form Setup:** In Quote Requests → Form Setup, control how the quote form appears in the widget: intro text, submit button label, whether name/email/phone are required, and how the estimate is shown.
- **Pricing Rules:** In Quote Requests → Pricing Rules, configure variables and rules that calculate the estimate. Use templates (e.g. Landscaping) or build custom rules.
- **Billing:** What their plan is, trial, how to upgrade, how to open the Stripe Customer Portal to manage payment.
- **Widget:** What the widget does (answers questions, captures leads, collects quote requests; optional voice if they have it); where to customize it (Settings); multiple languages (default/supported languages, language switcher in Settings).
 - **Team:** How to invite teammates and what roles mean.
 - **Automations:** Basic automations (if enabled on their plan).
 - **Inbox / Bookings / Voice / Tools / Advanced analytics:** Only if enabled on their plan.
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
