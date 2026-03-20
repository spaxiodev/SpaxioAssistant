# Spaxio Assistant — Detailed Website Summary

This document describes what the Spaxio Assistant website and product do, at a level of detail suitable for onboarding, documentation, or product overviews.

**Keeping the AI in sync:** When you change the product (new features, routes, or capabilities), update (1) `src/lib/product-context.ts` (used by the AI Setup Assistant) and (2) the help-chat system prompt and `buildUserAccessBlock` in `src/app/api/help-chat/route.ts` so the in-app AI stays accurate.

---

## 1. Product overview

**Spaxio Assistant** is an **AI website assistant for businesses**. It learns the business, answers customer questions, captures leads, collects quote requests, automates follow-up, and provides AI-powered intelligence to help businesses respond faster and miss fewer opportunities.

- **Install on your website** — Add one script to your website to show the assistant widget (or embed a full-page AI assistant).
- **Answer customer questions** — The assistant responds using your business info and knowledge sources.
- **Capture leads** — Collect visitor contact info (name, email, phone, message, etc.) and notify your team.
- **Collect quote requests** — Capture project details in a structured form so you can respond faster; configurable quote form with pricing rules for instant estimates.
- **Learn from your website** — Paste a website URL (and/or upload files) so the assistant answers from your real content.
- **AI Website Auto-Setup** — Scan a website URL and automatically configure business settings, knowledge, agents, automations, and widget in one step.
- **AI Lead Qualification** — Every lead is automatically scored, prioritized (Hot / Likely / Needs follow-up), and summarized; high-priority leads can trigger automatic deal creation.
- **AI Follow-Up Engine** — AI-generated follow-up email drafts with approval workflow; template-based or AI-enhanced; send logs with deduplication.
- **AI Memory** — The assistant extracts and remembers preferences and context across a conversation; memories surface in lead details and influence future replies.
- **AI Document Generation** — Generate lead summaries, quote drafts, and proposals from lead or quote request context.
- **AI Suggestions** — Proactive AI recommendations (e.g. "Add pricing info", "Follow up high-intent lead") grounded in real conversation data.
- **Conversation Insights** — Aggregated patterns from conversations (frequent questions, drop-off, pricing confusion, etc.) for ongoing optimization.
- **Email Automation** — Receive inbound emails, auto-reply with AI-enhanced templates per language, connect providers (Gmail, Outlook, IMAP, Resend), manage away messages and business hours.
- **AI Workflow Generator** — Describe an automation in plain language; AI generates the trigger + steps.
- **AI Website Actions** — The assistant can trigger page actions (open form, scroll to section, open link) on the host website via the embed script.
- **Voice** — Voice sessions on the widget for spoken conversations.
- **Automations** — Rule-based automations (trigger types: lead submitted, quote request, support request, webhook received, etc.) with multi-step sequences.
- **Team, billing, and settings** — Invite team members, manage your plan, and control your assistant and widget settings.

The site is **i18n-ready** (e.g. English and French) and uses Next.js, Supabase (Postgres/Auth/RLS), OpenAI (server-side), Stripe, and Resend.

### Non-core areas removed or hidden

To keep the dashboard focused, these areas are removed from navigation and (in many cases) removed entirely:

- CRM sections that are not essential (companies, deals, tickets, tasks/notes/activities UI)
- Support tickets UI
- Documents and document templates UI
- Standalone AI Actions UI
- Integrations UI (when not fully implemented)
- Dashboard preview routes and preview-only maintenance code
- Demo sign-in route and test/dev routes
- Advanced multi-business/workspace management UI (hidden)
- Public webhook management UI unless in explicit developer-only mode (hidden)

---

## 2. Public-facing website (no login)

| Route | Purpose |
|-------|--------|
| `/[locale]/` | Home: value prop, tagline, "Get started" / "Log in", feature pills (widget branding, lead capture, quote requests, theme). |
| `/[locale]/pricing` | Pricing: plan cards (Free, Starter, Pro, Business, Enterprise), feature comparison, "Current plan" when logged in, CTA to dashboard or billing. |
| `/[locale]/contact` | Contact form: name, email, subject, message; submitted to support (e.g. Resend or internal). |
| `/[locale]/login` | Log in (email/password, Supabase Auth). |
| `/[locale]/signup` | Sign up; creates user, then onboarding can create org, business settings, widget, trial subscription. |
| `/[locale]/privacy-policy` | Privacy policy page. |
| `/[locale]/terms-and-conditions` | Terms and conditions page. |
| `/[locale]/widget-preview` | Preview of the chat widget (for testing). |
| `/[locale]/demo/ai-chat` | Demo AI chat page. |
| `/[locale]/widget` | Widget UI (iframe/embed target). |
| `/[locale]/ai-website-assistant` | SEO landing page for AI website assistant. |
| `/[locale]/ai-customer-support-ai` | SEO landing page for AI customer support. |

**Locale:** Routes are under `[locale]` (e.g. `en`, `fr`). Navigation and copy come from `messages/en.json` and `messages/fr.json`.

---

## 3. Authentication and onboarding

- **Auth:** Supabase Auth (email/password). Session is used to resolve the current user and, via `organization_members`, the current **organization**.
- **Organization:** Multi-tenant; each org has members with roles: `owner`, `admin`, `manager`, `agent_operator`, `member`, `viewer`. Multiple organizations supported per user (org switch, create, delete, list APIs).
- **Onboarding:** After signup, `ensure-org` / onboarding flow can create default org, business settings, one widget, and a trial subscription. Optional "learn from website" step can scrape a URL to populate company description/FAQs. AI Setup Assistant (sessions-based) guides users through setup interactively.
- **Dashboard access:** Dashboard layout requires a logged-in user and an `organization_id`; otherwise redirect to login.
- **Setup progress:** `/api/setup-progress` tracks completion of key onboarding steps.

---

## 4. Dashboard (logged-in)

Dashboard is under `/[locale]/dashboard` with a sidebar and header. **Subscription/trial** and **onboarding** (e.g. business name) are gated where relevant; upgrade CTAs and onboarding prompts are shown when needed.

### 4.0 Dashboard view modes (Simple vs Developer)

The dashboard supports two **view modes** that change navigation, copy, and (in many cases) which UI renders for the same URL:

- **Simple Mode** — Streamlined, plain-language navigation and "get live fast" workflows. The URL stays under `/dashboard/...`, but the main content is rendered by a **Simple Mode router** that swaps in simplified page components.
- **Developer Mode** — More controls, but still focused on the core product areas (including plan-gated sections).

**How it works (implementation details):**

- **Mode toggle**: In the dashboard header (desktop), a "Simple / Developer" control with a Switch sets the mode.
- **Persistence**: Saved in `localStorage` under `spaxio-view-mode`.
- **Context**: `ViewModeProvider` supplies `mode` and `setMode`; `useViewMode()` is used by header, sidebar, and content.
- **Mode-aware main content**: `ModeAwareContent` renders the normal page in Developer Mode, and renders `SimpleModeRouter` in Simple Mode.
- **Per-page gating**: Some pages use `ViewModeClientGate` to render a simplified block in Simple Mode while preserving the full Developer Mode UI.
- **Plan gating**: Some nav items show a lock icon when the current plan does not include the feature (e.g. inbox, automations, webhooks, integrations, bookings, AI actions).

**Dashboard header options (available regardless of mode):**

- **View mode**: "Simple" button, Switch, "Developer" button.
- **Desktop quick links**: Locale switcher, theme toggle, Billing, Pricing, Settings, Help, Home, Sign out.
- **Mobile menu**: Equivalent links in a dropdown ("More options"), plus locale switcher and sign out.

#### 4.0.1 Simple Mode — every navigation option (sidebar)

Simple Mode uses a reduced sidebar with friendly labels:

- **Home** → `/dashboard`
- **AI Setup** → `/dashboard/ai-setup`
- **Conversations** → `/dashboard/conversations` (also covers `/dashboard/inbox`)
- **Leads** → `/dashboard/leads` (also covers `/dashboard/contacts` and `/dashboard/quote-requests`)
- **Install** → `/dashboard/install`
- **Help** → `/help`
- **Settings** → `/dashboard/settings`
- **Switch to Developer Mode** (button that flips mode; it does not navigate by itself)

#### 4.0.2 Simple Mode — every route mapping (SimpleModeRouter)

In Simple Mode, these URLs render simplified pages:

| Developer URL (still used) | Simple Mode component | Notes |
|---|---|---|
| `/dashboard` | `SimpleDashboardOverview` | Quick actions + setup progress + recommendations + website setup status card. |
| `/dashboard/ai-setup` | `SimpleAiSetupPage` | Three paths: automatic from website URL, guided AI setup (sessions), manual describe. |
| `/dashboard/install` | `SimpleInstallPage` | Plain-language install flow; opens full Install page in Developer Mode for copy/paste code + preview. |
| `/dashboard/agents` (and `/dashboard/agents/*`) | `SimpleAgentsPage` | Create/list agents in a simplified layout; links to edit in Developer Mode. |
| `/dashboard/automations` | `SimpleAutomationsPage` | Recipe-style cards + list; toggles; "Tell AI what should happen automatically" → AI workflow generator; links to full editor in Developer Mode (plan-gated). |
| `/dashboard/leads`, `/dashboard/contacts`, `/dashboard/quote-requests` | `SimpleLeadsPage` | Lead list + simple actions; links to full CRM pages. |
| `/dashboard/team` (and `/dashboard/account/add`) | `SimpleTeamPage` | Team list + invitations; some actions switch to Developer Mode (plan-gated for team size). |
| `/dashboard/settings` | `SimpleSettingsPage` | Simplified settings form + AI assist actions. |
| `/dashboard/knowledge` | `SimpleKnowledgePage` | Add URL / upload content + list sources; AI assist; links to full Knowledge (plan-gated by source limits). |
| `/dashboard/inbox` and `/dashboard/conversations` | `SimpleConversationsPage` | Simplified conversation list; links to full inbox/conversation pages (inbox may be plan-gated). |
| `/dashboard/billing` | `SimpleBillingPage` | Current plan + usage; "Upgrade" and "Manage subscription" switch to Developer Mode. |
| `/dashboard/account` | `SimpleAccountPage` | Simplified account page. |
| Other `/dashboard/*` | `SimpleGenericPage` | Fallback placeholder for uncommon/unsupported simple-mode routes (e.g. webhooks, integrations, documents). |

#### 4.0.3 Developer Mode — every navigation option (sidebar)

Developer Mode focuses on the core sections:

- **Overview** → `/dashboard`
- **AI Setup** → `/dashboard/ai-setup`
- **Agents** → `/dashboard/agents`
- **Knowledge** → `/dashboard/knowledge`
- **Install** → `/dashboard/install`
- **Conversations** → `/dashboard/conversations`
- **Leads** → `/dashboard/leads`
- **Quote Requests** → `/dashboard/quote-requests`
- **Automations** → `/dashboard/automations` *(plan-gated)*
- **Team** → `/dashboard/team` *(plan-gated by team limits)*
- **Billing** → `/dashboard/billing`
- **Settings** → `/dashboard/settings`

**Account dropdown (top of sidebar, when logged in):**

- **Account** → `/dashboard/account`
- **Settings** → `/dashboard/settings`
- **Team Members** → `/dashboard/team` *(plan-gated by team limits; lock may show)*
- **Sign out**

### 4.1 Workspace (main product)

| Section | Route | Purpose |
|--------|--------|--------|
| **Overview** | `/dashboard` | Summary cards: leads captured, conversations, quote requests; trial/subscription status; quick links to AI Setup, Install, Leads, Conversations, Billing; website setup status card (Simple Mode). |
| **AI Assistants** | `/dashboard/agents` | Create and edit your website assistant (goal, tone, what to capture, knowledge, and follow-up). |
| **AI Assistants (single)** | `/dashboard/agents/[id]` | Edit an assistant and view run history. |
| **New assistant** | `/dashboard/agents/new` | Create a new assistant. |
| **Automations** | `/dashboard/automations` | List automations; create/edit; trigger types (e.g. lead_form_submitted, quote_request_submitted, support_requested, webhook_received), steps, enable/disable; AI workflow generator (plain-language → draft). |
| **Knowledge** | `/dashboard/knowledge` | Add website URLs and files so the assistant answers from your content. |
| **Install** | `/dashboard/install` | Copy script tag for widget embed and preview; choose display mode (widget, full-page, or both). |
| **Conversations** | `/dashboard/conversations` | Chat conversations per widget; view messages, delete. |
| **Inbox** | `/dashboard/inbox` | Full inbox view: conversation list, reply, notes, escalate, assign, tag, draft (plan-gated). |
| **Leads** | `/dashboard/leads` | Leads from widget; AI score/priority badges; AI Summary and next recommended action; follow-up card (email draft, create task/note); memory card (what we know); generate document actions. |
| **Quote requests** | `/dashboard/quote-requests` | Quote requests submitted via widget; follow-up sheet with AI follow-up card and document generation. |
| **Team** | `/dashboard/team` | Invite and manage team members. |
| **Billing** | `/dashboard/billing` | Current plan and Stripe portal. |
| **Settings** | `/dashboard/settings` | Business and widget settings; widget action mappings; assistant display mode. |

### 4.2 AI Setup (sessions-based)

The AI Setup flow at `/dashboard/ai-setup` supports multiple setup paths:

- **Automatic from website URL** — `POST /api/ai-setup/quick-setup-from-website` or website scanner (`/api/ai-setup/website-scan`); scans the site, extracts business info, and pre-fills settings.
- **Guided AI setup (sessions)** — Conversational setup: creates a session (`POST /api/ai-setup/sessions`), sends chat messages (`POST /api/ai-setup/sessions/[id]/chat`), applies a safe draft (`POST /api/ai-setup/apply-safe-draft`), publishes (`POST /api/ai-setup/publish`).
- **Templates** — Industry-aware starter templates (`GET /api/ai-setup/templates`) and `industry_presets` table; seeded for Home Services, Agency/Consulting, Local Service Business, E-commerce, Clinic/Healthcare, SaaS/Software.
- **Business setup drafts** — `/api/business-setup/drafts` (create, extract via AI, publish); allows staging and previewing changes before committing.
- **Logo upload** — `POST /api/ai-setup/logo-upload`.

### 4.3 Intelligence and suggestions

- **AI Suggestions** (`/api/ai-suggestions`) — Proactive org-scoped suggestions (add pricing info, follow up high-intent lead, improve greeting, etc.); status: active / dismissed / completed / snoozed; grounded in real data.
- **Conversation Insights** (`/api/conversation-insights`) — Aggregated weekly/period patterns: frequent questions, pricing confusion, service inquiries, drop-off, language patterns, escalations.
- **Lead Intelligence Cache** (`/api/dashboard/intelligence`) — Cached lead quality aggregates (high/medium/low priority counts, needs-followup count, top services, avg score); used for dashboard overview cards.

### 4.5 Setup and account

| Section | Route | Purpose |
|--------|--------|--------|
| **Install** | `/dashboard/install` | Copy the script tag for your website; preview the widget; choose which assistant powers it; choose display mode (widget, full-page, or both). |
| **Settings** | `/dashboard/settings` | Business settings: name, industry, description, services, pricing notes, FAQ, tone, contact email, phone, lead notification email, brand color, welcome message, "learn from website," logo, widget position, widget action mappings, assistant display mode. |
| **Assistant** | `/dashboard/assistant` | Assistant/chat config summary; link to Settings. |
| **Billing** | `/dashboard/billing` | Current plan, subscription status, Stripe Customer Portal link, usage (when available). |
| **Account** | `/dashboard/account` | Profile (name, avatar); link to Settings; "Add account" (invite/add user to org). |
| **Account add** | `/dashboard/account/add` | Add/invite member to organization. |

---

## 5. Widget and embed flow

- **Install (widget):** In Dashboard → Install, the user copies a script tag, e.g.  
  `<script src="https://<APP_URL>/widget.js" data-widget-id="<WIDGET_UUID>"></script>`  
  and adds it before `</body>` on their site.
- **Widget script:** `widget.js` (or embed script) loads an iframe that points to the app's widget page (e.g. `/[locale]/widget`), passing widget ID.
- **Widget UI:** The iframe shows the chat UI: welcome message, theme/branding from business settings, and optional lead/quote forms. Display mode can be `widget` (floating button), `full_page` (shareable URL), or `both`.
- **Chat:** Messages are sent to **POST `/api/widget/chat`** with `widgetId`, `conversationId` (optional), `message`, and optional `language`. The API:
  - Validates widget and resolves organization and subscription (trial or active); enforces message/AI limits by plan.
  - Resolves or creates a conversation; stores user message in `messages`.
  - Loads agent (if widget is linked to an agent) and business settings; builds system prompt from agent + business context (and optional knowledge). Injects relevant AI memories from `ai_memories` for the conversation/visitor.
  - Calls OpenAI; appends assistant reply to `messages`; returns reply to the widget.
  - Optionally parses an `ACTION:` line from the AI reply (e.g. `open_quote_form`, `scroll_to_section`, `open_link`) and returns `action: { type, payload }` in the response; strips the action line from the visible reply.
  - Runs AI memory extraction in the background (fire-and-forget); stores memories linked to conversation and lead.
  - Records usage (e.g. `message_count`, `ai_action_count`) for billing.
- **Lead capture:** Widget can submit lead form to **POST `/api/widget/lead`** (name, email, phone, message, conversationId, etc.). Creates a lead; runs AI qualification (score, priority, summary, recommended stage/value/action) asynchronously; if high-priority, creates a contact and deal; optionally triggers `lead_form_submitted` automation event; can send lead notification email (Resend); triggers AI follow-up generation.
- **Quote request:** Widget submits to **POST `/api/widget/quote`**; creates a `quote_requests` row linked to conversation; triggers AI follow-up generation.
- **Estimate:** **POST `/api/widget/estimate`** — returns a price estimate from the quote pricing engine given form inputs.
- **Widget config:** **GET `/api/widget/config`** returns branding, welcome message, action mappings, and config for the widget by widget ID.
- **Voice:** Widget supports voice sessions (**POST `/api/widget/voice/start`**, `/api/widget/voice/turn`, `/api/widget/voice/end`).
- **Website Actions:** The embed script (`widget.js`) listens for `spaxio-action` postMessage from the widget iframe. When the chat API returns an action, the embed calls `dispatchWebsiteAction`:
  - `open_link` with `payload.url` → opens URL in a new tab.
  - `scroll_to_section` with `payload.section_id` → scrolls to the matching element.
  - `open_contact_form` / `open_quote_form` / etc. → if `widget_action_mappings` maps the action to a CSS selector, clicks/scrolls it; otherwise fires `CustomEvent('spaxio-website-action', { detail: action })` for the host page to handle.

---

## 6. API routes (summary)

APIs are under `src/app/api/`. Key groups:

### 6.1 Widget (public, CORS)

- `POST /api/widget/chat` — Chat message; validate widget/subscription, persist message, inject memory, call OpenAI, parse action from reply, extract memory, return reply + optional action, record usage.
- `POST /api/widget/lead` — Submit lead form; create lead, run AI qualification, optionally create deal for high-priority leads, emit automation event, optional email, trigger AI follow-up.
- `POST /api/widget/quote` — Submit quote request; trigger AI follow-up.
- `POST /api/widget/estimate` — Return price estimate from pricing engine.
- `GET /api/widget/config` — Widget config by widget ID (branding, welcome message, action mappings, etc.).
- `GET /api/widget/by-agent` — Resolve widget by agent.
- `POST /api/widget/voice/start` / `/turn` / `/end` — Voice session management.

### 6.2 Billing (Stripe)

- `POST /api/billing/checkout` — Create Stripe Checkout session (plan/price); redirect to Stripe.
- `GET/POST /api/billing/portal` — Stripe Customer Portal (manage subscription).
- `POST /api/billing/webhook` — Stripe webhooks: `checkout.session.completed`, `customer.subscription.updated` / `deleted`; update `subscriptions`, set `plan_id`, etc.
- `GET /api/billing/status` — Current billing status for the org.

### 6.3 Agents

- `GET/POST /api/agents` — List/create agents (org-scoped).
- `GET/PATCH/DELETE /api/agents/[id]` — Get/update/delete agent.
- `POST /api/agents/[id]/test` — Test run agent.
- `GET /api/tools/list` — List tools available to agents (plan-gated).
- `POST /api/tools/run` — Execute a tool (e.g. for agent tool-calling); plan-gated.

### 6.4 Knowledge

- `GET /api/knowledge/sources` — List knowledge sources (org).
- `POST /api/knowledge/upload` — Upload file for a source.
- `POST /api/knowledge/ingest-url` — Ingest URL (scrape/store) for knowledge.

### 6.5 Automations

- `GET/POST /api/automations` — List/create automations.
- `GET/PATCH/DELETE /api/automations/[id]` — Get/update/delete automation.
- `GET/POST /api/automations/[id]/steps` — Get/replace steps.
- `POST /api/automations/[id]/toggle` — Enable/disable.
- `POST /api/automations/[id]/test` — Test run.
- `GET /api/automations/runs` — List runs (org).
- `GET /api/automations/runs/[id]` — Get one run.
- `GET /api/automations/analytics` — Analytics for automations.
- `POST /api/automations/events` — Emit event (internal; used e.g. by widget/lead).
- `POST /api/automations/form` — Form submission handler.
- `GET /api/automations/cta` — CTA/config for forms.
- `POST /api/automations/generate` — **AI Workflow Generator**: body `{ instruction }`, returns `{ draft }` (trigger + steps).
- **Cron:** `GET /api/cron/automations-schedule` — Scheduled automation runs (if configured).

### 6.6 Webhooks

- `GET/POST /api/webhooks/endpoints` — List/create webhook endpoints (org).
- `GET/PATCH/DELETE /api/webhooks/endpoints/[id]` — Get/update/delete endpoint.
- `GET/POST /api/webhooks/endpoints/[id]/mappings` — Field mappings for endpoint.
- `GET/PATCH/DELETE /api/webhooks/endpoints/[id]/mappings/[mappingId]` — Single mapping.
- `POST /api/webhooks/[token]` — **Inbound webhook:** token is automation's `webhook_token`; triggers automation.
- `POST /api/webhooks/incoming/[id]` — Incoming webhook to a specific endpoint; may write to `webhook_events` and apply field mappings.

### 6.7 AI Pages and pricing

- `GET/POST /api/dashboard/ai-pages` — List/create AI pages (org).
- `GET/PATCH/DELETE /api/dashboard/ai-pages/[id]` — Get/update/delete AI page.
- `POST /api/dashboard/ai-pages/[id]/publish` — Publish/unpublish AI page.
- `GET/POST /api/dashboard/pricing-profiles` — List/create quote pricing profiles.
- `GET/PATCH/DELETE /api/dashboard/pricing-profiles/[id]` — Get/update/delete profile.
- `GET /api/dashboard/pricing-profiles/[id]/preview` — Preview/test estimate for a profile.
- `GET/POST /api/dashboard/pricing-rules` — Pricing rules (for quote engine).
- `GET/PATCH/DELETE /api/dashboard/pricing-rules/[id]` — Single pricing rule.
- `GET/POST /api/dashboard/pricing-variables` — Pricing variables.
- `GET/POST /api/dashboard/quote-form-config` — Quote form configuration.

These APIs exist, but AI Pages / advanced pricing are currently **not part of the core dashboard navigation** and may be hidden for most users.

### 6.8 AI Page (public)

- `POST /api/ai-page/chat` — Chat on a public AI page.
- `POST /api/ai-page/complete` — Completion on a public AI page.
- `GET /api/ai-page/config` — Config for a public AI page.
- `POST /api/ai-page/quote-submit` — Submit quote from AI page.
- `POST /api/ai-page/session` — Create session on AI page.

### 6.9 AI Setup (assistant sessions)

- `GET /api/ai-setup/sessions` — List setup sessions.
- `POST /api/ai-setup/sessions` — Create a new setup session.
- `GET/PATCH/DELETE /api/ai-setup/sessions/[id]` — Get/update/delete a session.
- `POST /api/ai-setup/sessions/[id]/chat` — Chat with the AI Setup Assistant.
- `POST /api/ai-setup/apply-safe-draft` — Apply a reviewed draft from a setup session.
- `POST /api/ai-setup/publish` — Publish the setup (go live).
- `POST /api/ai-setup/logo-upload` — Upload logo via setup flow.
- `POST /api/ai-setup/quick-setup-from-website` — Quick one-step setup from website URL.
- `POST /api/ai-setup/website-scan` — Start website scan run.
- `GET /api/ai-setup/website-scan/[runId]` — Poll website scan status and result.
- `GET /api/ai-setup/templates` — List industry-aware setup templates.

### 6.10 Website Auto-Setup

- `POST /api/website-auto-setup/start` — Start a full automated setup run (scans URL, configures business settings, knowledge, agents, automations, widget).
- `GET /api/website-auto-setup/status/[runId]` — Poll run status and result summary.
- `GET /api/website-auto-setup/latest` — Get the most recent setup run for the org.

### 6.11 Follow-up

- `GET /api/follow-up` — Get AI follow-up runs for a lead / quote request / source.
- `POST /api/follow-up/apply` — Apply a follow-up action (create task, add note).
- `GET/POST /api/follow-up/drafts` — List/create follow-up drafts (approval workflow).
- `GET/POST /api/follow-up/templates` — List/update follow-up email templates (localized).

### 6.12 Email Automation

- `GET/PATCH /api/email-automation/settings` — Email automation settings (master switch, AI enhancement, business hours, away message, cooldown).
- `GET/POST /api/email-automation/providers` — List/create email provider connections (Gmail, Outlook, IMAP, Resend).
- `GET/POST /api/email-automation/templates` — Email reply templates per language.
- `POST /api/email-automation/inbound/webhook` — Inbound email webhook endpoint; receives emails, detects language, runs auto-reply logic.

### 6.13 AI Suggestions and Intelligence

- `GET/POST /api/ai-suggestions` — List/dismiss/complete AI suggestions for the org.
- `GET /api/conversation-insights` — Conversation insight patterns (weekly aggregates).
- `GET /api/dashboard/intelligence` — Lead intelligence cache (priority counts, top services, avg score).

### 6.14 AI Memories

- `GET /api/memories` — List memories for a subject (conversation or lead).
- `DELETE /api/memories/[id]` — Archive (delete) a memory.

### 6.15 Documents

- `POST /api/documents/generate` — Generate a document (lead summary, quote draft, proposal) from context; plan-gated by AI action entitlement.

### 6.16 Business Setup Drafts

- `GET/POST /api/business-setup/drafts` — List/create business setup drafts.
- `GET/PATCH/DELETE /api/business-setup/drafts/[id]` — Get/update/delete a draft.
- `POST /api/business-setup/drafts/[id]/extract` — AI-extract/populate draft from context.
- `POST /api/business-setup/drafts/[id]/publish` — Publish draft to business settings.

### 6.17 Voice

- `GET/POST /api/voice/sessions` — Voice sessions for the dashboard.
- `GET /api/voice/sessions/[id]` — Single voice session.
- `GET/PATCH /api/voice/settings` — Voice settings per org.

### 6.18 Inbox

- `GET /api/inbox/conversations` — List inbox conversations.
- `GET/PATCH /api/inbox/conversations/[id]` — Get/update a conversation.
- `POST /api/inbox/conversations/[id]/reply` — Reply to a conversation.
- `POST /api/inbox/conversations/[id]/notes` — Add note to conversation.
- `POST /api/inbox/conversations/[id]/escalate` — Escalate conversation.
- `POST /api/inbox/conversations/[id]/assign` — Assign conversation to team member.
- `POST /api/inbox/conversations/[id]/draft` — Save draft reply.
- `POST /api/inbox/conversations/[id]/tags` — Tag conversation.
- `GET /api/inbox/contacts` — Inbox contacts.
- `GET /api/inbox/leads` — Inbox leads.

### 6.19 Bookings

- `GET/POST /api/bookings` — List/create bookings.
- `GET/PATCH/DELETE /api/bookings/[id]` — Get/update/delete a booking.
- `GET /api/bookings/availability` — Check availability.

### 6.20 Settings and app

- `GET/PATCH /api/settings/route` — Business settings.
- `POST /api/settings/learn-website` — "Learn from website" (scrape URL, update business description/FAQs).
- `POST /api/settings/generate-business-content` — AI-generate business content (description, FAQs, services) from context.
- `POST /api/settings/logo-upload` — Upload logo.
- `POST /api/settings/widget-position-preset` — Widget position preset.
- `POST /api/onboarding` — Onboarding (create org, default widget, business settings, trial).
- `GET/POST /api/ensure-org` — Ensure user has an org (create default if not).
- `POST /api/contact` — Public contact form submit.
- `GET /api/profile`, `POST /api/profile/avatar` — Profile and avatar.
- `GET/POST /api/organization/api-keys` — API keys for org (if plan allows).
- `GET /api/organization/can-create` — Check if user can create another org.
- `POST /api/organization/create` — Create a new organization.
- `POST /api/organization/delete` — Delete an organization.
- `GET /api/organization/list` — List user's organizations.
- `POST /api/organization/switch` — Switch active organization.
- `PATCH /api/organization/update` — Update org details.
- `POST /api/organization/cleanup-duplicates` — Clean up duplicate orgs.
- `GET/POST /api/account-links/[id]` — Account link management.
- `POST /api/account-links/[id]/accept` — Accept an account link.
- `POST /api/account-links/[id]/revoke` — Revoke an account link.
- `GET /api/search` — Cross-entity search.
- `GET /api/setup-progress` — Setup completion progress.
- `GET /api/simple/next-action` — Recommended next action for Simple Mode dashboard.
- `GET /api/analytics/overview` — Analytics overview for the org.
- `GET /api/help-chat` — In-dashboard help chat (includes plan/feature access context).
- `GET/POST /api/widgets/[id]` — Widget management.

---

## 7. Core data model (entities)

- **Auth & org:** `profiles`, `organizations`, `organization_members` (roles).
- **Product:** `business_settings` (including `assistant_display_mode`, `widget_action_mappings`), `widgets`, `agents`, `ai_pages`, `ai_page_runs`, `knowledge_bases`, `knowledge_sources`, `knowledge_documents`, `knowledge_index_runs`, `business_setup_drafts`, `website_auto_setup_runs`.
- **Chat:** `conversations` (per widget or per `ai_page`; `conversation_language`), `messages`.
- **Leads & CRM:** `leads` (status, stage, owner, tags; `qualification_score`, `qualification_priority`, `qualification_summary`, `qualified_at`, `recommended_deal_stage`, `estimated_deal_value`, `next_recommended_action`; `customer_language`), `contacts`, `companies`, `deals` (stages), `support_tickets`, `tasks`, `notes`, `activities`.
- **Quotes:** `quote_requests` (including `customer_email`, `customer_phone`, `customer_language` from AI page intake); **Quote pricing engine:** `quote_pricing_profiles`, `quote_services`, `quote_pricing_variables`, `quote_pricing_rules`, `quote_estimation_runs`.
- **Agents:** `agent_runs`, `agent_messages`, `agent_tool_invocations`.
- **Automations:** `automations` (trigger_type, webhook_token, webhook_secret), `automation_steps`, `automation_runs`, `automation_nodes`, `automation_edges`.
- **Webhooks:** `webhook_endpoints`, `webhook_events`, `webhook_field_mappings`.
- **Documents:** `document_templates`, `documents` (optional `conversation_id`, `quote_request_id`, `metadata` for AI-generated docs).
- **Billing:** `plans`, `plan_entitlements`, `subscriptions` (Stripe customer/subscription/price, plan_id, status, trial), `org_usage` (per-period message_count, ai_action_count).
- **AI Intelligence:** `ai_suggestions`, `conversation_insights`, `lead_intelligence_cache`, `industry_presets`.
- **AI Memory:** `ai_memories` (subject_type, subject_id, memory_type, content, confidence; org-scoped), `memory_records` (legacy).
- **AI Follow-up:** `ai_follow_up_runs`, `follow_up_templates` (with `subject_template_localized`, `body_template_localized`), `follow_up_drafts` (`recipient_language`, approval workflow), `follow_up_send_logs` (deduplication).
- **Email Automation:** `email_automation_settings`, `email_providers`, `email_reply_templates`, `inbound_emails`, `email_auto_replies`.
- **Voice:** `voice_sessions`, `voice_settings`.
- **Other:** `deployment_configs`, `extraction_schemas`, `extraction_runs`, `analytics_events`, `bookings`.

All tenant-scoped tables are protected by **Supabase RLS** so users only see their organization's data.

---

## 8. Billing and plan limits

- **Plans:** Free, Starter, Pro, Business, Enterprise (and legacy "Legacy Assistant Pro" for existing Stripe price).
- **Plan limits / feature access** (examples): `max_agents`, `max_automations`, `monthly_messages`, `monthly_ai_actions`, `max_knowledge_sources`, `max_document_uploads`, `max_team_members`, `widget_branding_removal`, `custom_branding`, `automations_enabled`, `tool_calling_enabled`, `webhook_access`, `api_access`, `analytics_level`, `priority_support`, `white_label`, `integrations_enabled`, `ai_pages_enabled`, `ai_lead_scoring_enabled`, `analytics_advanced_enabled`, `ai_suggestions_enabled`, `advanced_branding_enabled`, `conversation_learning_enabled`, `followup_emails_enabled`, `ai_followup_enabled`, `followup_drafts_enabled`, `monthly_followup_email_limit`, `delayed_followups_enabled`.
- **Usage:** `org_usage` stores per-org, per-period `message_count` and `ai_action_count`; incremented by widget chat and tool/document runs. Enforced in chat API and tool/agent/document APIs (return `message_limit_reached` or 403 with `plan_limit` when over limit).
- **Checkout:** Billing checkout accepts `planId` or Stripe price ID; creates Stripe session; webhook sets `subscriptions.plan_id` and status.
- **Admin bypass:** Optional `ADMIN_USER_IDS` env allows listed users to bypass plan limits and see billing debug.

---

## 9. Security and robustness

- **Tenancy:** RLS on all org-scoped tables; helpers like `get_user_organization_ids()`, `get_user_owner_admin_organization_ids()`.
- **Widget/chat:** Validate `widgetId` (UUID); ensure widget exists and org has active subscription or trial; rate limit by IP; cap messages per conversation in a time window; sanitize and length-limit input.
- **OpenAI:** Called only from server (e.g. `/api/widget/chat`, `/api/documents/generate`, follow-up generation, memory extraction, lead qualification, AI setup sessions, website auto-setup); no API key in client.
- **Webhooks:** Inbound webhook token is per-automation; optional secret for signature validation.
- **Stripe:** Webhook signature verification; no raw card data in app.
- **AI actions:** `widget_action_mappings` uses allowlisted action types; sanitization of URLs and section IDs before dispatch.
- **Email automation:** Auto-reply deduplication via `thread_dedupe_key`; spam/auto-generated detection; configurable `max_auto_replies_per_thread` and `cooldown_hours`.
- **Follow-up:** Deduplication via `follow_up_send_logs.dedupe_key` (unique index); approval workflow before send for AI-drafted follow-ups.

---

## 10. Tech stack (recap)

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui (including Switch for view-mode toggle), next-intl (i18n) |
| Backend / DB | Supabase: Postgres, Auth, RLS |
| AI | OpenAI Chat Completions (server-side only; e.g. gpt-4o-mini default); used for chat, memory, lead qualification, follow-up, document generation, website auto-setup, AI setup sessions, workflow generation |
| Billing | Stripe: Checkout, Customer Portal, webhooks |
| Email | Resend (lead notifications, auto-replies, follow-up emails, optional contact form) |
| Deploy | Vercel-ready; `NEXT_PUBLIC_APP_URL` for widget script and preview |

---

## 11. One-line summary

**Spaxio Assistant** is an AI website assistant platform that learns from your site, answers customer questions using your content, captures and qualifies leads with AI, collects quote requests with configurable forms and pricing rules, automates follow-up emails with approval workflows, extracts and uses memory across conversations, generates documents and proposals from lead context, and surfaces proactive AI suggestions and conversation insights—so you miss fewer inquiries, respond faster, and continuously improve.
