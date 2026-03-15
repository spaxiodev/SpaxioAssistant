# Spaxio Assistant — Detailed Website Summary

This document describes what the Spaxio Assistant website and product do, at a level of detail suitable for onboarding, documentation, or product overviews.

---

## 1. Product overview

**Spaxio Assistant** is a **multi-tenant SaaS platform** that gives businesses:

- **Embeddable AI chat widgets** — Add one script to a website to show a custom AI chatbot that can learn from the business’s content and settings.
- **Lead capture** — Collect visitor info (name, email, phone, message, etc.) and optionally trigger automations and email notifications (Resend).
- **Quote requests** — Let visitors submit quote/project details; businesses see them in the dashboard.
- **AI agents** — Create multiple agents (website chatbot, support agent, lead qualification, sales, booking, FAQ, etc.) with goals, tone, knowledge, and optional tool-calling.
- **Knowledge bases** — Upload documents or ingest URLs; content is indexed and used to ground agent responses.
- **Automations** — Event-driven workflows (e.g. on lead form submit, webhook received) with steps and optional form handling.
- **CRM-style data** — Leads, contacts, companies, deals, support tickets, tasks, notes, activities.
- **Webhooks** — Outbound (trigger automations) and inbound (webhook endpoints with field mappings).
- **Documents & templates** — Document templates (quote, proposal, invoice, etc.) and generated documents linked to leads/contacts/deals.
- **Billing** — Multi-tier plans (Free, Starter, Pro, Business, Enterprise) with Stripe subscriptions, trials, usage tracking, and plan-based entitlements.

The site is **i18n-ready** (e.g. English and French) and uses **Next.js App Router**, **Supabase** (Postgres, Auth, RLS), **OpenAI** (chat, server-side only), **Stripe**, and **Resend**.

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
| `/[locale]/demo/sign-in` | Demo sign-in flow. |
| `/[locale]/widget` | Widget UI (iframe/embed target). |
| `/[locale]/test-route` | Test route (dev). |

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

### 4.1 Workspace (main product)

| Section | Route | Purpose |
|--------|--------|--------|
| **Overview** | `/dashboard` | Summary cards: leads count, conversations, quote requests, agents; trial/subscription status; quick links to Install, Leads, Conversations, Quote requests, Billing. |
| **Agents** | `/dashboard/agents` | List of AI agents; create/edit agents (name, role type, goal, tone, knowledge, automations, CRM access, etc.). |
| **Agents (single)** | `/dashboard/agents/[id]` | Edit agent; agent runs history. |
| **New agent** | `/dashboard/agents/new` | Create new agent. |
| **Automations** | `/dashboard/automations` | List automations; create/edit; trigger types (e.g. lead_form_submitted, webhook_received), steps, enable/disable. |
| **Knowledge** | `/dashboard/knowledge` | Knowledge bases and sources; upload files, ingest URLs; used by agents. |

### 4.2 CRM

| Section | Route | Purpose |
|--------|--------|--------|
| **Leads** | `/dashboard/leads` | Leads from widget (and elsewhere); status, stage, owner, tags. |
| **Contacts** | `/dashboard/contacts` | Contact records; link to leads/companies. |
| **Companies** | `/dashboard/companies` | Companies (e.g. B2B). |
| **Deals** | `/dashboard/deals` | Deals with stage (qualification, proposal, negotiation, won, lost), value, contact/company. |
| **Tickets** | `/dashboard/tickets` | Support tickets (open, awaiting_user, in_progress, resolved, closed). |
| **Quote requests** | `/dashboard/quote-requests` | Quote requests submitted via widget. |

### 4.3 Activity and content

| Section | Route | Purpose |
|--------|--------|--------|
| **Conversations** | `/dashboard/conversations` | Chat conversations per widget; view messages, delete. |
| **Documents** | `/dashboard/documents` | Document templates and generated documents (linked to leads, contacts, deals, runs). |
| **Analytics** | `/dashboard/analytics` | Aggregated counts (leads, conversations, quote requests, automation runs, tickets); links to conversations, leads, quote requests, automations, tickets. |

### 4.4 Developers and deployment

| Section | Route | Purpose |
|--------|--------|--------|
| **Deployments** | `/dashboard/deployments` | Deployment configs per agent (website_widget, embedded_chat, standalone_page, dashboard_panel, api). |
| **Webhooks** | `/dashboard/webhooks` | List webhook endpoints; create/configure endpoints, secrets, field mappings. |
| **Webhook (single)** | `/dashboard/webhooks/[id]` | Configure one endpoint (mappings, etc.). |
| **Integrations** | `/dashboard/integrations` | Integrations hub (e.g. external services). |

### 4.5 Setup and account

| Section | Route | Purpose |
|--------|--------|--------|
| **Install** | `/dashboard/install` | Copy script tag for widget embed; widget ID; link to Knowledge and Agents. |
| **Settings** | `/dashboard/settings` | Business settings: name, industry, description, services, pricing notes, FAQ, tone, contact email, phone, lead notification email, brand color, welcome message, “learn from website,” logo, widget position. |
| **Assistant** | `/dashboard/assistant` | Assistant/chat config summary; link to Settings. |
| **Billing** | `/dashboard/billing` | Current plan, subscription status, Stripe Customer Portal link, usage (when available). |
| **Account** | `/dashboard/account` | Profile (name, avatar); link to Settings; “Add account” (invite/add user to org). |
| **Account add** | `/dashboard/account/add` | Add/invite member to organization. |

---

## 5. Widget and embed flow

- **Install:** In Dashboard → Install, the user copies a script tag, e.g.  
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

### 6.7 Settings and app

- `GET/PATCH /api/settings/route` — Business settings.
- `POST /api/settings/learn-website` — “Learn from website” (scrape URL, update business description/FAQs).
- `POST /api/settings/logo-upload` — Upload logo.
- `POST /api/settings/widget-position-preset` — Widget position preset.
- `POST /api/onboarding` — Onboarding (create org, default widget, business settings, trial).
- `GET/POST /api/ensure-org` — Ensure user has an org (create default if not).
- `POST /api/contact` — Public contact form submit.
- `GET /api/profile`, `POST /api/profile/avatar` — Profile and avatar.
- `GET/POST /api/organization/api-keys` — API keys for org (if plan allows).
- `GET /api/help-chat` — In-dashboard help chat (plan/entitlements context).

---

## 7. Core data model (entities)

- **Auth & org:** `profiles`, `organizations`, `organization_members` (roles).
- **Product:** `business_settings`, `widgets`, `agents`, `knowledge_bases`, `knowledge_sources`, `knowledge_documents`, `knowledge_index_runs`.
- **Chat:** `conversations` (per widget), `messages`.
- **Leads & CRM:** `leads` (status, stage, owner, tags), `contacts`, `companies`, `deals` (stages), `support_tickets`, `tasks`, `notes`, `activities`.
- **Quotes:** `quote_requests`.
- **Agents:** `agent_runs`, `agent_messages`, `agent_tool_invocations`.
- **Automations:** `automations` (trigger_type, webhook_token, webhook_secret), `automation_steps`, `automation_runs`, `automation_nodes`, `automation_edges`.
- **Webhooks:** `webhook_endpoints`, `webhook_events`, `webhook_field_mappings`.
- **Documents:** `document_templates`, `documents`.
- **Billing:** `plans`, `plan_entitlements`, `subscriptions` (Stripe customer/subscription/price, plan_id, status, trial), `org_usage` (per-period message_count, ai_action_count).
- **Other:** `memory_records`, `deployment_configs`, `extraction_schemas`, `extraction_runs`, `analytics_events`.

All tenant-scoped tables are protected by **Supabase RLS** so users only see their organization’s data.

---

## 8. Billing and entitlements

- **Plans:** Free, Starter, Pro, Business, Enterprise (and legacy “Legacy Assistant Pro” for existing Stripe price).
- **Entitlements** (examples): `max_agents`, `max_automations`, `monthly_messages`, `monthly_ai_actions`, `max_knowledge_sources`, `max_document_uploads`, `max_team_members`, `widget_branding_removal`, `custom_branding`, `automations_enabled`, `tool_calling_enabled`, `webhook_access`, `api_access`, `analytics_level`, `priority_support`, `white_label`, `integrations_enabled`.
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
| Frontend | Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui, next-intl (i18n) |
| Backend / DB | Supabase: Postgres, Auth, RLS |
| AI | OpenAI Chat Completions (server-side only; e.g. gpt-4o-mini default) |
| Billing | Stripe: Checkout, Customer Portal, webhooks |
| Email | Resend (lead notifications, optional contact form) |
| Deploy | Vercel-ready; `NEXT_PUBLIC_APP_URL` for widget script and preview |

---

## 11. One-line summary

**Spaxio Assistant** is an AI infrastructure SaaS that lets businesses deploy a customizable website AI widget, capture leads and quote requests, run multiple AI agents with knowledge bases and tool-calling, automate workflows (events and webhooks), manage CRM data (leads, contacts, companies, deals, tickets), and subscribe via multi-tier Stripe plans with usage-based and entitlement-based limits—all on a single multi-tenant Next.js + Supabase platform.
