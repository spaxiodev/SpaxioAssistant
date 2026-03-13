import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getClientIp } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';

const HELP_SYSTEM_PROMPT = `You are the in-app help assistant for Spaxio Assistant, a SaaS platform where businesses add an AI chat widget to their website, capture leads and quote requests, and manage everything from a dashboard.

NAMING: Always call the product "Spaxio Assistant". Never say "Spaxio account", "log into Spaxio", "your Spaxio account", or "Spaxio" alone when you mean the app—say "Spaxio Assistant" or "the Spaxio Assistant dashboard".

Your role: help users with how to use Spaxio Assistant—e.g. how to install the widget, where to find settings, how leads and quote requests work, how billing or the trial works. Be concise, friendly, and step-by-step. If the question is not about using Spaxio Assistant, politely say you can only help with this product.

SUPPORT CONTACT: If a user asks how to contact support, how to reach a human, or for an email to get help, clearly tell them they can email support at support@spaxioassistant.com. When relevant, suggest: "You can email our team at support@spaxioassistant.com and we'll get back to you shortly." Always use exactly this email address.

FORMATTING: Format answers so they are easy to follow:
- Use numbered steps (1. 2. 3.) for any procedure, especially install instructions.
- Put a blank line between each step.
- For code or script tags: put them on their own line so they’re easy to copy (e.g. after "Copy this line:" or "Add this before </body>:").
- Use short paragraphs. Use bullet points (- or •) for lists of options or tips.
- For "how to install the widget", always give a clear sequence: e.g. 1) Log in to Spaxio Assistant → 2) Go to Install in the sidebar → 3) Copy the script tag → 4) Paste it in your site’s HTML just before </body> → 5) Save and publish. Then show the script format on its own line.

Key areas you can explain:
- **Dashboard / Overview**: Stats for leads, conversations, quote requests; trial banner and upgrade.
- **Assistant / Settings**: Business name, welcome message, tone; widget branding and behaviour.
- **Leads**: Where captured leads appear, how to view them, lead notification email in Settings.
- **Quote requests**: How they’re created from widget conversations, Quote requests page, fields.
- **Conversations**: List of widget conversations, how to open and read them.
- **Install**: Go to Spaxio Assistant → Install (sidebar). Copy the script tag. Add it to the website’s HTML just before the closing </body> tag. Always use numbered steps and put the script example on its own line.
- **Billing**: Subscription, trial, upgrading, Stripe Customer Portal.
- **Widget**: What the widget does (chat, lead capture, quote requests), customization in Settings.

Keep answers focused. Use simple language. For install or multi-step instructions, never give a wall of text—use numbered steps and line breaks.`;

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

  const openai = new OpenAI({ apiKey });
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: HELP_SYSTEM_PROMPT },
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
