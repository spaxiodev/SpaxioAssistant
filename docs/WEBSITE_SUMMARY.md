# Spaxio Assistant — Detailed Website Summary

This document describes what the Spaxio Assistant website and product do, at a level of detail suitable for onboarding, documentation, or product overviews.

**Keeping the AI in sync:** When you change the product (new features, routes, or capabilities), update (1) `src/lib/product-context.ts` (used by the AI Setup Assistant) and (2) the help-chat system prompt and `buildUserAccessBlock` in `src/app/api/help-chat/route.ts` so the in-app AI stays accurate.

---

## 1. Product overview

**Spaxio Assistant** is an **AI website assistant for businesses**. It learns the business, answers customer questions, captures leads, collects quote requests, and automates simple follow-up.

- **Install on your website** — Add one script to your website to show the assistant widget.
- **Answer customer questions** — The assistant responds using your business info and knowledge sources.
- **Capture leads** — Collect visitor contact info (name, email, phone, message, etc.) and notify your team.
- **Collect quote requests** — Capture project details in a structured form so you can respond faster.
- **Learn from your website** — Paste a website URL (and/or upload files) so the assistant answers from your real content.
- **Automate follow-up** — Simple rules like “notify me when a lead comes in” or “follow up after a quote request.”
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
| `/[locale]/` | Home: value prop, tagline, “Get started” / “Log in”, feature pills (widget branding, lead capture, quote requests, theme). |
| `/[locale]/pricing` | Pricing: plan cards (Free, Starter, Pro, Business, Enterprise), feature comparison, “Current plan” when logged in, CTA to dashboard or billing. |
| `/[locale]/contact` | Contact form: name, email, subject, message; submitted to support (e.g. Resend or internal). |
| `/[locale]/login` | Log in (email/password, Supabase Auth). |
| `/[locale]/signup` | Sign up; creates user, then onboarding can create org, business settings, widget, trial subscription. |
| `/[locale]/privacy-policy` | Privacy policy page. |
| `/[locale]/terms-and-conditions` | Terms and conditions page. |
| `/[locale]/widget-preview` | Preview of the chat widget (for testing). |
| `/[locale]/demo/ai-chat` | Demo AI chat page. |
| `/[locale]/widget` | Widget UI (iframe/embed target). |

**Locale:** Routes are under `[locale]` (e.g. `en`, `fr`). Navigation and copy come from `messages/en.json` and `messages/fr.json`.

---

## 3. Authentication and onboarding

- **Auth:** Supabase Auth (email/password). Session is used to resolve the current user and, via `organization_members`, the current **organization**.
- **Organization:** Multi-tenant; each org has members with roles: `owner`, `admin`, `manager`, `agent_operator`, `member`, `viewer`.
- **Onboarding:** After signup, `ensure-org` / onboarding flow can create default org, business settings, one widget, and a trial subscription. Optional “learn from website” step can scrape a URL to populate company description/FAQs.
- **Dashboard access:** Dashboard layout requires a logged-in user and an `organization_id`; otherwise redirect to login.

---

## 4. Dashboard (logged-in)

Dashboard is under `/[locale]/dashboard` with a sidebar and header. **Subscription/trial** and **onboarding** (e.g. business name) are gated where relevant; upgrade CTAs and onboarding prompts are shown when needed.

### 4.0 Dashboard view modes (Simple vs Developer)

The dashboard supports two **view modes** that change navigation, copy, and (in many cases) which UI renders for the same URL:

- **Simple Mode** — Streamlined, plain-language navigation and “get live fast” workflows. The URL stays under `/dashboard/...`, but the main content is rendered by a **Simple Mode router** that swaps in simplified page components.
- **Developer Mode** — More controls, but still focused on the core product areas (including plan-gated sections).

**How it works (implementation details):**

- **Mode toggle**: In the dashboard header (desktop), a “Simple / Developer” control with a Switch sets the mode.
- **Persistence**: Saved in `localStorage` under `spaxio-view-mode`.
- **Context**: `ViewModeProvider` supplies `mode` and `setMode`; `useViewMode()` is used by header, sidebar, and content.
- **Mode-aware main content**: `ModeAwareContent` renders the normal page in Developer Mode, and renders `SimpleModeRouter` in Simple Mode.
- **Per-page gating**: Some pages use `ViewModeClientGate` to render a simplified block in Simple Mode while preserving the full Developer Mode UI.
- **Plan gating**: Some nav items show a lock icon when the current plan does not include the feature (e.g. inbox, automations, webhooks, integrations, bookings, AI actions).

**Dashboard header options (available regardless of mode):**

- **View mode**: “Simple” button, Switch, “Developer” button.
- **Desktop quick links**: Locale switcher, theme toggle, Billing, Pricing, Settings, Help, Home, Sign out.
- **Mobile menu**: Equivalent links in a dropdown (“More options”), plus locale switcher and sign out.

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
| `/dashboard` | `SimpleDashboardOverview` | Quick actions + setup progress + recommendations. |
| `/dashboard/ai-setup` | `SimpleAiSetupPage` | Three paths: automatic from website URL, guided AI setup, manual describe. |
| `/dashboard/install` | `SimpleInstallPage` | Plain-language install flow; opens full Install page in Developer Mode for copy/paste code + preview. |
| `/dashboard/agents` (and `/dashboard/agents/*`) | `SimpleAgentsPage` | Create/list agents in a simplified layout; links to edit in Developer Mode. |
| `/dashboard/automations` | `SimpleAutomationsPage` | Recipe-style cards + list; toggles; links to full editor in Developer Mode (plan-gated). |
| `/dashboard/leads`, `/dashboard/contacts`, `/dashboard/quote-requests` | `SimpleLeadsPage` | Lead list + simple actions; links to full CRM pages. |
| `/dashboard/team` (and `/dashboard/account/add`) | `SimpleTeamPage` | Team list + invitations; some actions switch to Developer Mode (plan-gated for team size). |
| `/dashboard/settings` | `SimpleSettingsPage` | Simplified settings form + AI assist actions. |
| `/dashboard/knowledge` | `SimpleKnowledgePage` | Add URL / upload content + list sources; AI assist; links to full Knowledge (plan-gated by source limits). |
| `/dashboard/inbox` and `/dashboard/conversations` | `SimpleConversationsPage` | Simplified conversation list; links to full inbox/conversation pages (inbox may be plan-gated). |
| `/dashboard/billing` | `SimpleBillingPage` | Current plan + usage; “Upgrade” and “Manage subscription” switch to Developer Mode. |
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
| **Overview** | `/dashboard` | Summary cards: leads captured, conversations, quote requests; trial/subscription status; quick links to AI Setup, Install, Leads, Conversations, Billing. |
| **AI Assistants** | `/dashboard/agents` | Create and edit your website assistant (goal, tone, what to capture, knowledge, and follow-up). |
| **AI Assistants (single)** | `/dashboard/agents/[id]` | Edit an assistant and view run history. |
| **New assistant** | `/dashboard/agents/new` | Create a new assistant. |
| **Automations** | `/dashboard/automations` | List automations; create/edit; trigger types (e.g. lead_form_submitted, webhook_received), steps, enable/disable. |
| **Knowledge** | `/dashboard/knowledge` | Add website URLs and files so the assistant answers from your content. |
| **Install** | `/dashboard/install` | Copy script tag for widget embed and preview. |
| **Conversations** | `/dashboard/conversations` | Chat conversations per widget; view messages, delete. |
| **Leads** | `/dashboard/leads` | Leads from widget; view details and follow up. |
| **Quote requests** | `/dashboard/quote-requests` | Quote requests submitted via widget. |
| **Team** | `/dashboard/team` | Invite and manage team members. |
| **Billing** | `/dashboard/billing` | Current plan and Stripe portal. |
| **Settings** | `/dashboard/settings` | Business and widget settings. |

### 4.5 Setup and account

| Section | Route | Purpose |
|--------|--------|--------|
| **Install** | `/dashboard/install` | Copy the script tag for your website; preview the widget; choose which assistant powers it. |
| **Settings** | `/dashboard/settings` | Business settings: name, industry, description, services, pricing notes, FAQ, tone, contact email, phone, lead notification email, brand color, welcome message, “learn from website,” logo, widget position. |
| **Assistant** | `/dashboard/assistant` | Assistant/chat config summary; link to Settings. |
| **Billing** | `/dashboard/billing` | Current plan, subscription status, Stripe Customer Portal link, usage (when available). |
| **Account** | `/dashboard/account` | Profile (name, avatar); link to Settings; “Add account” (invite/add user to org). |
| **Account add** | `/dashboard/account/add` | Add/invite member to organization. |

---

## 5. Widget and embed flow

- **Install (widget):** In Dashboard → Install, the user copies a script tag, e.g.  
  `<script src="https://<APP_URL>/widget.js" data-widget-id="<WIDGET_UUID>"></script>`  
  and adds it before `</body>` on their site.
- **Widget script:** `widget.js` (or embed script) loads an iframe that points to the app’s widget page (e.g. `/[locale]/widget`), passing widget ID.
- **Widget UI:** The iframe shows the chat UI: welcome message, theme/branding from business settings, and optional lead/quote forms.
- **Chat:** Messages are sent to **POST `/api/widget/chat`** with `widgetId`, `conversationId` (optional), `message`, and optional `language`. The API:
  - Validates widget and resolves organization and subscription (trial or active); enforces message/AI limits by plan.
  - Resolves or creates a conversation; stores user message in `messages`.
  - Loads agent (if widget is linked to an agent) and business settings; builds system prompt from agent + business context (and optional knowledge).
  - Calls OpenAI; appends assistant reply to `messages`; returns reply to the widget.
  - Records usage (e.g. `message_count`, `ai_action_count`) for billing.
- **Lead capture:** Widget can submit lead form to **POST `/api/widget/lead`** (name, email, phone, message, conversationId, etc.). Creates a lead, optionally triggers `lead_form_submitted` automation event, and can send lead notification email (Resend).
- **Quote request:** Widget submits to **POST `/api/widget/quote`**; creates a `quote_requests` row linked to conversation.
- **Widget config:** **GET `/api/widget/config`** (or similar) returns branding, welcome message, and config for the widget by widget ID.

---

## 6. API routes (summary)

APIs are under `src/app/api/`. Key groups:

### 6.1 Widget (public, CORS)

- `POST /api/widget/chat` — Chat message; validate widget/subscription, persist message, call OpenAI, return reply, record usage.
- `POST /api/widget/lead` — Submit lead form; create lead, emit automation event, optional email.
- `POST /api/widget/quote` — Submit quote request.
- `GET /api/widget/config` — Widget config by widget ID (branding, welcome message, etc.).
- `GET /api/widget/by-agent` — Resolve widget by agent (for agent-based embed).

### 6.2 Billing (Stripe)

- `POST /api/billing/checkout` — Create Stripe Checkout session (plan/price); redirect to Stripe.
- `GET/POST /api/billing/portal` — Stripe Customer Portal (manage subscription).
- `POST /api/billing/webhook` — Stripe webhooks: `checkout.session.completed`, `customer.subscription.updated` / `deleted`; update `subscriptions`, set `plan_id`, etc.

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
- `POST /api/automations/form` — Form submission handler (e.g. for automation forms).
- `GET /api/automations/cta` — CTA/config for forms.
- **Cron:** `GET /api/cron/automations-schedule` — Scheduled automation runs (if configured).

### 6.6 Webhooks

- `GET/POST /api/webhooks/endpoints` — List/create webhook endpoints (org).
- `GET/PATCH/DELETE /api/webhooks/endpoints/[id]` — Get/update/delete endpoint.
- `GET/POST /api/webhooks/endpoints/[id]/mappings` — Field mappings for endpoint.
- `GET/PATCH/DELETE /api/webhooks/endpoints/[id]/mappings/[mappingId]` — Single mapping.
- `POST /api/webhooks/[token]` — **Inbound webhook:** token is automation’s `webhook_token`; triggers automation (and optionally automation events).
- `POST /api/webhooks/incoming/[id]` — Incoming webhook to a specific endpoint (by id); may write to `webhook_events` and apply field mappings.

### 6.7 AI Pages and pricing

- `GET/POST /api/dashboard/ai-pages` — List/create AI pages (org).
- `GET/PATCH/DELETE /api/dashboard/ai-pages/[id]` — Get/update/delete AI page.
- `POST /api/dashboard/ai-pages/[id]/publish` — Publish/unpublish AI page.
- `GET/POST /api/dashboard/pricing-profiles` — List/create quote pricing profiles.
- `GET/PATCH/DELETE /api/dashboard/pricing-profiles/[id]` — Get/update/delete profile.
- `GET /api/dashboard/pricing-profiles/[id]/preview` — Preview/test estimate for a profile.

These APIs exist, but AI Pages / advanced pricing are currently **not part of the core dashboard navigation** and may be hidden for most users.

### 6.8 Settings and app

- `GET/PATCH /api/settings/route` — Business settings.
- `POST /api/settings/learn-website` — “Learn from website” (scrape URL, update business description/FAQs).
- `POST /api/settings/logo-upload` — Upload logo.
- `POST /api/settings/widget-position-preset` — Widget position preset.
- `POST /api/onboarding` — Onboarding (create org, default widget, business settings, trial).
- `GET/POST /api/ensure-org` — Ensure user has an org (create default if not).
- `POST /api/contact` — Public contact form submit.
- `GET /api/profile`, `POST /api/profile/avatar` — Profile and avatar.
- `GET/POST /api/organization/api-keys` — API keys for org (if plan allows).
- `GET /api/help-chat` — In-dashboard help chat (includes plan/feature access context).

---

## 7. Core data model (entities)

- **Auth & org:** `profiles`, `organizations`, `organization_members` (roles).
- **Product:** `business_settings`, `widgets`, `agents`, `ai_pages`, `ai_page_runs`, `knowledge_bases`, `knowledge_sources`, `knowledge_documents`, `knowledge_index_runs`, `business_setup_drafts`.
- **Chat:** `conversations` (per widget or per `ai_page`), `messages`.
- **Leads & CRM:** `leads` (status, stage, owner, tags), `contacts`, `companies`, `deals` (stages), `support_tickets`, `tasks`, `notes`, `activities`.
- **Quotes:** `quote_requests` (including `customer_email`, `customer_phone` from AI page intake); **Quote pricing engine:** `quote_pricing_profiles`, `quote_services`, `quote_pricing_variables`, `quote_pricing_rules`, `quote_estimation_runs`.
- **Agents:** `agent_runs`, `agent_messages`, `agent_tool_invocations`.
- **Automations:** `automations` (trigger_type, webhook_token, webhook_secret), `automation_steps`, `automation_runs`, `automation_nodes`, `automation_edges`.
- **Webhooks:** `webhook_endpoints`, `webhook_events`, `webhook_field_mappings`.
- **Documents:** `document_templates`, `documents` (optional `conversation_id` for visibility from conversation detail).
- **Billing:** `plans`, `plan_entitlements`, `subscriptions` (Stripe customer/subscription/price, plan_id, status, trial), `org_usage` (per-period message_count, ai_action_count).
- **Other:** `memory_records`, `deployment_configs`, `extraction_schemas`, `extraction_runs`, `analytics_events`.

All tenant-scoped tables are protected by **Supabase RLS** so users only see their organization’s data.

---

## 8. Billing and plan limits

- **Plans:** Free, Starter, Pro, Business, Enterprise (and legacy “Legacy Assistant Pro” for existing Stripe price).
- **Plan limits / feature access** (examples): `max_agents`, `max_automations`, `monthly_messages`, `monthly_ai_actions`, `max_knowledge_sources`, `max_document_uploads`, `max_team_members`, `widget_branding_removal`, `custom_branding`, `automations_enabled`, `tool_calling_enabled`, `webhook_access`, `api_access`, `analytics_level`, `priority_support`, `white_label`, `integrations_enabled`, `ai_pages_enabled`.
- **Usage:** `org_usage` stores per-org, per-period `message_count` and `ai_action_count`; incremented by widget chat and tool runs. Enforced in chat API and tool/agent APIs (return `message_limit_reached` or 403 with `plan_limit` when over limit).
- **Checkout:** Billing checkout accepts `planId` or Stripe price ID; creates Stripe session; webhook sets `subscriptions.plan_id` and status.
- **Admin bypass:** Optional `ADMIN_USER_IDS` env allows listed users to bypass plan limits and see billing debug.

---

## 9. Security and robustness

- **Tenancy:** RLS on all org-scoped tables; helpers like `get_user_organization_ids()`, `get_user_owner_admin_organization_ids()`.
- **Widget/chat:** Validate `widgetId` (UUID); ensure widget exists and org has active subscription or trial; rate limit by IP; cap messages per conversation in a time window; sanitize and length-limit input.
- **OpenAI:** Called only from server (e.g. `/api/widget/chat`); no API key in client.
- **Webhooks:** Inbound webhook token is per-automation; optional secret for signature validation.
- **Stripe:** Webhook signature verification; no raw card data in app.

---

## 10. Tech stack (recap)

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui (including Switch for view-mode toggle), next-intl (i18n) |
| Backend / DB | Supabase: Postgres, Auth, RLS |
| AI | OpenAI Chat Completions (server-side only; e.g. gpt-4o-mini default) |
| Billing | Stripe: Checkout, Customer Portal, webhooks |
| Email | Resend (lead notifications, optional contact form) |
| Deploy | Vercel-ready; `NEXT_PUBLIC_APP_URL` for widget script and preview |

---

## 11. One-line summary

**Spaxio Assistant** is an AI website assistant platform that learns from your site, answers customer questions using your content, captures and qualifies leads with AI, collects quote requests with configurable forms and pricing rules for estimates, and automates follow-up—so you miss fewer inquiries and respond faster.
