# Spaxio Assistant — Detailed Website Summary

This document describes what the Spaxio Assistant website and product do, at a level of detail suitable for onboarding, documentation, or product overviews.

**Keeping the AI in sync:** When you change the product (new features, routes, or capabilities), update (1) `src/lib/product-context.ts` (used by the AI Setup Assistant) and (2) the help-chat system prompt and `buildUserAccessBlock` in `src/app/api/help-chat/route.ts` so the in-app AI stays accurate. Optionally align `src/lib/search/search-index.ts` (command palette) with new dashboard routes.

---

## 1. Product overview

**Spaxio Assistant** is an **AI website assistant and lead-qualification platform** for businesses. It learns the business from a URL and/or files, answers visitor questions, captures and qualifies leads with AI, collects quote requests with configurable pricing and estimates, automates follow-up and email replies, and gives teams an operational dashboard so they respond faster and miss fewer opportunities.

The site is **i18n-ready** (English and French `fr-CA`; see `src/i18n/routing.ts`) and uses Next.js (App Router), TypeScript, Tailwind CSS, Supabase (Postgres/Auth/RLS), OpenAI (server-side), Stripe, and Resend.

### 1.1 Visitor-facing experience (widget & pages)

- **Chat widget** — One script embeds a floating assistant on the customer’s site (`widget.js` + `data-widget-id`).
- **Full-page assistant** — Shareable URL or full-page mode (assistant display mode: widget, full-page, or both).
- **AI Pages** — Standalone branded chat/quote surfaces with their own public URLs (plan-gated: `ai_pages`); builder under **Dashboard → AI Pages**; public routes such as `/[locale]/a/[slug]` and `/[locale]/a/p/[id]`.
- **Lead capture** — Forms from the widget; optional **embedded forms** hosted or embedded separately (plan-gated: `embedded_forms`); submissions can tie into automations and quote flows.
- **Quote requests & estimates** — Structured quote flow; **pricing profiles**, **variables**, and **rules** for instant estimates (`/api/widget/estimate`, quote engine).
- **Voice** — Spoken conversations on the widget (plan-gated: `voice`); dashboard **Voice** session history and **Voice settings**.
- **Website actions** — Assistant can return actions (`open_quote_form`, `scroll_to_section`, `open_link`, etc.); embed script dispatches host-page behavior via mappings and `postMessage`.

### 1.2 Assistant, knowledge, and setup

- **AI Assistants (Agents)** — Per–assistant goals, tone, tool enablement, knowledge linkage, and behavior; test runs and run history.
- **Knowledge** — Website URLs and file uploads; ingestion and indexing for grounded answers.
- **Settings** — Business profile (name, industry, description, services, FAQ, tone, contacts), widget branding (color, welcome, position), lead notification email, **learn from website**, logo, **widget action mappings**, assistant display mode.
- **AI Setup (sessions)** — Guided conversational setup: sessions, chat, safe drafts, publish.
- **Quick / website scan** — `quick-setup-from-website`, `website-scan` APIs for fast extraction.
- **Website Auto-Setup** — Full automated run: scan URL and configure settings, knowledge, agents, automations, widget (`/api/website-auto-setup/*`).
- **Business setup drafts** — Staged drafts with AI extract and publish (`/api/business-setup/drafts/*`).
- **Industry templates** — `GET /api/ai-setup/templates`; `industry_presets` for vertical-specific starters.

### 1.3 Leads, quotes, and CRM touchpoints

- **Leads** — List/detail with AI qualification (score, priority, summary, recommended actions), follow-up card (email drafts, tasks), memory card, document generation.
- **Contacts** — Contact list/detail (CRM-oriented views).
- **Quote requests** — Pipeline with AI follow-up and document generation; **submission sources** include widget, page assistant, embedded form (`quote_requests.submission_source`).
- **Inbox** — Team inbox for conversations: reply, notes, escalate, assign, tags, drafts (plan-gated: `inbox`).
- **Bookings** — Scheduling / bookings module (plan-gated: `bookings`); API under `/api/bookings/*`.

### 1.4 Intelligence and suggestions

- **AI Lead Qualification** — Scoring, priority, summaries; high-intent routing (e.g. deal creation where configured).
- **AI Suggestions** — Org-scoped proactive recommendations (plan-gated: `ai_suggestions`).
- **Conversation insights** — Aggregated patterns (plan-gated: `conversation_learning` where applicable); advanced analytics tier (`analytics_advanced`).
- **Lead intelligence cache** — Dashboard aggregates (`/api/dashboard/intelligence`).
- **AI Memory** — Extracted preferences/context across a conversation; surfaces on lead/conversation.

### 1.5 Automations, email, and integrations

- **Automations** — Triggers (lead, quote, support, webhook, schedule, form events, etc.), multi-step flows, runs, analytics, **AI workflow generator** (plain language → draft automation). Plan-gated: `automations`.
- **Email automation** — Inbound email handling, auto-reply with AI enhancement, providers (webhook/universal, Resend inbound, Gmail OAuth, Outlook OAuth, IMAP), templates per language, business hours, deduplication. Plan-gated: `email_automation`.
- **Webhooks** — Inbound webhook endpoints and field mappings; automation triggers; public webhook URLs. Plan-gated: `webhooks`.
- **API / API keys** — Organization API keys where plan allows (`api_access` on higher tiers).
- **Tool calling** — Agents can use enabled tools (`tool_calling`); dashboard configures enabled tools per agent where available.

### 1.6 Documents, follow-up, and voice (dashboard)

- **AI Document Generation** — Lead summaries, quote drafts, proposals (`/api/documents/generate`; tied to `ai_actions` / usage limits).
- **AI Follow-Up Engine** — Drafts, templates, approval, send logs, deduplication (`followup_emails`, `ai_followup`, `followup_drafts` by plan).
- **Voice (dashboard)** — Voice session APIs (`/api/voice/*`) alongside widget voice.

### 1.7 Team, organizations, and billing

- **Organizations** — Multi-tenant; members with roles (`owner`, `admin`, `manager`, `agent_operator`, `member`, `viewer`); switch org, create/delete org (APIs).
- **Team invites** — Invitations and acceptance flow (`/invite/accept`).
- **Billing** — Stripe Checkout, Customer Portal, webhooks; plans Free, Starter, Pro, Business, Enterprise (and legacy Assistant Pro mapping).
- **Usage** — Message and AI action counts per period; entitlements enforced on chat and AI features.

### 1.8 Productivity UX

- **Dashboard view modes** — **Simple** vs **Developer** (toggle + `localStorage`); Simple Mode swaps many routes through `SimpleModeRouter` with simplified screens.
- **Command palette** — Cmd/Ctrl+K search over pages and entities (`/api/search`, `src/lib/search/search-index.ts`).
- **Help** — In-app help center `/[locale]/help` and **Help chat** API with plan context (`/api/help-chat`).
- **Analytics** — Org analytics overview (`/dashboard/analytics`, `/api/analytics/overview`).
- **Deployments** — Deployment configs linking agents to widget, embed, standalone page, API-style deployments (`/dashboard/deployments`).
- **Business Setup** — Dedicated wizard-style page (`/dashboard/business-setup`) aligned with onboarding drafts.
- **Communications → AI Flows** — Placeholder / roadmap UI for future conversation flows (`/dashboard/communications/ai-flows`).
- **Assistant summary page** — `/dashboard/assistant` quick summary and links to settings.

### 1.9 Navigation model (what is “primary” vs deep-linked)

- **Primary sidebar (Developer Mode)** — Overview, AI Setup, Agents, Knowledge, Install, Conversations, Leads, **Quote requests** (submenu: **Requests**, **Form setup**, **Pricing rules**), **Embedded forms**, **Email automation**, Automations, Team, Billing, Settings. Items may show a lock icon when the current plan lacks the feature (see `src/lib/plan-config.ts`).
- **Not in the main sidebar but shipped** — Examples: Inbox, Analytics, AI Pages, Voice, Webhooks, Bookings, Contacts, Dashboard **Pricing** (`/dashboard/pricing` — pricing profile management distinct from quote-request pricing paths), Business setup, Deployments, Communications/AI flows, Account/add-member. These are reachable via URL, in-dashboard links, or the command palette where indexed.

---

## 2. Public-facing website (no login)

| Route | Purpose |
|-------|--------|
| `/[locale]/` | Home: value prop, CTAs, feature highlights. |
| `/[locale]/pricing` | Pricing and plan comparison. |
| `/[locale]/contact` | Contact form. |
| `/[locale]/login` | Log in (Supabase Auth). |
| `/[locale]/signup` | Sign up and onboarding entry. |
| `/[locale]/privacy-policy` | Privacy policy. |
| `/[locale]/terms-and-conditions` | Terms. |
| `/[locale]/widget-preview` | Widget preview. |
| `/[locale]/demo/ai-chat` | Demo chat. |
| `/[locale]/widget` | Widget iframe UI. |
| `/[locale]/help` | Help / documentation search. |
| `/[locale]/invite/accept` | Accept team invitation. |
| `/[locale]/ai-website-assistant` | SEO landing. |
| `/[locale]/ai-customer-support-ai` | SEO landing. |
| `/[locale]/ai-chatbot-widget` | SEO landing. |
| `/[locale]/ai-chatbot-for-website` | SEO landing. |
| `/[locale]/ai/[useCase]` | Dynamic SEO / use-case pages. |
| `/[locale]/a/[slug]` | Public AI page (slug). |
| `/[locale]/a/p/[id]` | Public AI page (by id). |

**Locale:** `en` and `fr-CA` (see `src/i18n/routing.ts`). Copy lives under `messages/*.json`.

---

## 3. Authentication and onboarding

- **Auth:** Supabase Auth (email/password). Session resolves user and, via `organization_members`, **organization**.
- **Organization:** Multi-tenant; roles as above; org switch and lifecycle APIs.
- **Onboarding:** `ensure-org`, onboarding API, optional learn-from-website, trial subscription, `setup-progress`.
- **Dashboard access:** Requires login and `organization_id`.
- **AI Setup Assistant:** Session-based guided setup (`/dashboard/ai-setup`).

---

## 4. Dashboard (logged-in)

Base path: `/[locale]/dashboard`. **Subscription/trial** and **plan entitlements** gate features across the UI and APIs.

### 4.0 Dashboard view modes (Simple vs Developer)

- **Simple Mode** — Reduced sidebar (Overview, AI Setup, Conversations, Leads, Install, Email automation, Help, Settings) and `SimpleModeRouter` for simplified pages on many routes; **Switch to Developer Mode** for full UI.
- **Developer Mode** — Full sidebar (see §1.9) and per-page “full” clients.

Implementation: `ViewModeProvider`, `ModeAwareContent`, `SimpleModeRouter`, `localStorage` key `spaxio-view-mode`.

### 4.1 Workspace routes (reference)

| Section | Route | Notes |
|--------|--------|--------|
| Overview | `/dashboard` | Metrics, CTAs, setup status. |
| AI Setup | `/dashboard/ai-setup` | Sessions, quick setup, templates. |
| Agents | `/dashboard/agents`, `/dashboard/agents/new`, `/dashboard/agents/[id]` | List, create, edit, runs. |
| Knowledge | `/dashboard/knowledge` | Sources and uploads. |
| Install | `/dashboard/install` | Script tag, preview, display mode, assistant selection. |
| Conversations | `/dashboard/conversations` | Conversation list per widget. |
| Inbox | `/dashboard/inbox`, `/dashboard/inbox/[id]` | Team inbox (plan-gated). |
| Leads | `/dashboard/leads` | Lead pipeline and detail. |
| Contacts | `/dashboard/contacts` | Contacts. |
| Quote requests | `/dashboard/quote-requests` | List. |
| Quote form setup | `/dashboard/quote-requests/form-setup` | Form builder/config. |
| Quote pricing rules | `/dashboard/quote-requests/pricing`, `/dashboard/quote-requests/pricing/[id]` | Variables, rules, profiles for estimates. |
| Embedded forms | `/dashboard/embedded-forms`, `/dashboard/embedded-forms/[id]` | Embedded forms (plan-gated). |
| Email automation | `/dashboard/email-automation` | Providers, templates, settings (plan-gated). |
| Automations | `/dashboard/automations` | Flows, AI generator (plan-gated). |
| Team | `/dashboard/team` | Members and invites (plan-gated by seats). |
| Billing | `/dashboard/billing` | Plan, portal, usage. |
| Settings | `/dashboard/settings` | Business + widget. |
| Analytics | `/dashboard/analytics` | Org analytics. |
| AI Pages | `/dashboard/ai-pages`, `/dashboard/ai-pages/new`, `/dashboard/ai-pages/[id]` | Build/publish AI pages (plan-gated). |
| Voice | `/dashboard/voice`, `/dashboard/voice/settings` | Sessions and settings (plan-gated). |
| Webhooks | `/dashboard/webhooks`, `/dashboard/webhooks/[id]` | Endpoints and mappings (plan-gated). |
| Bookings | `/dashboard/bookings` | Bookings (plan-gated). |
| Deployments | `/dashboard/deployments` | Agent deployment surfaces. |
| Business setup | `/dashboard/business-setup` | Wizard aligned with drafts. |
| Pricing (dashboard) | `/dashboard/pricing`, `/dashboard/pricing/[id]` | Pricing profile management (app routes; distinct from quote-requests pricing UI). |
| Communications | `/dashboard/communications/ai-flows` | Placeholder / future AI flows. |
| Assistant | `/dashboard/assistant` | Short summary → settings. |
| Account | `/dashboard/account`, `/dashboard/account/add` | Profile and invites. |

---

## 5. Widget and embed flow

- **Install:** Script tag from Install page; iframe loads `/[locale]/widget` with widget id.
- **Chat:** `POST /api/widget/chat` — validates widget and subscription, loads agent + business + knowledge + memories, calls OpenAI, optional `ACTION:` line → website action, memory extraction, usage metering.
- **Lead:** `POST /api/widget/lead` — qualification, automations, notifications, follow-up.
- **Quote:** `POST /api/widget/quote` — `quote_requests` + follow-up.
- **Estimate:** `POST /api/widget/estimate` — pricing engine.
- **Config:** `GET /api/widget/config`.
- **Voice:** `POST /api/widget/voice/start|turn|end`.
- **Website actions:** Embed `widget.js` handles `spaxio-action` / `dispatchWebsiteAction` (scroll, link, mapped selectors, custom events).

---

## 6. API routes (summary)

APIs live under `src/app/api/`. Major groups:

| Area | Examples |
|------|-----------|
| Widget | `/api/widget/chat`, `lead`, `quote`, `estimate`, `config`, `voice/*` |
| Billing | `/api/billing/checkout`, `portal`, `webhook`, `status` |
| Agents | `/api/agents`, `/api/agents/[id]`, `/api/tools/list`, `/api/tools/run` |
| Knowledge | `/api/knowledge/sources`, `upload`, `ingest-url` |
| Automations | `/api/automations`, `automations/[id]/*`, `generate`, `form`, `events`, cron |
| Webhooks | `/api/webhooks/endpoints`, `incoming`, `[token]` |
| AI Pages | `/api/dashboard/ai-pages/*`, public `/api/ai-page/*` |
| Pricing | `/api/dashboard/pricing-profiles`, `pricing-rules`, `pricing-variables`, `quote-form-config` |
| AI Setup | `/api/ai-setup/sessions/*`, `quick-setup-from-website`, `website-scan`, `templates`, `logo-upload` |
| Website auto-setup | `/api/website-auto-setup/start`, `status`, `latest` |
| Follow-up | `/api/follow-up`, `follow-up/drafts`, `follow-up/templates`, `follow-up/apply` |
| Email automation | `/api/email-automation/settings`, `providers`, `templates`, `inbound/webhook` |
| Intelligence | `/api/ai-suggestions`, `/api/conversation-insights`, `/api/dashboard/intelligence` |
| Memories | `/api/memories` |
| Documents | `/api/documents/generate` |
| Business drafts | `/api/business-setup/drafts/*` |
| Voice | `/api/voice/sessions`, `settings` |
| Inbox | `/api/inbox/conversations/*` |
| Bookings | `/api/bookings/*` |
| Org / account | `/api/organization/*`, `/api/account-links/*`, `/api/profile` |
| Search / help | `/api/search`, `/api/help-chat`, `/api/setup-progress`, `/api/simple/next-action` |
| Widgets | `/api/widgets/[id]` |
| Contact | `/api/contact` |

---

## 7. Core data model (entities)

- **Auth & org:** `profiles`, `organizations`, `organization_members`.
- **Product:** `business_settings`, `widgets`, `agents`, `knowledge_*`, `ai_pages`, `deployment_configs`, `embedded_forms`, `form_submissions`, `business_setup_drafts`, `website_auto_setup_runs`.
- **Chat:** `conversations`, `messages`.
- **Leads & CRM:** `leads`, `contacts`, `companies`, `deals`, `quote_requests`, pricing tables (`quote_pricing_profiles`, `quote_pricing_rules`, `quote_pricing_variables`, …).
- **Automations:** `automations`, `automation_steps`, `automation_runs`, nodes/edges where used.
- **Webhooks:** `webhook_endpoints`, `webhook_events`, `webhook_field_mappings`.
- **Documents:** `document_templates`, `documents`.
- **Billing:** `plans`, `plan_entitlements`, `subscriptions`, `org_usage`.
- **AI:** `ai_suggestions`, `conversation_insights`, `lead_intelligence_cache`, `ai_memories`, `industry_presets`.
- **Follow-up & email:** `ai_follow_up_runs`, `follow_up_templates`, `follow_up_drafts`, `follow_up_send_logs`, email automation tables.
- **Voice:** `voice_sessions`, `voice_settings`.
- **Other:** `bookings`, `analytics_events`, etc.

All tenant data protected by **Supabase RLS**.

---

## 8. Billing and plan limits

- **Plans:** Free, Starter, Pro, Business, Enterprise (+ legacy mappings).
- **Feature keys** (non-exhaustive; see `FEATURE_KEYS` / `FEATURE_MIN_PLAN` in `src/lib/plan-config.ts`): `automations`, `webhooks`, `tool_calling`, `api_access`, `remove_branding`, `ai_actions`, `inbox`, `bookings`, `voice`, `integrations`, `team_members`, `ai_pages`, `followup_emails`, `ai_followup`, `followup_drafts`, `email_automation`, `ai_lead_scoring`, `analytics_advanced`, `ai_suggestions`, `advanced_branding`, `conversation_learning`, `embedded_forms`.
- **Usage:** `org_usage` message/action counts; enforced in APIs.
- **Admin bypass:** Optional `ADMIN_USER_IDS` for support/testing.

---

## 9. Security and robustness

- **Tenancy:** RLS on org-scoped tables.
- **Widget:** Validate `widgetId`; subscription/trial; rate limits; input caps.
- **OpenAI:** Server-only routes; no client API key.
- **Webhooks:** Per-automation tokens/secrets.
- **Stripe:** Webhook signature verification.
- **Email / follow-up:** Deduplication, cooldowns, spam heuristics where implemented.

---

## 10. Tech stack (recap)

| Layer | Technology |
|-------|------------|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, next-intl |
| Backend / DB | Supabase: Postgres, Auth, RLS |
| AI | OpenAI (server-side; e.g. `gpt-4o-mini` default) |
| Billing | Stripe |
| Email | Resend (+ provider-specific email automation) |
| Deploy | Vercel-ready; `NEXT_PUBLIC_APP_URL` for widget and OG URLs |

---

## 11. One-line summary

**Spaxio Assistant** is an AI website assistant platform: embed a widget or full-page assistant with one script, learn from your site and files, answer questions, capture and qualify leads, run quote requests with configurable pricing and estimates, automate workflows and email replies, optionally use voice and AI Pages, and operate from a full dashboard with inbox, analytics, team billing, and plan-based entitlements—so businesses miss fewer inquiries and respond faster.
