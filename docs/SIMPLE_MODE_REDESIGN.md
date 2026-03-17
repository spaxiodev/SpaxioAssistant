# Simple Mode Redesign – Deliverables

This document summarizes the Simple Mode redesign implemented for Spaxio Assistant: purpose-built pages with manual actions, AI assistance, and plain-language UX.

---

## 1. Summary of files created / changed

### New files

- **`src/components/dashboard/simple/simple-page-header.tsx`** – Reusable page title + one-line description (+ optional icon).
- **`src/components/dashboard/simple/simple-action-card.tsx`** – Card with title, description, optional icon, and slot for content (default or primary variant).
- **`src/components/dashboard/simple/simple-ai-assist-panel.tsx`** – Panel with AI title/description and a list of action buttons (e.g. “Summarize”, “Recommend”).
- **`src/components/dashboard/simple/simple-status-card.tsx`** – Compact stat card (title, value, optional subtitle/icon/variant).
- **`src/components/dashboard/simple/simple-empty-state.tsx`** – Empty state with icon, title, description, optional CTA and “Open in Developer Mode”.
- **`src/components/dashboard/simple/simple-recommendations.tsx`** – “Recommended next steps” list with optional title.
- **`src/components/dashboard/simple/simple-quick-action-card.tsx`** – Clickable card for quick actions (icon, title, description).
- **`src/components/dashboard/simple/simple-developer-mode-link.tsx`** – Card with “Need more control?” and buttons to open a path in Developer Mode or switch mode.
- **`src/components/dashboard/simple/index.ts`** – Barrel export for all simple components.
- **`src/app/api/leads/route.ts`** – `GET /api/leads` for org-scoped lead list (id, name, email, created_at, qualification_priority, qualification_summary, requested_service).
- **`src/app/api/billing/status/route.ts`** – `GET /api/billing/status` for plan name, status, usage, and upgrade info for Simple Billing.
- **`src/components/dashboard/simple-pages/simple-knowledge-page.tsx`** – New dedicated Knowledge page (replaces generic placeholder).
- **`src/components/dashboard/simple-pages/simple-conversations-page.tsx`** – New Conversations/Inbox page.
- **`src/components/dashboard/simple-pages/simple-analytics-page.tsx`** – New Analytics page.
- **`src/components/dashboard/simple-pages/simple-billing-page.tsx`** – New Billing page.
- **`docs/SIMPLE_MODE_REDESIGN.md`** – This deliverable summary.

### Modified files

- **`src/app/api/settings/route.ts`** – Added `GET /api/settings` to return business settings for Simple Mode (business_name, company_description, contact_email, etc.).
- **`src/components/dashboard/simple-mode-router.tsx`** – Routes for Knowledge, Conversations, Analytics, and Billing now render the new Simple pages instead of `SimpleGenericPage`.
- **`src/components/dashboard/simple-dashboard-overview.tsx`** – Redesigned with welcome header, setup progress, widget status, recent leads/conversations snapshot, quick actions (Add business info, Preview widget, Review leads, Add website content, Create automation, Set up from URL), “Do it for me” as one option among others, and recommendations.
- **`src/components/dashboard/simple-pages/simple-ai-setup-page.tsx`** – Three paths: automatic (website URL card), guided setup (AI), and manual/describe (AISetupClient); uses Simple components.
- **`src/components/dashboard/simple-pages/simple-agents-page.tsx`** – Lists agents from API, toggle on/off, create sales/support/quote assistants, AI assist panel, Developer Mode link.
- **`src/components/dashboard/simple-pages/simple-automations-page.tsx`** – Recipe-style cards (notify on new lead, save quote requests, support ticket, follow-up reminder), list automations with toggle, AI assist, Developer Mode link.
- **`src/components/dashboard/simple-pages/simple-leads-page.tsx`** – Lead list from `GET /api/leads`, manual action cards (mark status, add note, assign, open conversation), AI assist, Developer Mode link.
- **`src/components/dashboard/simple-pages/simple-team-page.tsx`** – Members and invitations from API, actions (invite, change permissions, remove), AI recommend permission, Developer Mode link.
- **`src/components/dashboard/simple-pages/simple-install-page.tsx`** – Plain-language options (add widget, quote page, support page, preview), AI assist, Developer Mode link; primary actions switch to Developer Mode where needed.
- **`src/components/dashboard/simple-pages/simple-launch-page.tsx`** – Uses `SimplePageHeader` and `SimpleDeveloperModeLink`; “Set up Chat Widget” and deployments open in Developer Mode.
- **`src/components/dashboard/simple-pages/simple-settings-page.tsx`** – Loads settings via `GET /api/settings`, simplified form (business name, description, contact, welcome message, brand color), AI assist (write welcome, improve description), Developer Mode link; fallback card when GET fails.
- **`src/components/dashboard/simple-pages/simple-billing-page.tsx`** – Uses `GET /api/billing/status` for plan, usage, and limits; “Upgrade” / “Manage subscription” switch to Developer Mode and go to billing page.

---

## 2. Reusable Simple Mode components

| Component | Purpose |
|-----------|--------|
| **SimplePageHeader** | Title, one-line description, optional icon. |
| **SimpleActionCard** | Card with title, description, icon, children; optional `variant="primary"`. |
| **SimpleAiAssistPanel** | AI panel with title, description, and list of `{ label, onClick }` actions. |
| **SimpleStatusCard** | Stat card: title, value, optional subtitle, icon, variant (default/success/muted). |
| **SimpleEmptyState** | Empty state: icon, title, description, optional action button, “Open in Developer Mode”. |
| **SimpleRecommendations** | “Recommended next steps” list with optional title. |
| **SimpleQuickActionCard** | Clickable card: icon, title, description, onClick. |
| **SimpleDeveloperModeLink** | Card with “Need more control?” and buttons to open a path in Developer Mode or switch mode. |

All live under **`src/components/dashboard/simple/`** and are exported from **`index.ts`**.

---

## 3. Pages upgraded from placeholder to real simplified UI

| Route | Before | After |
|-------|--------|--------|
| **Dashboard (overview)** | AI-heavy; single “Do It For Me” focus | Welcome, setup progress, widget status, leads/conversations snapshot, 6 quick actions, “Do it for me” as one option, recommendations. |
| **AI Setup** | One big “Do It For Me” + website card + AISetupClient | Three paths: automatic (website URL), guided setup, describe what you want (AISetupClient); Developer Mode link. |
| **Knowledge** | `SimpleGenericPage` | Add URL (with ingest), upload/file/paste/FAQs actions, list of sources, AI assist (FAQs, organize, summarize, improve), Developer Mode link. |
| **Agents** | Single “Ask AI to build” + link to Developer Mode | Create sales/support/quote assistants, list agents with on/off toggle and Edit, AI assist, Developer Mode link. |
| **Automations** | Single “Ask AI to create” + link to Developer Mode | Recipe cards (notify lead, save quote, support ticket, follow-up), list automations with on/off and Edit, AI assist, Developer Mode link. |
| **Leads** | Single “Ask AI to set up” + link to Developer Mode | Lead list (from API), manual actions (mark status, add note, assign, open conversation), AI assist, Developer Mode link. |
| **Team** | Single “Ask AI to configure” + link to Developer Mode | Members and invitations list, invite / change permissions / remove (links to Developer Mode), AI recommend permission, Developer Mode link. |
| **Install** | “Let AI do it” + link to install in Developer Mode | Add widget, quote page, support page, preview; copy install code and other actions open in Developer Mode; AI assist; Developer Mode link. |
| **Deployments (Launch)** | Two cards (Set up widget, Preview; Open deployments) | Same intent with SimplePageHeader and SimpleDeveloperModeLink; actions switch to Developer Mode. |
| **Settings** | Single “Ask AI to configure” + link to Developer Mode | Load settings via GET; simplified form (name, description, contact, welcome message, brand color); AI assist; Developer Mode link. |
| **Billing** | `SimpleGenericPage` (title only) | Plan name, status, usage (messages/AI actions), limits reached, upgrade recommendations; Upgrade/Manage switch to Developer Mode. |
| **Conversations / Inbox** | `SimpleGenericPage` | List from `GET /api/inbox/conversations`, manual actions (open, mark reviewed, create lead, add note), AI assist, Developer Mode link. |
| **Analytics** | `SimpleGenericPage` | “How your assistant is helping”: leads captured, conversations, AI actions, bookings/voice if enabled; short explanation; Developer Mode link. |
| **Account** | `SimpleGenericPage` | Unchanged (still generic placeholder). |

---

## 4. Assumptions

- **APIs**: Existing session-based auth is used. New endpoints added: `GET /api/leads`, `GET /api/settings`, `GET /api/billing/status`. Inbox/conversations and analytics use existing `GET /api/inbox/conversations` and `GET /api/analytics/overview` (inbox may require entitlement).
- **Developer Mode**: Any “Edit”, “Open in Developer Mode”, or “Get install code” style action that needs the full UI calls `setMode('developer')` then `router.push(path)` so the correct developer page loads.
- **Billing**: Simple Billing does not render Stripe Checkout or Customer Portal directly; “Upgrade” and “Manage subscription” switch to Developer Mode and navigate to `/dashboard/billing` where the server-rendered billing page (with org context) is shown.
- **Settings form**: PUT `/api/settings` expects camelCase (e.g. `businessName`). The Simple Settings form maps from snake_case state to camelCase in the request body.
- **Knowledge ingest**: “Add website link” uses `POST /api/knowledge/ingest-url`; success adds the new source to local state; plan/entitlement errors surface from the API.
- **Copy**: Page-specific, business-friendly language is used; the phrase “Ask AI to do it for you” is avoided as the main CTA on every page.

---

## 5. Recommended next steps

- **Account (Simple Mode)**: Replace `SimpleGenericPage` for `/dashboard/account` with a dedicated Simple Account page (profile, security, preferences in plain language).
- **Lead detail in Simple Mode**: Optional lightweight lead detail view (e.g. modal or side panel) with “Summarize”, “Suggest next step”, “Write follow-up” without leaving Simple Mode.
- **Conversations**: Optional simple conversation detail (read-only or minimal reply) in Simple Mode before sending users to Developer Inbox.
- **Analytics**: Add a simple time range selector (e.g. “This week” / “This month”) and/or one or two charts (e.g. leads over time, conversations over time) using existing analytics APIs.
- **Onboarding**: Tie setup progress on the dashboard to real completion flags (e.g. “has widget”, “has knowledge”, “has automation”) from API or feature flags.
- **i18n**: Extract all new Simple Mode copy into translation keys so it can be localized consistently with the rest of the app.
