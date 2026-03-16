# AI Pages (Full-Page AI Experiences) – Implementation Summary

## Overview

Spaxio Assistant now supports **AI Pages**: dedicated full-page AI experiences (Quote Assistant, Support, Intake, etc.) that work alongside the widget. Businesses can publish hosted pages, share links, and optionally hand off from the widget to a full page.

---

## 1. Files Created

### Database
- **supabase/migrations/20260401000000_ai_pages.sql** – Tables: `ai_pages`, `ai_page_runs`, `ai_page_handoff_tokens`; extends `conversations` with nullable `widget_id` and `ai_page_id` plus source check constraint.

### Types & lib
- **src/lib/ai-pages/types.ts** – Page types, deployment modes, session state, intake schemas, handoff payload, default intake fields per page type.
- **src/lib/ai-pages/config-service.ts** – `getPublishedPageBySlug`, `getPageById`, `getPageBySlugForOrg`, `listAiPagesForOrg`, `getDefaultIntakeSchema`, `getPublishedPageSlugByType`.
- **src/lib/ai-pages/session-service.ts** – `createPageRun`, `getPageRun`, `getPageRunByConversation`, `updatePageRunState` (handoff conversation reuse supported).
- **src/lib/ai-pages/handoff-service.ts** – `createHandoffToken`, `resolveHandoffToken`, `buildPageHandoffPayload`, `resolveHandoffForPublicPage`.
- **src/lib/ai-pages/intake-service.ts** – `validateCollectedFields`, `completionPercent`, `mergeExtractedIntoState`, `sanitizeCollectedField`.
- **src/lib/ai-pages/outcome-service.ts** – `createQuoteRequestFromSession`, `createLeadFromSession`, `createSupportTicketFromSession`, `createOutcomesForRun`.

### API routes (public)
- **src/app/api/ai-page/config/route.ts** – `GET ?slug=&handoff=` – Public page config; optional handoff context.
- **src/app/api/ai-page/session/route.ts** – `POST { slug, handoff_token? }` – Create or resume session (with handoff).
- **src/app/api/ai-page/chat/route.ts** – `POST { run_id, conversation_id, message, language }` – Page chat; updates session state and optional intake extraction.
- **src/app/api/ai-page/complete/route.ts** – `POST { run_id }` – Finalize run and create outcomes (quote request, lead, ticket).

### API routes (dashboard, auth)
- **src/app/api/dashboard/ai-pages/route.ts** – `GET` list, `POST` create.
- **src/app/api/dashboard/ai-pages/[id]/route.ts** – `GET` / `PUT` / `DELETE` single page.
- **src/app/api/dashboard/ai-pages/[id]/publish/route.ts** – `POST { is_published }` – Publish/unpublish.

### Public page & UI
- **src/app/[locale]/a/[slug]/page.tsx** – Server component for public AI page.
- **src/components/ai-page/ai-page-client.tsx** – Client: load config, create session, chat, summary panel, submit/complete.
- **src/components/ai-page/ai-pages-list-client.tsx** – List actions: copy link, publish/unpublish.
- **src/components/ai-page/ai-page-form.tsx** – Create/edit form with templates (Quote, Support, Intake, General).

### Dashboard pages
- **src/app/[locale]/dashboard/ai-pages/page.tsx** – List AI pages with type, deployment mode, status, edit/open/copy.
- **src/app/[locale]/dashboard/ai-pages/new/page.tsx** – Create new AI page.
- **src/app/[locale]/dashboard/ai-pages/[id]/page.tsx** – Edit existing AI page.

### Docs
- **docs/AI_PAGES_IMPLEMENTATION.md** – This file.

---

## 2. Files Modified

- **src/app/api/widget/chat/route.ts** – System prompt extended with HANDOFF instruction; `parseActionFromReply` now returns `handoffType`; when `handoffType` is set, resolve published page by type and add `page_handoff` to response; `leadByConv` moved to outer scope for memory extraction.
- **src/lib/widget-actions/parse-action-from-reply.ts** – Parse `HANDOFF: quote|support|intake|booking`; strip line; return `handoffType`.
- **src/app/[locale]/widget/page.tsx** – Handle `data.page_handoff`; store in state; render “Continue in full assistant” link; postMessage `spaxio-page-handoff`.
- **src/app/widget.js/embed.in.js** – On `spaxio-page-handoff`, dispatch `CustomEvent('spaxio-page-handoff', { detail: { page_handoff, url } })`.
- **src/components/ui/sidebar-with-submenu.tsx** – Added “AI Pages” to developers nav (`/dashboard/ai-pages`, key `aiPages`).
- **messages/en.json**, **messages/fr.json**, **messages/fr-CA.json** – Added `dashboard.aiPages`: “AI Pages” / “Pages IA”.
- **next.config.js** – Rewrites: `/a` → `/en/a`, `/a/:path*` → `/en/a/:path*`.
- **src/components/dashboard/simple-dashboard-overview.tsx** – Type fix for `websiteSetupStatus.error_message`.
- **src/lib/automations/ai-workflow-generator.ts** – Typed map return as `GeneratedStep` to fix `step_type` inference.

---

## 3. Migrations

Run:

```bash
supabase db push
```

Or run **supabase/migrations/20260401000000_ai_pages.sql** in the Supabase SQL Editor.

Summary:
- **ai_pages** – org, agent_id, title, slug, page_type, deployment_mode, welcome_message, intro_copy, trust_copy, config, branding_config, intake_schema, outcome_config, handoff_config, is_published, is_enabled.
- **ai_page_runs** – org, ai_page_id, conversation_id, lead_id, contact_id, quote_request_id, support_ticket_id, status, session_state, completion_percent, summary, started_at, completed_at.
- **ai_page_handoff_tokens** – token, organization_id, ai_page_id, conversation_id, context_snippet, expires_at.
- **conversations** – `widget_id` nullable; `ai_page_id` added; constraint: exactly one of widget_id or ai_page_id set.

---

## 4. Environment Variables

No new env vars. Existing `NEXT_PUBLIC_APP_URL`, `OPENAI_API_KEY`, Supabase, and billing/entitlements are used as before.

---

## 5. How to Test AI Pages Manually

1. **Apply migration** (see above).

2. **Create an AI Page**
   - Log in → Dashboard → AI Pages (under Deployments in dev mode) → “Create AI Page”.
   - Pick template (e.g. Quote Assistant), set title/slug, optional agent, deployment mode “Widget can hand off to this page”.
   - Save, then “Publish”.

3. **Open the public page**
   - Visit `https://<your-app>/en/a/<slug>` (e.g. `/en/a/quote`).
   - You should see the full-page chat; send messages; check summary panel and “Submit and finish” when enough is collected.

4. **Widget handoff**
   - Ensure the widget is on a page and the same org has a published AI page (e.g. quote) with deployment mode “widget_handoff_to_page” or “widget_and_page”.
   - In the widget, say e.g. “I need a quote” so the model can reply with HANDOFF: quote.
   - You should see “Continue in full assistant” (or custom label) and a link opening the AI page; with handoff token the page can show context-aware intro.

5. **Outcomes**
   - On the AI page, complete a flow (e.g. quote) and click “Submit and finish”.
   - Check Dashboard → Quote requests (or Leads / Tickets) for the new record linked to the run/conversation.

---

## 6. Assumptions

- **Conversations** – Either `widget_id` or `ai_page_id` is set; handoff can reuse the same conversation by switching it from widget to page.
- **RLS** – Public config and session/chat/complete use service role (createAdminClient). Dashboard APIs use auth and org scope.
- **Entitlements** – No new plan gates (e.g. `max_ai_pages`) are enforced yet; can be added later in dashboard and APIs.
- **Templates** – Implemented in the form (Quote, Support, Intake, General) with default copy and intake behavior; no separate `ai_page_templates` table.
- **Localization** – Public page uses config copy and a single language from the request; dashboard uses existing i18n keys (`aiPages`).

---

## 7. Recommended Next Steps

- **Entitlements** – Add `max_ai_pages` (and optionally `widget_handoff_access`, `quote_page_access`) to plan_entitlements; enforce in dashboard create and in public session/create run.
- **Analytics** – Log events (e.g. `ai_page_created`, `ai_page_published`, `handoff_shown`, `handoff_accepted`, `page_session_started`, `page_completed`, `quote_request_created_from_page`) to `analytics_events` or existing pipeline.
- **Simple Mode** – Add an “AI Pages” or “Full-page assistants” card in the simple dashboard with guided create (e.g. “Create a Quote Assistant page”) and link to list.
- **Preview** – Add a “Preview” action that opens the public page in a new tab (or iframe) with a test handoff token.
- **Intake schema UI** – In the editor, allow editing `intake_schema` (add/remove/reorder fields) per page type.
- **Contact creation** – In outcome-service, optionally create/link `contacts` from session when creating leads (if your CRM expects it).
